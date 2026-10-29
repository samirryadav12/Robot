"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { 
  getProject3DConfig, 
  resolveComponentInfo, 
  Component3DInfo, 
  Project3DConfig 
} from "@/data/projects3D";
import { 
  RotateCcw, 
  Maximize2, 
  Layers, 
  Info, 
  X, 
  Sparkles, 
  MousePointer, 
  Cpu, 
  CheckCircle2,
  Box
} from "lucide-react";

interface RobotViewer3DProps {
  slug: string;
}

export function RobotViewer3D({ slug }: RobotViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [config, setConfig] = useState<Project3DConfig>(() => getProject3DConfig(slug));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Hover & selection states
  const [hoveredComponent, setHoveredComponent] = useState<Component3DInfo | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<Component3DInfo | null>(null);

  // Reference hooks for 3D state
  const resetCameraRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const projectConfig = getProject3DConfig(slug);
    setConfig(projectConfig);

    if (!containerRef.current || !canvasRef.current) return;

    let isDisposed = false;
    let animationFrameId: number;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    // 1. Scene & Background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfaf7f2);

    // Subtle floor ground grid for spatial grounding
    const gridHelper = new THREE.GridHelper(8, 20, 0xdcd4c8, 0xe8e2d9);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // 2. Camera Setup
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    const [initX, initY, initZ] = projectConfig.cameraPosition;
    const [tgtX, tgtY, tgtZ] = projectConfig.cameraTarget;
    camera.position.set(initX, initY, initZ);

    // 3. Renderer Setup
    // without WebGL the viewer reports it instead of throwing, so the rest of the page still renders
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      setLoadError("The 3D view needs WebGL, which this browser has turned off.");
      setLoading(false);
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.0);
    fillLight.position.set(-5, 4, -4);
    scene.add(fillLight);

    const warmAccentLight = new THREE.PointLight(0xc85a32, 1.2, 10);
    warmAccentLight.position.set(0, 3, 2);
    scene.add(warmAccentLight);

    // 5. Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.2;
    controls.maxDistance = 8.0;
    controls.target.set(tgtX, tgtY, tgtZ);
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Prevent camera dipping below floor
    // the viewer sits inside a scroll-driven page: the wheel scrolls the page until the visitor clicks into
    // the viewer, then zooms until the pointer leaves it
    controls.enableZoom = false;

    resetCameraRef.current = () => {
      camera.position.set(initX, initY, initZ);
      controls.target.set(tgtX, tgtY, tgtZ);
      controls.update();
    };

    // 6. Raycasting Setup for Hover & Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let interactiveMeshes: THREE.Mesh[] = [];
    const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    let currentlyHighlightedMesh: THREE.Mesh | null = null;

    // Subtle highlight material
    const highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xc85a32,
      emissive: 0xc85a32,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.4,
    });

    const clearHighlight = () => {
      if (currentlyHighlightedMesh && originalMaterials.has(currentlyHighlightedMesh)) {
        currentlyHighlightedMesh.material = originalMaterials.get(currentlyHighlightedMesh)!;
        currentlyHighlightedMesh = null;
      }
    };

    // 7. Load GLB Model
    setLoading(true);
    setLoadError(null);

    const loader = new GLTFLoader();
    loader.load(
      projectConfig.modelUrl,
      (gltf) => {
        if (isDisposed) return;
        const model = gltf.scene;

        // Traverse and register interactive meshes
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            interactiveMeshes.push(mesh);
            originalMaterials.set(mesh, mesh.material);
          }
        });

        // Center model geometry
        const bbox = new THREE.Box3().setFromObject(model);
        const center = bbox.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y += (bbox.max.y - bbox.min.y) / 2; // Sit on ground plane

        scene.add(model);
        setLoading(false);
      },
      undefined,
      (error) => {
        if (isDisposed) return;
        console.warn(`Could not load model at ${projectConfig.modelUrl}:`, error);
        setLoadError(`3D model file not found at ${projectConfig.modelUrl}`);
        setLoading(false);
      }
    );

    // 8. Event Handlers (Pointer Move & Click)
    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshes, true);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        if (hit !== currentlyHighlightedMesh) {
          clearHighlight();
          currentlyHighlightedMesh = hit;
          hit.material = highlightMaterial;
        }

        canvas.style.cursor = "pointer";
        const nodeName = hit.name || hit.parent?.name || "Component";
        const resolved = resolveComponentInfo(projectConfig, nodeName);
        setHoveredComponent(resolved);
        setTooltipPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      } else {
        clearHighlight();
        canvas.style.cursor = "grab";
        setHoveredComponent(null);
        setTooltipPos(null);
      }
    };

    const handlePointerDown = () => {
      canvas.style.cursor = "grabbing";
      controls.enableZoom = true;
    };

    const handlePointerUp = (e: MouseEvent) => {
      canvas.style.cursor = "grab";
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshes, true);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const nodeName = hit.name || hit.parent?.name || "Component";
        const resolved = resolveComponentInfo(projectConfig, nodeName);
        setSelectedComponent(resolved);
      } else {
        // Clicked outside any component
        setSelectedComponent(null);
      }
    };

    const handleMouseLeave = () => {
      controls.enableZoom = false;
      clearHighlight();
      setHoveredComponent(null);
      setTooltipPos(null);
    };

    canvas.addEventListener("mousemove", handlePointerMove);
    canvas.addEventListener("mousedown", handlePointerDown);
    canvas.addEventListener("mouseup", handlePointerUp);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    // 9. Resize Handling
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 10. Animation Loop
    const animate = () => {
      if (isDisposed) return;
      controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // 11. Cleanup & Disposal
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      canvas.removeEventListener("mousemove", handlePointerMove);
      canvas.removeEventListener("mousedown", handlePointerDown);
      canvas.removeEventListener("mouseup", handlePointerUp);
      canvas.removeEventListener("mouseleave", handleMouseLeave);

      controls.dispose();
      highlightMaterial.dispose();

      // Dispose all scene meshes
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });

      renderer.dispose();
    };
  }, [slug]);

  return (
    <div className="relative w-full rounded-3xl bg-[#FAF7F2] border border-[#E8E2D9] overflow-hidden shadow-subtle flex flex-col">
      {/* Viewer Header Bar */}
      <div className="px-6 py-4 border-b border-[#E8E2D9] flex flex-wrap items-center justify-between gap-3 bg-white/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-brand-700">
              Interactive 3D Workbench
            </div>
            <div className="text-sm font-extrabold text-slate-900">
              {config.title} Assembled View
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => resetCameraRef.current?.()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-[#E8E2D9] hover:border-brand-300 text-xs font-bold transition-all shadow-sm active:scale-95"
            title="Reset to default angle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* 3D Canvas Area */}
      <div ref={containerRef} className="relative w-full h-[480px] sm:h-[560px] bg-[#FAF7F2] select-none">
        <canvas ref={canvasRef} className="w-full h-full block touch-none" />

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 bg-[#FAF7F2]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
            <div className="w-9 h-9 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-700">Loading 3D Digital Twin...</span>
          </div>
        )}

        {/* Error / Fallback State */}
        {loadError && !loading && (
          <div className="absolute inset-0 bg-[#FAF7F2] p-8 flex flex-col items-center justify-center text-center gap-4 z-20">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Box className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md">
              <h4 className="text-lg font-extrabold text-slate-900">3D Model Coming Soon</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                The 3D model for this project is being fabricated. Place any standard <strong>.glb</strong> file in:
              </p>
              <code className="inline-block text-[11px] font-mono font-bold px-3 py-1 rounded-lg bg-slate-100 text-brand-700 border border-[#E8E2D9]">
                {config.modelUrl}
              </code>
            </div>
          </div>
        )}

        {/* Controls Hint Badge */}
        {!loading && !loadError && (
          <div className="absolute bottom-4 left-4 z-10 pointer-events-none bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#E8E2D9] shadow-subtle flex items-center gap-2 text-xs font-semibold text-slate-600">
            <MousePointer className="w-3.5 h-3.5 text-brand-500" />
            <span>Drag to rotate • Click, then scroll to zoom • Click part to inspect</span>
          </div>
        )}

        {/* Floating Hover Tooltip */}
        {hoveredComponent && tooltipPos && !selectedComponent && (
          <div
            className="absolute z-30 pointer-events-none transition-all duration-75"
            style={{
              left: `${tooltipPos.x + 16}px`,
              top: `${tooltipPos.y - 12}px`,
            }}
          >
            <div className="bg-white/95 backdrop-blur-md border border-[#E8E2D9] rounded-xl px-3.5 py-2 shadow-lift min-w-[140px] max-w-[220px]">
              <div className="flex items-center gap-1.5 pb-0.5">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                <span className="text-[10px] font-extrabold text-brand-700 uppercase tracking-wider">
                  {hoveredComponent.category}
                </span>
              </div>
              <div className="text-xs font-extrabold text-slate-900 truncate">
                {hoveredComponent.displayName}
              </div>
              <div className="text-[11px] text-slate-500 line-clamp-1">
                {hoveredComponent.description}
              </div>
            </div>
          </div>
        )}

        {/* Click Selection Detail Drawer */}
        {selectedComponent && (
          <div className="absolute bottom-4 right-4 max-w-sm w-[calc(100%-2rem)] z-30 transition-all duration-200">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-brand-200 shadow-lift space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 uppercase tracking-wider">
                      {selectedComponent.category}
                    </span>
                    {selectedComponent.qty && (
                      <span className="text-[11px] font-bold text-slate-500">
                        Qty: {selectedComponent.qty}x in BOM
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                    {selectedComponent.displayName}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedComponent(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Close inspection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedComponent.description}
              </p>

              {selectedComponent.spec && (
                <div className="pt-2 border-t border-[#E8E2D9] text-[11px] text-slate-500 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                  <span><strong>Spec:</strong> {selectedComponent.spec}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
