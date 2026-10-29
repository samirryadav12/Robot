"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Crosshair, Tag, Focus, Layers, Box as BoxIcon } from "lucide-react";
import { useKit } from "./kit";

type PartId = string;

/* The workshop viewer: the kit's detailed 3D robot with labels, selection, isolate, assembled/exploded,
   and wiring / step highlights. One instance per section; it starts when scrolled into view, renders only while
   something changes, and cleans up on unmount. The page's journey (Nesto's stage) is not touched. */

export type ViewerMode = "parts" | "wiring" | "step";

interface Props {
  mode: ViewerMode;
  selectedPart?: PartId | null;
  onSelectPart?: (id: PartId | null) => void;
  selectedConn?: string | null;
  onSelectConn?: (id: string | null) => void;
  step?: number | null;
  height?: number;
  className?: string;
  ariaLabel: string;
  fill?: boolean;                                   // fill the parent's height (full-window intro)
  exploded?: boolean;                               // controlled assembled / exploded
  onExplodedChange?: (v: boolean) => void;
  variant?: "default" | "technical";
  showcase?: boolean;
  spread?: [number, number, number];
  zoom?: number;
  minimal?: boolean;                                // showcase: always assembled, no explode toggle or isolate
}

type Engine = {
  setState: (s: EngineState) => void;
  command: (c: "rotL" | "rotR" | "zoomIn" | "zoomOut" | "reset") => void;
  dispose: () => void;
};
type EngineState = { mode: ViewerMode; part: PartId | null; conn: string | null; step: number | null; exploded: boolean; labels: boolean; isolate: boolean };

