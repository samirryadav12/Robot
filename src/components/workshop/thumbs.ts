import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { WorkshopKit } from "./kit";

type PartId = string;

/* Thumbnails are renders of each part's own 3D model (not product photos), made once offscreen and shared by
   every panel. They are labelled as 3D renders wherever they are shown. */

const cache = new Map<string, Promise<Partial<Record<PartId, string>>>>();

export function getPartThumbnails(kit: WorkshopKit) {
  let c = cache.get(kit.id);
  if (!c) { c = render(kit).catch(() => ({})); cache.set(kit.id, c); }
  return c;
}

async function render(kit: WorkshopKit): Promise<Partial<Record<PartId, string>>> {
  const W = 320, H = 240;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  // without WebGL there are no thumbnails; the panels show plain placeholders instead
  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2") || probe.getContext("webgl");
  if (!gl) return {};
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7f3ec);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6dccd, 0.8));
  const key = new THREE.DirectionalLight(0xfff4e8, 2);
  key.position.set(10, 20, 14);
  scene.add(key);
  const model = (await kit.loadModel())();
  if (model.track) model.track.visible = false;
  scene.add(model.root);
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 200);
  const dir = new THREE.Vector3(0.55, 0.55, 0.62).normalize();
  const out: Partial<Record<PartId, string>> = {};
  model.setExplode(0);
  for (const [id, n] of model.parts) {
    for (const m of model.parts.values()) m.group.visible = m === n;
    for (const w of model.wires.values()) { const show = id === kit.wiresPart ? w.conn.jumper : false; w.mesh.visible = show; w.plugs.forEach((p) => (p.visible = show)); }
    model.root.updateWorldMatrix(true, true);
    const box = new THREE.Box3();
    (id === kit.wiresPart ? [...model.wires.values()].filter((w) => w.conn.jumper).map((w) => w.mesh) : n.meshes).forEach((m) => box.expandByObject(m));
    if (box.isEmpty()) continue;
    const c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2;
    camera.position.copy(c).addScaledVector(dir, (r / Math.sin(THREE.MathUtils.degToRad(15))) * 0.95);
    camera.lookAt(c);
    renderer.render(scene, camera);
    out[id] = canvas.toDataURL("image/png");
    await new Promise((res) => setTimeout(res, 0)); // keep the page responsive between renders
  }
  model.dispose();
  env.dispose();
  pmrem.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
}