export function WorkshopViewer({ mode, selectedPart = null, onSelectPart, selectedConn = null, onSelectConn, step = null, height = 520, className = "", ariaLabel, fill = false, exploded: explodedProp, onExplodedChange, variant = "default", showcase = false, spread, zoom, minimal = false }: Props) {
  const kit = useKit();
  // the step each wire is made in (so each step shows the build as it stands)
  const wiredAt = useMemo(() => Object.fromEntries(Object.entries(kit.stepVisuals).flatMap(([n, v]) => (v.connections ?? []).map((c) => [c, Number(n)]))) as Record<string, number>, [kit]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ownExploded, setOwnExploded] = useState(false);
  const exploded = explodedProp ?? ownExploded;
  const setExploded = (v: boolean) => { if (onExplodedChange) onExplodedChange(v); else setOwnExploded(v); };
  const [labels, setLabels] = useState(true);
  const [isolate, setIsolate] = useState(false);
  const cb = useRef({ onSelectPart, onSelectConn });
  cb.current = { onSelectPart, onSelectConn };

  // on narrow screens the numbered labels would cover the robot: start with them off (selection still shows its label)
  useEffect(() => { if (mode !== "step" && wrapRef.current && wrapRef.current.clientWidth < 560) setLabels(false); }, [mode]);

  // start only once the viewer is near the screen
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !canvasRef.current) return;
    // no WebGL: show the note (the part lists and diagrams around the viewer still work) without asking three.js
    try {
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2") || probe.getContext("webgl");
      if (!gl) { setFailed(true); return; }
      gl.getExtension("WEBGL_lose_context")?.loseContext(); // release the probe (browsers cap live contexts)
    } catch { setFailed(true); return; }
    let disposed = false;
    Promise.all([import("./engine"), kit.loadModel()])
      .then(([{ createEngine }, build]) => {
        if (disposed || !canvasRef.current || !wrapRef.current || !labelsRef.current || !svgRef.current || !tipRef.current) return;
        try {
          engineRef.current = createEngine({
            canvas: canvasRef.current, wrap: wrapRef.current, labels: labelsRef.current, svg: svgRef.current, tip: tipRef.current,
            kit, build, installedAt: kit.installedAt, wiredAt, variant, showcase, spread, zoom,
            onPick: (part, conn) => {
              if (conn && cb.current.onSelectConn) cb.current.onSelectConn(conn);
              else if (cb.current.onSelectPart) cb.current.onSelectPart(part);
            },
          });
          engineRef.current.setState({ mode, part: selectedPart, conn: selectedConn, step, exploded, labels, isolate });
        } catch {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
    return () => { disposed = true; engineRef.current?.dispose(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    engineRef.current?.setState({ mode, part: selectedPart, conn: selectedConn, step, exploded, labels, isolate });
  }, [mode, selectedPart, selectedConn, step, exploded, labels, isolate]);

  const btn = "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-bold text-slate-700 hover:bg-white hover:text-brand-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400";
  const cmd = (c: Parameters<Engine["command"]>[0]) => engineRef.current?.command(c);
  const showExplode = mode !== "step" || !kit.stepVisuals[step ?? 0]?.exploded;

  return (
    <div className={`relative bg-[#F7F3EC] overflow-hidden ${fill ? "h-full flex flex-col" : "rounded-[1.75rem] border border-[#E8E2D9]"} ${className}`}>
      <div ref={wrapRef} className={`relative w-full ${fill ? "flex-1 min-h-0 touch-none" : "touch-pan-y h-[360px] sm:h-[var(--viewer-h)]"}`} style={fill ? undefined : { ["--viewer-h" as string]: `${height}px` }} role="img" aria-label={ariaLabel}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
        <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden />
        <div ref={labelsRef} className="absolute inset-0 pointer-events-none" />
        <div ref={tipRef} className="absolute pointer-events-none px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold opacity-0 transition-opacity" />
        {!visible && <div className="absolute inset-0 grid place-items-center text-xs font-bold text-slate-400">Loading 3D workshop…</div>}
        {failed && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-slate-600 bg-[#F7F3EC]">
            The 3D view needs WebGL, which this browser has turned off. Everything below still works.
          </div>
        )}
        {/* assembled / exploded */}
        {showExplode && !fill && !minimal && (
          <div className="absolute top-3 right-3 flex p-1 rounded-full bg-white/90 border border-[#E8E2D9] shadow-subtle text-xs font-bold">
            {(["Assembled", "Exploded"] as const).map((v) => {
              const on = (v === "Exploded") === exploded;
              return (
                <button key={v} type="button" aria-pressed={on} onClick={() => setExploded(v === "Exploded")}
                  className={`px-3.5 h-8 rounded-full transition-colors ${on ? "bg-brand-500 text-white" : "text-slate-600 hover:text-brand-700"}`}>
                  {v === "Exploded" ? <span className="inline-flex items-center gap-1"><Layers className="w-3.5 h-3.5" />Exploded</span> : <span className="inline-flex items-center gap-1"><BoxIcon className="w-3.5 h-3.5" />Assembled</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {/* view controls */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-2 border-t border-[#E8E2D9] bg-[#FBF8F3]">
        <button type="button" className={btn} onClick={() => cmd("rotL")} aria-label="Rotate left"><RotateCcw className="w-4 h-4" /><span className="hidden sm:inline">Rotate</span></button>
        <button type="button" className={btn} onClick={() => cmd("rotR")} aria-label="Rotate right"><RotateCw className="w-4 h-4" /></button>
        <button type="button" className={btn} onClick={() => cmd("zoomIn")} aria-label="Zoom in"><ZoomIn className="w-4 h-4" /><span className="hidden sm:inline">Zoom</span></button>
        <button type="button" className={btn} onClick={() => cmd("zoomOut")} aria-label="Zoom out"><ZoomOut className="w-4 h-4" /></button>
        <button type="button" className={btn} onClick={() => { cmd("reset"); onSelectPart?.(null); }} aria-label="Reset view"><Crosshair className="w-4 h-4" /><span className="hidden sm:inline">Reset view</span></button>
        <button type="button" className={btn} onClick={() => setLabels((v) => !v)} aria-pressed={labels}><Tag className="w-4 h-4" /><span>{labels ? "Hide labels" : "Show labels"}</span></button>
        {mode !== "wiring" && !minimal && (
          <button type="button" className={`${btn} ${isolate ? "bg-white text-brand-700" : ""}`} onClick={() => setIsolate((v) => !v)} aria-pressed={isolate} disabled={!selectedPart && mode === "parts"} title={!selectedPart && mode === "parts" ? "Select a part first" : undefined}>
            <Focus className="w-4 h-4" /><span>{isolate ? "Show all" : "Isolate"}</span>
          </button>
        )}
        <span className="ml-auto pr-2 text-[11px] font-semibold text-slate-400 hidden md:inline">Drag to rotate · scroll or pinch to zoom · click a {mode === "wiring" ? "wire" : "part"}</span>
      </div>
    </div>
  );
}
