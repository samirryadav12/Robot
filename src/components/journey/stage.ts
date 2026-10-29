import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { buildNesto, createNestoAnimator, haloTexture } from "./nesto";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { createPanelDom, PANEL_W, PANEL_H } from "./panelArt";
import { createCosmos } from "./cosmos";
import { wiringLayout, type WireSpec } from "./wiringLayout";

/* The project journey's 3D world: one continuous workshop with a station per chapter, laid out along a
   guided route. Nesto flies from station to station; scroll position (via JourneyState) drives where he
   is, where the camera looks and what each station shows. Everything a station shows comes from the
   project's own data (parts categories, wire colours, pin count, steps, code, store stock). */

export type StationKind = "intro" | "overview" | "bom" | "wiring" | "pinout" | "steps" | "view3d" | "code" | "stores" | "faq";

/* what a floating panel shows before it is opened (panel journey only) */
export interface PanelPreview {
  eyebrow: string;
  title: string;
  stats: string[];
  thumb?: string;      // image shown on the panel
  lines?: string[];    // text preview, used when there is no image (or it fails to load)
  code?: boolean;      // render the lines as source code
  kind?: StationKind;  // which chapter it previews: picks the panel's composition
  swatches?: string[]; // a colour per line (wire colours), shown as a dot beside it
  meters?: number[];   // a 0…1 share per line (stock found at a store), shown as a bar under it
  cards?: { label: string; value: string }[]; // small readouts under the title (e.g. parts per category)
}

export interface StageData {
  kinds: StationKind[];
  panels?: (PanelPreview | null)[]; // one per kind: present = panel journey, a floating panel at that station
  modelUrl?: string;
  localModel?: "line-follower" | "drone-explorer" | "robotic-arm" | "robosoccer" | "robomaze" | "smart-agro-rover" | "balancebot-pro" | "vision-sorter"; // a detailed model built in code (the workshop's), used instead of modelUrl
  bomCategories: string[];
  bomParts?: { name: string; category: string; qty: number }[]; // the parts list itself: the parts table models each line
  wireColors: string[];
  wiring?: WireSpec[];  // the pin table: which part each wire leaves and where it lands
  controller?: string;  // the project's microcontroller
  pinCount: number;
  stepCount: number;
  stepTitles?: string[]; // the build steps in order: the steps table models each one
  codeLines: string[];
  storeParts: number[];
  topStore: number;
  storeList?: { name: string; cost: string; available: number; total: number; missing?: string; top?: boolean }[]; // each store's offer for this kit
}

export interface JourneyState {
  f: number;            // continuous chapter position: 2.5 = halfway from chapter 2 to chapter 3
  local: number[];      // 0…1 reading progress through each chapter's content
  side: number[];       // where the scene sits beside each chapter's text: 1 right, -1 left, 0 centred
  hotPin: number;       // pin-table row under the pointer, -1 when none
  completed: boolean[]; // build steps the visitor has checked off
  viewerBusy: boolean;  // the interactive 3D viewer is on screen: keep the GPU free for it
  visible: boolean;     // the journey is on screen at all
  pointer: { x: number; y: number; at: number };
}

export interface StageOptions {
  reduced: boolean;
  onDark: (darkness: number) => void;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerpAngle = (a: number, b: number, k: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
};

/* how the camera frames each kind of station (azimuth, elevation, distance) and where Nesto waits
   (to the right of the prop as seen from the camera, so his pointing arm reaches it) */
const LF_TURN = -0.55; // the Line Follower model faces +z; turn it so the pedestal shows its front three-quarter
const SHOT: Record<StationKind, { az: number; el: number; dist: number; robot: [number, number, number]; up: number; dark: number }> = {
  // the panel journey's opening: a close-up of Nesto alone, introducing the project
  intro: { az: 0.22, el: 0.08, dist: 3.3, robot: [0, 1.0, 0], up: 1.05, dark: 0 },
  overview: { az: 0.38, el: 0.2, dist: 8.3, robot: [1.6, 0.95, 0.2], up: 0.6, dark: 0 },
  bom: { az: -0.42, el: 0.5, dist: 8.6, robot: [2.0, 1.15, 0.1], up: 0.45, dark: 0 },
  wiring: { az: 0.05, el: 0.12, dist: 9.0, robot: [2.25, 1.0, 0.7], up: 1.0, dark: 1 },
  pinout: { az: 0.3, el: 0.6, dist: 8.6, robot: [1.75, 1.05, 0.3], up: 0.5, dark: 1 },
  steps: { az: -0.5, el: 0.3, dist: 8.0, robot: [1.75, 1.1, 0.2], up: 0.75, dark: 0 },
  view3d: { az: 0.55, el: 0.14, dist: 9.0, robot: [2.15, 1.0, 0.3], up: 1.0, dark: 0 },
  code: { az: -0.05, el: 0.1, dist: 9.0, robot: [2.2, 1.0, 0.8], up: 1.0, dark: 1 },
  stores: { az: -0.6, el: 0.22, dist: 10.6, robot: [2.25, 1.0, 0.4], up: 0.95, dark: 0 },
  faq: { az: 0.42, el: 0.26, dist: 7.4, robot: [0.0, 0.73, 0.0], up: 0.75, dark: 0 },
};

const WIRE_HEX: Record<string, number> = {
  red: 0xd8432f, black: 0x1d1f22, white: 0xf2f0ea, yellow: 0xf2c230, green: 0x2f9e5b, blue: 0x2f6fd6,
  orange: 0xf0862e, purple: 0x8a55c9, brown: 0x7a4b2a, grey: 0x8b9096, gray: 0x8b9096, pink: 0xe8789c,
};
const wireHex = (name: string) => {
  const key = name.toLowerCase().match(/[a-z]+/g)?.find((w) => w in WIRE_HEX);
  return key ? WIRE_HEX[key] : 0xc8592e;
};

export function createStage(canvas: HTMLCanvasElement, data: StageData, state: JourneyState, opts: StageOptions) {
  // alpha: the panel journey's screens are HTML behind the canvas, seen through holes the panels cut in it
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  const mobile = Math.min(window.innerWidth, window.innerHeight) < 700;
  // sharpness follows the screen, including browser zoom (which changes devicePixelRatio): see resize()
  const pixelRatio = () => Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = roomEnv;
  const LIGHT_BG = new THREE.Color(0x05060a), DARK_BG = new THREE.Color(0x05060a); // deep space in every chapter
  // the sky is its own scene, drawn first: Milky Way, solar system and star dust (see cosmos.ts)
  const cosmos = createCosmos(renderer, { mobile, reduced: opts.reduced });
  renderer.autoClear = false;
  scene.fog = new THREE.Fog(LIGHT_BG.clone(), 16, 46);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd9cdbd, 1.1);
  const key = new THREE.DirectionalLight(0xfff2e6, 2.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 30 });
  key.shadow.bias = -0.0004;
  const rim = new THREE.PointLight(0x7fb2ff, 0, 18);
  scene.add(hemi, key, key.target, rim);

  const haloTex = haloTexture();
  const disposables: { dispose: () => void }[] = [roomEnv, pmrem, haloTex];
  const track = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

  const M = {
    floor: track(new THREE.MeshStandardMaterial({ color: 0xefe8dd, roughness: 0.95 })),
    plastic: track(new THREE.MeshStandardMaterial({ color: 0xf6f1ea, roughness: 0.45 })),
    wood: track(new THREE.MeshStandardMaterial({ color: 0xd9c3a5, roughness: 0.7 })),
    dark: track(new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.55, metalness: 0.2 })),
    accent: track(new THREE.MeshStandardMaterial({ color: 0xc8592e, roughness: 0.4 })),
    trim: track(new THREE.MeshStandardMaterial({ color: 0xdf9e7e, roughness: 0.5 })),
    pcb: track(new THREE.MeshStandardMaterial({ color: 0x1f5e46, roughness: 0.6 })),
    chip: track(new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.4 })),
    metal: track(new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.3, metalness: 0.8 })),
    gold: track(new THREE.MeshStandardMaterial({ color: 0xd9b25a, roughness: 0.3, metalness: 0.9 })),
    wheel: track(new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5 })),
    tire: track(new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.8 })),
    cell: track(new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.45 })),
    acrylic: track(new THREE.MeshPhysicalMaterial({ color: 0xe9f1f5, roughness: 0.1, transmission: 0, transparent: true, opacity: 0.55 })),
    driver: track(new THREE.MeshStandardMaterial({ color: 0xb23a2a, roughness: 0.55 })),
    screen: track(new THREE.MeshStandardMaterial({ color: 0x0f1318, roughness: 0.25, metalness: 0.3 })),
    box: track(new THREE.MeshStandardMaterial({ color: 0xc9a27a, roughness: 0.85 })),
    glow: track(new THREE.MeshStandardMaterial({ color: 0x331408, emissive: 0xff8a3d, emissiveIntensity: 1.6, roughness: 0.4 })),
    landing: track(new THREE.MeshStandardMaterial({ color: 0xe6d3c2, emissive: 0xff8a3d, emissiveIntensity: 0, roughness: 0.4 })),
    shadow: track(new THREE.MeshBasicMaterial({ map: haloTex, color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })),
    halo: track(new THREE.SpriteMaterial({ map: haloTex, color: 0xff8a3d, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })),
  };
  const geoCache = new Map<string, THREE.BufferGeometry>();
  const geo = (k: string, make: () => THREE.BufferGeometry) => {
    let g = geoCache.get(k);
    if (!g) { g = make(); geoCache.set(k, g); }
    return g;
  };
  const rbox = (w: number, h: number, d: number, r = 0.03) => geo(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r));
  const cyl = (rt: number, rb: number, h: number, s = 32) => geo(`cy${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    return o;
  };

  /* ---------- the ground and the guided route ---------- */
  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(400, 400)), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.renderOrder = -1;
  scene.add(floor);
  // the ground fades out with distance, so the space beyond the workshop shows right down to the horizon
  M.floor.transparent = true;
  M.floor.depthWrite = false;
  M.floor.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace("#include <fog_fragment>", `#include <fog_fragment>
  #ifdef USE_FOG
  gl_FragColor.a *= 0.92 * (1.0 - fogFactor);
  #endif`);
  };

  const N = data.kinds.length;
  const stationPos = data.kinds.map((_, k) => new THREE.Vector3(Math.sin(k * 1.15) * 7.5, 0, -k * 10));
  const route = new THREE.CatmullRomCurve3(stationPos.map((p) => p.clone().setY(0.012)), false, "centripetal");
  const dashGeo = track(new THREE.BoxGeometry(0.34, 0.01, 0.09));
  const dashCount = Math.max(1, Math.round(route.getLength() / 0.62));
  const dashes = new THREE.InstancedMesh(dashGeo, M.accent, dashCount);
  dashes.receiveShadow = true;
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < dashCount; i++) {
      const u = (i + 0.5) / dashCount;
      const p = route.getPointAt(u), tng = route.getTangentAt(u);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(tng.x, tng.z) + Math.PI / 2);
      dashes.setMatrixAt(i, m4.compose(p, q, s));
    }
  }
  scene.add(dashes);
  // arc-length share of the route up to a point, so the dashes draw up to wherever Nesto is
  const uToArc = (() => {
    const lens = route.getLengths(N * 40), total = lens[lens.length - 1];
    return (u: number) => lens[Math.round(u * (lens.length - 1))] / total;
  })();

  /* ---------- the stations ---------- */
  type Station = { kind: StationKind; group: THREE.Group; prop: THREE.Vector3; robot: THREE.Vector3; target: THREE.Vector3; az: number; update?: (t: number, dt: number, lp: number, here: number) => void; look?: () => THREE.Vector3 | null; panelTarget?: THREE.Vector3 };
  const stations: Station[] = [];
  const modelHolders: THREE.Group[] = [];

  const pad = (r: number) => {
    const g = new THREE.Group();
    g.add(mesh(cyl(r, r + 0.06, 0.1, 64), M.plastic, 0, 0.05, 0));
    const ring = new THREE.Mesh(geo(`ring${r}`, () => new THREE.TorusGeometry(r - 0.16, 0.014, 8, 96)), M.trim);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.105;
    g.add(ring);
    return g;
  };
  const table = (w: number, d: number, h: number) => {
    const g = new THREE.Group();
    g.add(mesh(rbox(w, 0.08, d, 0.03), M.wood, 0, h, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(cyl(0.04, 0.04, h, 12), M.dark, sx * (w / 2 - 0.15), h / 2, sz * (d / 2 - 0.15)));
    return g;
  };

  /* ---------- parts-table models: a small, recognisable model for each kind of part, chosen from its name ---------- */
  const PM = {
    uno: track(new THREE.MeshStandardMaterial({ color: 0x1b6aa8, roughness: 0.5 })),
    sonar: track(new THREE.MeshStandardMaterial({ color: 0x2a7fd0, roughness: 0.5 })),
    servo: track(new THREE.MeshStandardMaterial({ color: 0x2c5fc9, roughness: 0.45 })),
    carbon: track(new THREE.MeshStandardMaterial({ color: 0x24282e, roughness: 0.35, metalness: 0.3 })),
    lipo: track(new THREE.MeshStandardMaterial({ color: 0xc9ccd2, roughness: 0.3, metalness: 0.6 })),
    xt60: track(new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5 })),
    red: track(new THREE.MeshStandardMaterial({ color: 0xd8432f, roughness: 0.5 })),
    blue: track(new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.5 })),
    green: track(new THREE.MeshStandardMaterial({ color: 0x2f9e5b, roughness: 0.5 })),
    yellow: track(new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5 })),
    white: track(new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.5 })),
  };
  const pmBall = geo("pm-ball", () => new THREE.SphereGeometry(0.07, 20, 14));
  const pmTurn = (o: THREE.Object3D, rx = 0, ry = 0, rz = 0) => { o.rotation.set(rx, ry, rz); return o; };
  const pmBoard = (g: THREE.Group, w: number, d: number, m: THREE.Material) => g.add(mesh(rbox(w, 0.035, d, 0.012), m, 0, 0.018, 0));
  const pmPins = (g: THREE.Group, x: number, z: number, len: number, along: "x" | "z") =>
    g.add(mesh(along === "x" ? rbox(len, 0.05, 0.035, 0.01) : rbox(0.035, 0.05, len, 0.01), M.chip, x, 0.06, z));
  const pmWire = (g: THREE.Group, m: THREE.Material, x: number, z: number, len: number, ry = 0) =>
    g.add(pmTurn(mesh(cyl(0.012, 0.012, len, 8), m, x, 0.03, z), 0, ry, Math.PI / 2));
  const pmGearMotor = (g: THREE.Group) => {
    g.add(mesh(rbox(0.3, 0.13, 0.15, 0.02), M.wheel, 0, 0.075, 0));
    g.add(pmTurn(mesh(cyl(0.06, 0.06, 0.14, 20), M.metal, -0.2, 0.075, 0), 0, 0, Math.PI / 2));
    g.add(mesh(cyl(0.022, 0.022, 0.3, 12), M.plastic, 0.07, 0.075, 0).rotateX(Math.PI / 2));
  };
  const pmCell = (g: THREE.Group, x: number, z: number) => {
    g.add(pmTurn(mesh(cyl(0.065, 0.065, 0.36, 20), M.cell, x, 0.066, z), 0, 0, Math.PI / 2));
    g.add(pmTurn(mesh(cyl(0.035, 0.035, 0.02, 12), M.metal, x + 0.19, 0.066, z), 0, 0, Math.PI / 2));
  };

  function partModel(name: string, category: string) {
    const g = new THREE.Group(), n = name.toLowerCase();
    if (/bracket/.test(n)) {
      g.add(mesh(rbox(0.3, 0.025, 0.14, 0.01), M.acrylic, 0, 0.013, 0), mesh(rbox(0.3, 0.2, 0.025, 0.01), M.acrylic, 0, 0.1, -0.06));
    } else if (/flight controller/.test(n)) {
      pmBoard(g, 0.3, 0.3, M.chip);
      g.add(mesh(rbox(0.1, 0.03, 0.1, 0.01), M.screen, 0, 0.05, 0), pmTurn(mesh(rbox(0.08, 0.012, 0.025, 0.005), M.accent, 0, 0.07, -0.02), 0, Math.PI / 4, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(cyl(0.022, 0.022, 0.045, 10), M.gold, sx * 0.115, 0.03, sz * 0.115));
    } else if (/\besc\b/.test(n)) {
      pmBoard(g, 0.3, 0.3, M.chip);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(rbox(0.07, 0.03, 0.07, 0.01), M.screen, sx * 0.07, 0.05, sz * 0.07));
      pmWire(g, PM.red, 0.2, -0.03, 0.14); pmWire(g, M.tire, 0.2, 0.03, 0.14);
    } else if (/receiver/.test(n)) {
      pmBoard(g, 0.14, 0.1, M.chip);
      g.add(pmTurn(mesh(cyl(0.008, 0.008, 0.34, 6), M.tire, 0.2, 0.03, 0), 0, 0, Math.PI / 2), mesh(rbox(0.06, 0.02, 0.03, 0.008), M.accent, 0.38, 0.03, 0));
    } else if (/transmitter|radio/.test(n)) {
      g.add(mesh(rbox(0.42, 0.1, 0.24, 0.04), PM.carbon, 0, 0.05, 0));
      for (const sx of [-1, 1]) g.add(mesh(cyl(0.012, 0.02, 0.1, 10), M.metal, sx * 0.11, 0.15, 0.02), mesh(cyl(0.035, 0.035, 0.015, 16), M.chip, sx * 0.11, 0.205, 0.02));
      g.add(pmTurn(mesh(cyl(0.015, 0.015, 0.22, 8), M.chip, 0, 0.12, -0.14), -0.5, 0, 0));
    } else if (/hc-sr04|ultrasonic/.test(n)) {
      pmBoard(g, 0.4, 0.18, PM.sonar);
      for (const sx of [-1, 1]) {
        g.add(mesh(cyl(0.07, 0.07, 0.09, 24), M.metal, sx * 0.1, 0.08, 0));
        g.add(mesh(cyl(0.05, 0.05, 0.005, 20), M.screen, sx * 0.1, 0.127, 0));
      }
      g.add(mesh(rbox(0.05, 0.03, 0.04, 0.01), M.metal, 0, 0.05, 0.05));
    } else if (/bluetooth|hc-05/.test(n)) {
      pmBoard(g, 0.3, 0.12, PM.sonar);
      g.add(mesh(rbox(0.16, 0.025, 0.09, 0.01), PM.green, 0.03, 0.045, 0));
      pmPins(g, -0.13, 0, 0.1, "z");
      g.add(mesh(cyl(0.012, 0.012, 0.012, 8), M.glow, 0.11, 0.045, 0.03));
    } else if (/tcrt|line sensor|\bir\b/.test(n)) {
      pmBoard(g, 0.36, 0.12, M.pcb);
      for (const sx of [-1, 1]) {
        g.add(mesh(cyl(0.02, 0.02, 0.04, 12), PM.blue, sx * 0.1 - 0.025, 0.055, 0), mesh(cyl(0.02, 0.02, 0.04, 12), M.chip, sx * 0.1 + 0.025, 0.055, 0));
      }
      pmPins(g, 0, 0.045, 0.14, "x");
    } else if (/l298|motor driver|h-bridge/.test(n)) {
      pmBoard(g, 0.34, 0.34, M.driver);
      g.add(mesh(rbox(0.16, 0.02, 0.1, 0.008), M.chip, 0, 0.045, -0.04));
      for (let k = 0; k < 6; k++) g.add(mesh(rbox(0.018, 0.13, 0.12, 0.006), M.chip, -0.06 + k * 0.024, 0.11, -0.04));
      for (const sx of [-1, 1]) g.add(mesh(rbox(0.06, 0.06, 0.12, 0.01), PM.blue, sx * 0.13, 0.05, 0.08));
      g.add(mesh(rbox(0.12, 0.06, 0.06, 0.01), PM.blue, 0, 0.05, 0.13));
    } else if (/breadboard/.test(n)) {
      g.add(mesh(rbox(0.42, 0.06, 0.28, 0.015), M.plastic, 0, 0.03, 0));
      g.add(mesh(rbox(0.38, 0.012, 0.012, 0.004), PM.red, 0, 0.062, -0.115), mesh(rbox(0.38, 0.012, 0.012, 0.004), PM.blue, 0, 0.062, 0.115));
      g.add(mesh(rbox(0.38, 0.012, 0.02, 0.004), M.box, 0, 0.061, 0));
    } else if (/arduino|nano|microcontroller|\buno\b/.test(n)) {
      const nano = /nano/.test(n);
      const w = nano ? 0.36 : 0.44, d = nano ? 0.14 : 0.32;
      pmBoard(g, w, d, PM.uno);
      g.add(mesh(rbox(nano ? 0.12 : 0.22, 0.03, nano ? 0.07 : 0.07, 0.01), M.chip, 0.03, 0.05, nano ? 0 : 0.06));
      g.add(mesh(rbox(0.08, 0.07, nano ? 0.06 : 0.1, 0.01), M.metal, -w / 2 + 0.03, 0.06, nano ? 0 : -0.08));
      pmPins(g, 0.02, -d / 2 + 0.02, w * 0.75, "x"); pmPins(g, 0.02, d / 2 - 0.02, w * 0.75, "x");
    } else if (/brushless/.test(n)) {
      g.add(mesh(cyl(0.12, 0.12, 0.13, 28), PM.carbon, 0, 0.075, 0), mesh(cyl(0.1, 0.12, 0.03, 28), M.metal, 0, 0.155, 0), mesh(cyl(0.02, 0.02, 0.08, 10), M.metal, 0, 0.2, 0));
      g.add(mesh(cyl(0.13, 0.13, 0.02, 28), PM.red, 0, 0.01, 0));
    } else if (/servo horn|horn/.test(n)) {
      g.add(mesh(rbox(0.36, 0.025, 0.06, 0.012), M.plastic, 0, 0.013, 0), mesh(rbox(0.06, 0.025, 0.3, 0.012), M.plastic, 0, 0.013, 0), mesh(cyl(0.045, 0.045, 0.05, 18), M.plastic, 0, 0.03, 0));
    } else if (/servo/.test(n)) {
      g.add(mesh(rbox(0.3, 0.17, 0.15, 0.02), PM.servo, 0, 0.085, 0), mesh(rbox(0.42, 0.02, 0.15, 0.008), PM.servo, 0, 0.12, 0));
      g.add(mesh(cyl(0.05, 0.05, 0.04, 20), M.plastic, -0.07, 0.19, 0), mesh(rbox(0.22, 0.02, 0.04, 0.01), M.plastic, -0.07, 0.215, 0));
      pmWire(g, M.wheel, 0.2, -0.03, 0.12); pmWire(g, M.driver, 0.2, 0, 0.12); pmWire(g, M.tire, 0.2, 0.03, 0.12);
    } else if (/gripper|claw/.test(n)) {
      g.add(mesh(rbox(0.22, 0.05, 0.16, 0.02), M.plastic, 0, 0.025, 0));
      for (const sx of [-1, 1]) g.add(pmTurn(mesh(rbox(0.04, 0.03, 0.26, 0.012), M.metal, sx * 0.07, 0.04, -0.17), 0, sx * 0.18, 0));
      g.add(mesh(cyl(0.035, 0.035, 0.07, 16), PM.servo, 0, 0.08, 0.02));
    } else if (/arm/.test(n)) {
      g.add(mesh(cyl(0.13, 0.15, 0.06, 28), M.plastic, 0, 0.03, 0));
      g.add(mesh(rbox(0.06, 0.26, 0.08, 0.02), M.accent, 0, 0.19, 0), mesh(cyl(0.04, 0.04, 0.1, 16), M.chip, 0, 0.32, 0).rotateX(Math.PI / 2));
      g.add(pmTurn(mesh(rbox(0.05, 0.24, 0.07, 0.02), M.plastic, 0.09, 0.4, 0), 0, 0, -0.9));
    } else if (/propeller|prop\b/.test(n)) {
      for (const ry of [0, Math.PI]) g.add(pmTurn(mesh(rbox(0.22, 0.012, 0.055, 0.006), M.accent, Math.cos(ry) * 0.11, 0.03, -Math.sin(ry) * 0.11), 0.18, ry, 0));
      g.add(mesh(cyl(0.03, 0.03, 0.05, 16), M.chip, 0, 0.03, 0));
    } else if (/frame/.test(n)) {
      for (const ry of [Math.PI / 4, -Math.PI / 4]) g.add(pmTurn(mesh(rbox(0.5, 0.025, 0.05, 0.01), PM.carbon, 0, 0.02, 0), 0, ry, 0));
      g.add(mesh(rbox(0.16, 0.03, 0.16, 0.012), PM.carbon, 0, 0.035, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(cyl(0.035, 0.035, 0.02, 14), M.metal, sx * 0.17, 0.04, sz * 0.17));
    } else if (/gear motor|geared|dc motor|\btt\b|\bmotor\b/.test(n)) {
      pmGearMotor(g);
    } else if (/caster/.test(n)) {
      g.add(mesh(rbox(0.2, 0.025, 0.12, 0.01), M.metal, 0, 0.15, 0), mesh(cyl(0.06, 0.07, 0.07, 18), M.metal, 0, 0.1, 0));
      g.add(mesh(pmBall, M.metal, 0, 0.065, 0));
    } else if (/wheel/.test(n) || (category === "Movement" && !n)) {
      const w = mesh(cyl(0.17, 0.17, 0.08, 24), M.wheel, 0, 0.18, 0);
      w.rotation.z = Math.PI / 2;
      const tire = mesh(geo("tire", () => new THREE.TorusGeometry(0.17, 0.045, 10, 28)), M.tire, 0, 0.18, 0);
      tire.rotation.y = Math.PI / 2;
      g.add(w, tire);
    } else if (/holder/.test(n)) {
      g.add(mesh(rbox(0.42, 0.06, 0.24, 0.015), M.chip, 0, 0.03, 0));
      pmCell(g, -0.01, -0.055); pmCell(g, -0.01, 0.055);
      g.add(mesh(rbox(0.05, 0.04, 0.03, 0.008), PM.red, 0.17, 0.08, 0.1));
      pmWire(g, PM.red, 0.27, -0.03, 0.12); pmWire(g, M.tire, 0.27, 0.03, 0.12);
    } else if (/18650|li-ion|\bcell/.test(n)) {
      pmCell(g, 0, 0);
    } else if (/lipo/.test(n)) {
      g.add(mesh(rbox(0.36, 0.11, 0.17, 0.02), PM.lipo, 0, 0.055, 0), mesh(rbox(0.3, 0.005, 0.14, 0.002), M.accent, 0, 0.112, 0));
      pmWire(g, PM.red, 0.24, -0.025, 0.14); pmWire(g, M.tire, 0.24, 0.025, 0.14);
      g.add(mesh(rbox(0.06, 0.04, 0.08, 0.01), PM.xt60, 0.33, 0.03, 0));
    } else if (/connector|lead/.test(n)) {
      pmWire(g, PM.red, -0.05, -0.03, 0.3); pmWire(g, M.tire, -0.05, 0.03, 0.3);
      g.add(mesh(rbox(0.07, 0.045, 0.1, 0.012), PM.xt60, 0.13, 0.03, 0), mesh(rbox(0.07, 0.045, 0.1, 0.012), PM.xt60, -0.22, 0.03, 0));
    } else if (/switch/.test(n)) {
      g.add(mesh(rbox(0.18, 0.08, 0.12, 0.02), M.chip, 0, 0.04, 0), pmTurn(mesh(rbox(0.12, 0.03, 0.08, 0.01), PM.red, 0, 0.09, 0), 0, 0, 0.18));
    } else if (/power supply|adapter/.test(n)) {
      g.add(mesh(rbox(0.26, 0.11, 0.16, 0.025), M.chip, -0.06, 0.055, 0));
      pmWire(g, M.tire, 0.16, 0, 0.2);
      g.add(pmTurn(mesh(cyl(0.02, 0.02, 0.06, 12), M.metal, 0.28, 0.03, 0), 0, 0, Math.PI / 2));
    } else if (/battery/.test(n) || (category === "Power" && !n)) {
      g.add(mesh(rbox(0.3, 0.1, 0.16, 0.02), M.chip, 0, 0.05, 0), mesh(rbox(0.12, 0.004, 0.16, 0.002), M.accent, 0.03, 0.1, 0));
      g.add(mesh(cyl(0.025, 0.025, 0.03, 12), M.metal, -0.1, 0.11, -0.04), mesh(rbox(0.045, 0.03, 0.045, 0.01), M.metal, -0.1, 0.11, 0.04));
    } else if (/jumper|wire|ribbon|dupont/.test(n)) {
      [PM.red, PM.blue, PM.yellow, PM.green, PM.white, M.tire].forEach((m, k) => {
        const z = (k - 2.5) * 0.04;
        pmWire(g, m, 0, z, 0.34);
        for (const sx of [-1, 1]) g.add(mesh(rbox(0.04, 0.025, 0.025, 0.008), M.chip, sx * 0.19, 0.03, z));
      });
    } else if (/usb|cable/.test(n)) {
      g.add(pmTurn(mesh(geo("pm-coil", () => new THREE.TorusGeometry(0.11, 0.016, 8, 40)), M.tire, 0, 0.02, 0), Math.PI / 2, 0, 0));
      g.add(mesh(rbox(0.08, 0.04, 0.06, 0.01), M.metal, 0.17, 0.02, 0.04), mesh(rbox(0.06, 0.05, 0.06, 0.01), M.metal, 0.15, 0.025, -0.08));
    } else if (/standoff|screw|hardware|mount|nut|bolt/.test(n)) {
      for (let k = 0; k < 4; k++) g.add(mesh(cyl(0.025, 0.025, 0.12, 6), M.gold, -0.12 + k * 0.08, 0.06, -0.04));
      for (let k = 0; k < 3; k++) g.add(pmTurn(mesh(cyl(0.012, 0.012, 0.12, 8), M.metal, -0.08 + k * 0.08, 0.02, 0.08), 0, 0, Math.PI / 2));
      g.add(mesh(cyl(0.03, 0.03, 0.015, 6), M.metal, 0.17, 0.008, 0.08));
    } else if (/chassis|plate|body|base/.test(n) || category === "Structure") {
      const narrow = /narrow|maze/.test(n);
      g.add(mesh(rbox(narrow ? 0.3 : 0.44, 0.03, narrow ? 0.4 : 0.32, 0.012), M.acrylic, 0, 0.015, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(cyl(0.015, 0.015, 0.05, 8), M.metal, sx * (narrow ? 0.11 : 0.17), 0.03, sz * (narrow ? 0.15 : 0.12)));
    } else if (category === "Electronics") {
      g.add(mesh(rbox(0.42, 0.04, 0.3, 0.01), M.pcb, 0, 0.02, 0), mesh(rbox(0.14, 0.05, 0.14, 0.01), M.chip, 0.05, 0.065, 0));
    } else {
      pmGearMotor(g);
    }
    return g;
  }

  const builders: Record<StationKind, (g: THREE.Group, st: Station) => void> = {
    intro() { /* Nesto alone */ },
    overview(g) {
      g.add(mesh(cyl(0.95, 1.0, 0.5, 64), M.plastic, 0, 0.35, 0));
      g.add(mesh(cyl(0.97, 0.97, 0.04, 64), M.accent, 0, 0.62, 0));
      const holder = new THREE.Group();
      holder.position.y = 0.64;
      g.add(holder);
      modelHolders.push(holder);
      stUpdate(g, (t, dt) => { holder.rotation.y += dt * (opts.reduced ? 0 : 0.25); });
    },
    bom(g) {
      g.add(table(3.0, 1.9, 0.78));
      // each line of the project's own parts list, as a small model of that part (up to four copies for its quantity)
      const parts = (data.bomParts?.length ? data.bomParts : data.bomCategories.map((category) => ({ name: "", category, qty: 1 }))).slice(0, 15);
      const cols = Math.max(1, Math.ceil(Math.sqrt(parts.length * 1.6)));
      const rows = Math.ceil(parts.length / cols);
      const cellW = 2.6 / cols, cellD = 1.55 / Math.max(rows, 1);
      const tokens = parts.map((p, i) => {
        const tk = new THREE.Group();
        const col = i % cols, row = Math.floor(i / cols);
        tk.position.set((col - (cols - 1) / 2) * cellW, 0.84, (row - (rows - 1) / 2) * cellD);
        const n = Math.max(1, Math.min(4, Math.round(p.qty) || 1));
        const fit = Math.min(1, cellW / 0.5, cellD / 0.4) * (n === 1 ? 1 : n === 2 ? 0.68 : 0.56);
        for (let c = 0; c < n; c++) {
          const one = partModel(p.name, p.category);
          one.scale.setScalar(fit);
          if (n === 2) one.position.x = (c - 0.5) * cellW * 0.46;
          else if (n > 2) one.position.set(((c % 2) - 0.5) * cellW * 0.46, 0, (Math.floor(c / 2) - 0.5) * cellD * 0.46);
          tk.add(one);
        }
        tk.rotation.y = ((i * 37) % 11) / 11 * 0.6 - 0.3;
        tk.scale.setScalar(0.001);
        g.add(tk);
        return tk;
      });
      stUpdate(g, (t, dt, lp, here) => {
        const shown = tokens.length * clamp(0.2 + lp * 1.35) * smooth(0.2, 0.9, here);
        tokens.forEach((tk, i) => {
          const k = clamp(shown - i);
          const s = k <= 0 ? 0.001 : k * (1 + Math.sin(k * Math.PI) * 0.18);
          tk.scale.setScalar(lerp(tk.scale.x, Math.max(s, 0.001), 1 - Math.exp(-dt * 10)));
        });
      });
    },
    wiring(g) {
      // a wiring board built from the project's own pin table: its controller, a labelled block for each part that is
      // wired up, its power source, and every wire in its real colour from the part to the exact pin it lands on
      g.add(mesh(rbox(3.2, 2.1, 0.1, 0.05), M.dark, 0, 1.5, -0.2));
      for (const sx of [-1, 1]) g.add(mesh(cyl(0.05, 0.05, 1.5, 12), M.dark, sx * 1.35, 0.75, -0.25));
      const L = wiringLayout(data.controller ?? "Controller", data.wiring?.length ? data.wiring : (data.wireColors.length ? data.wireColors : ["Red", "Black", "Yellow", "Green"]).map((c, i) => ({ from: `Part ${i % 2 ? "B" : "A"}`, to: `D${i + 2}`, color: c })));
      const FACE = -0.12;
      const label = (text: string, w: number, h: number, x: number, y: number, dark = false) => {
        const c = document.createElement("canvas");
        c.width = 512; c.height = Math.round(512 * (h / w));
        const x2 = c.getContext("2d")!;
        let size = c.height * 0.62;
        x2.font = `700 ${size}px ui-sans-serif, system-ui, sans-serif`;
        while (size > 10 && x2.measureText(text).width > c.width * 0.92) { size -= 2; x2.font = `700 ${size}px ui-sans-serif, system-ui, sans-serif`; }
        x2.fillStyle = dark ? "#1b2027" : "#ffffff";
        x2.textAlign = "center"; x2.textBaseline = "middle";
        x2.fillText(text, c.width / 2, c.height / 2 + size * 0.04);
        const tex = track(new THREE.CanvasTexture(c));
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        const p = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })));
        p.position.set(x, y, FACE + 0.045);
        g.add(p);
      };
      // the controller, on the left, with a header of the pins this project uses down its right edge
      const isFc = /flight|speedybee|\bfc\b/i.test(L.controller);
      const nP = Math.max(L.pins.length, 1);
      const ch = Math.min(1.5, Math.max(0.8, 0.22 + nP * 0.1)), cx = -0.82, cy = L.power ? 1.72 : 1.5;
      g.add(mesh(rbox(1.0, ch, 0.06, 0.02), isFc ? PM.carbon : PM.uno, cx, cy, FACE));
      g.add(mesh(rbox(0.32, 0.24, 0.05, 0.01), M.chip, cx - 0.12, cy - 0.05, FACE + 0.03));
      label(L.controller, 0.9, 0.13, cx, cy + ch / 2 - 0.1);
      const pinPos = L.pins.map((_, i) => new THREE.Vector3(cx + 0.42, cy + ch / 2 - 0.24 - (i + 0.5) * ((ch - 0.32) / nP), FACE + 0.04));
      g.add(mesh(rbox(0.07, ch - 0.26, 0.05, 0.01), M.chip, cx + 0.42, cy - 0.11, FACE + 0.02));
      pinPos.forEach((p) => g.add(mesh(rbox(0.045, 0.045, 0.05, 0.008), M.gold, p.x, p.y, p.z)));
      // the power source, under the controller
      const powerAt = L.power ? new THREE.Vector3(-0.82 + 0.4, 0.78, FACE + 0.04) : null;
      if (L.power) {
        g.add(mesh(rbox(0.86, 0.3, 0.08, 0.03), /battery/i.test(L.power) ? M.cell : M.chip, -0.82, 0.78, FACE));
        label(L.power, 0.7, 0.13, -0.86, 0.78);
      }
      // the parts, stacked on the right
      const nParts = Math.max(L.parts.length, 1), avail = 1.86;
      const bh = Math.min(0.46, avail / nParts - 0.06);
      const partY = L.parts.map((_, i) => 2.43 - (avail / nParts) * (i + 0.5));
      const partMat = (name: string) => /driver|l298/i.test(name) ? M.driver : /servo/i.test(name) ? PM.servo : /sensor|hc-05|bluetooth|sonar/i.test(name) ? PM.sonar : /esc|receiver/i.test(name) ? PM.carbon : /ground|power/i.test(name) ? M.dark : M.pcb;
      L.parts.forEach((name, i) => {
        g.add(mesh(rbox(0.86, bh, 0.06, 0.02), partMat(name), 0.9, partY[i], FACE));
        label(name, 0.74, Math.min(0.13, bh * 0.5), 0.94, partY[i]);
      });
      // each part's wires leave from its left edge, spread over its height
      const perPart = L.parts.map((_, i) => L.wires.filter((w) => w.part === i).length);
      const seen = L.parts.map(() => 0);
      const wires = L.wires.slice(0, 16).map((w, i) => {
        const hex = wireHex(w.color);
        const mat = track(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45, emissive: hex, emissiveIntensity: 0.12 }));
        const k = seen[w.part]++, n = perPart[w.part];
        const from = new THREE.Vector3(0.47, partY[w.part] + bh / 2 - (k + 0.5) * (bh / n), FACE + 0.04);
        const to = w.power && powerAt ? powerAt.clone() : (pinPos[w.pin] ?? pinPos[0] ?? new THREE.Vector3(cx + 0.42, cy, FACE + 0.04)).clone();
        const bulge = 0.16 + (i % 4) * 0.07;
        const curve = new THREE.CubicBezierCurve3(from, new THREE.Vector3(from.x - 0.35, from.y, from.z + bulge), new THREE.Vector3(to.x + 0.35, to.y, to.z + bulge), to);
        const tg = track(new THREE.TubeGeometry(curve, 48, 0.02, 8, false));
        const wm = new THREE.Mesh(tg, mat);
        wm.castShadow = true;
        g.add(wm);
        return { w: wm, total: tg.index ? tg.index.count : 0 };
      });
      stUpdate(g, (t, dt, lp, here) => {
        const r = clamp(0.15 + lp * 1.6) * smooth(0.15, 0.85, here) * wires.length;
        wires.forEach((x, i) => {
          const k = clamp(r - i);
          x.w.visible = k > 0.001;
          x.w.geometry.setDrawRange(0, Math.floor((x.total * k) / 6) * 6);
        });
      });
    },
    pinout(g, st) {
      // the project's own controller, with just the pins it uses: each labelled, each carrying a lead in its wire colour
      g.add(mesh(cyl(1.7, 1.8, 0.36, 64), M.dark, 0, 0.18, 0));
      const L = wiringLayout(data.controller ?? "Controller", data.wiring ?? []);
      const kind = /flight|speedybee|\bfc\b/i.test(L.controller) ? "fc" : /nano/i.test(L.controller) ? "nano" : /raspberry/i.test(L.controller) ? "pi" : "uno";
      const TOP = 0.46;
      const flat = (text: string, w: number, h: number, x: number, z: number, color = "#ffffff") => {
        const c = document.createElement("canvas");
        c.width = 256; c.height = Math.round(256 * (h / w));
        const x2 = c.getContext("2d")!;
        let size = c.height * 0.72;
        const font = () => `700 ${size}px ui-monospace, Menlo, Consolas, monospace`;
        x2.font = font();
        while (size > 8 && x2.measureText(text).width > c.width * 0.94) { size -= 2; x2.font = font(); }
        x2.fillStyle = color;
        x2.textAlign = "center"; x2.textBaseline = "middle";
        x2.fillText(text, c.width / 2, c.height / 2);
        const tex = track(new THREE.CanvasTexture(c));
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        const p = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })));
        p.rotation.x = -Math.PI / 2;
        p.position.set(x, TOP + 0.012, z);
        g.add(p);
      };
      // the board itself
      let rowZ: [number, number];
      if (kind === "fc") {
        g.add(mesh(rbox(1.8, 0.06, 1.8, 0.03), PM.carbon, 0, 0.43, 0));
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(cyl(0.08, 0.08, 0.07, 20), M.gold, sx * 0.72, 0.44, sz * 0.72), mesh(cyl(0.045, 0.045, 0.08, 16), M.chip, sx * 0.72, 0.445, sz * 0.72));
        g.add(mesh(rbox(0.42, 0.06, 0.42, 0.02), M.chip, 0, 0.48, 0));
        g.add(pmTurn(mesh(rbox(0.22, 0.012, 0.06, 0.006), M.accent, 0.38, 0.47, 0.2), 0, Math.PI / 4, 0));
        flat(L.controller.replace(/flight controller/i, "FC"), 1.2, 0.13, 0, 0.32);
        rowZ = [-0.76, 0.76];
      } else if (kind === "nano") {
        g.add(mesh(rbox(2.5, 0.08, 0.9, 0.03), PM.uno, 0, 0.42, 0));
        g.add(mesh(rbox(0.26, 0.14, 0.3, 0.02), M.metal, -1.2, 0.52, 0), mesh(rbox(0.36, 0.06, 0.36, 0.02), M.chip, 0.15, 0.49, 0));
        flat("ARDUINO NANO", 0.9, 0.12, 0.15, 0.27, "#dfe9f5");
        rowZ = [-0.36, 0.36];
      } else if (kind === "pi") {
        // a green Raspberry Pi: USB and Ethernet at one end, the 40-pin header along the back edge
        g.add(mesh(rbox(2.5, 0.08, 1.64, 0.06), PM.green, 0, 0.42, 0));
        g.add(mesh(rbox(0.5, 0.3, 0.42, 0.02), M.metal, 1.05, 0.6, -0.42), mesh(rbox(0.5, 0.3, 0.42, 0.02), M.metal, 1.05, 0.6, 0.05), mesh(rbox(0.5, 0.32, 0.46, 0.02), M.metal, 1.05, 0.61, 0.5));
        g.add(mesh(rbox(0.42, 0.06, 0.42, 0.02), M.metal, -0.2, 0.49, 0.1));
        flat(L.controller.replace(/\s*\(.*\)$/, "").toUpperCase(), 1.2, 0.12, -0.3, 0.3, "#e8f6ec");
        rowZ = [-0.66, 0.66];
      } else {
        g.add(mesh(rbox(2.5, 0.08, 1.64, 0.04), PM.uno, 0, 0.42, 0));
        g.add(mesh(rbox(0.44, 0.26, 0.36, 0.02), M.metal, -1.12, 0.57, -0.38), mesh(rbox(0.38, 0.26, 0.3, 0.03), M.chip, -1.12, 0.57, 0.38));
        g.add(mesh(rbox(1.0, 0.07, 0.24, 0.02), M.chip, 0.3, 0.5, 0.2));
        flat(L.controller.toUpperCase().replace(/\s+R3$/, ""), 0.9, 0.13, 0.3, -0.12, "#dfe9f5");
        rowZ = [-0.66, 0.66];
      }
      // which row each pin sits on: signal pins at the back, power pins at the front, in their real order
      const pinList = L.pins.length ? L.pins : Array.from({ length: clamp(data.pinCount || 8, 4, 16) }, (_, i) => `D${i + 2}`);
      const isPower = (p: string) => /(5v|3\.3v|vin|gnd|vbat|regulated)/i.test(p);
      const num = (p: string) => Number(p.match(/\d+/)?.[0] ?? 99);
      const short = (p: string) => p.replace(/\(PWM\)/i, "~").replace(/\s*\+.*$/, "").replace(/^Motor Pad\s*/i, "").replace(/^UART (RX|TX) \((\w+)\)/i, "$2")
        .replace(/\s*(Regulated|Pad)$/i, "").replace(/^Common\s+/i, "").replace(/\s*\/\s*/g, "/").replace(/\s+~/, "~").replace(/^((RX|TX)\d)\s*\(D\d+\)$/i, "$1").replace(/\s*\(INT\d\)$/i, "").replace(/^(GPIO\d+)\s*\(.*\)$/i, "$1").replace(/\s+(camera|display) port$/i, "").trim();
      // grouped by kind in the order they first appear (motor pads, then UART…), numbered within each kind
      const kindOf = (p: string) => (p.match(/^[a-z]+/i)?.[0] ?? p).toLowerCase();
      const kindAt = (p: string) => pinList.findIndex((q) => kindOf(q) === kindOf(p));
      const rows = [pinList.filter((p) => !isPower(p)).sort((a, b) => kindAt(a) - kindAt(b) || num(a) - num(b)), pinList.filter(isPower)];
      const pos = new Map<string, THREE.Vector3>();
      rows.forEach((row, r) => {
        if (!row.length) return;
        const span = Math.min(kind === "fc" ? 1.4 : 2.1, row.length * 0.2), x0 = (kind === "uno" && r === 0 ? 0.15 : 0) - span / 2;
        const z = rowZ[r];
        if (kind !== "fc") g.add(mesh(rbox(span + 0.1, 0.12, 0.12, 0.02), M.chip, x0 + span / 2, TOP + 0.06, z));
        row.forEach((p, i) => {
          const x = x0 + (i + 0.5) * (span / row.length);
          pos.set(p, new THREE.Vector3(x, kind === "fc" ? TOP + 0.02 : TOP + 0.24, z));
          g.add(kind === "fc" ? mesh(rbox(0.12, 0.02, 0.12, 0.006), M.gold, x, TOP + 0.01, z) : mesh(rbox(0.045, 0.24, 0.045, 0.008), M.gold, x, TOP + 0.14, z));
          // a crowded row staggers its labels in two lines so neighbours don't overlap
          const lane = row.length > 10 && i % 2 ? 0.12 : 0;
          flat(short(p), 0.22, 0.09, x, z + (r === 0 ? 0.17 + lane : -0.17 - lane));
        });
      });
      // a lead in its real colour rises from every used pin and bends away from the board
      const leadMats: THREE.MeshStandardMaterial[] = [];
      const pinMeshes = pinList.map((p, i) => {
        const at = pos.get(p)!;
        const dir = at.z < 0 ? -1 : 1;
        const colour = L.wires.find((w) => w.pin === i)?.color ?? "Orange";
        const hex = wireHex(colour);
        const mat = track(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45, emissive: hex, emissiveIntensity: 0.12 }));
        leadMats.push(mat);
        const curve = new THREE.CubicBezierCurve3(at.clone(), at.clone().setY(at.y + 0.35), new THREE.Vector3(at.x, at.y + 0.5, at.z + dir * 0.25), new THREE.Vector3(at.x, at.y + 0.42, at.z + dir * 0.55));
        const wireMesh = new THREE.Mesh(track(new THREE.TubeGeometry(curve, 24, 0.018, 8, false)), mat);
        wireMesh.castShadow = true;
        g.add(wireMesh);
        return at;
      });
      const spark = new THREE.Sprite(M.halo);
      spark.scale.setScalar(0.5);
      const lead = mesh(cyl(0.02, 0.02, 0.9, 8), M.glow, 0, 0, 0);
      g.add(spark, lead);
      const look = new THREE.Vector3();
      st.look = () => look;
      // the highlight follows the pin-table row under the pointer, otherwise steps through the project's connections
      const rowPin = L.wires.map((w) => w.pin).filter((p) => p >= 0);
      stUpdate(g, (t, dt) => {
        const fromRow = state.hotPin >= 0 ? L.wires[state.hotPin]?.pin ?? -1 : -1;
        const hot = fromRow >= 0 ? fromRow : rowPin.length ? rowPin[Math.floor(t * 0.9) % rowPin.length] : -1;
        const visible = hot >= 0 && hot < pinMeshes.length;
        spark.visible = lead.visible = visible;
        leadMats.forEach((m, i) => { m.emissiveIntensity = lerp(m.emissiveIntensity, i === hot ? 0.9 : 0.12, 1 - Math.exp(-dt * 8)); });
        if (!visible) return;
        const p = pinMeshes[hot];
        spark.position.lerp(look.set(p.x, p.y + 0.12, p.z), 1 - Math.exp(-dt * 12));
        lead.position.set(spark.position.x, 1.25, spark.position.z);
        M.glow.emissiveIntensity = 1.6 + Math.sin(t * 6) * 0.4;
        look.copy(spark.position).applyMatrix4(g.matrixWorld);
      });
    },
    steps(g) {
      // the build, step by step: a numbered tile per step of this project, each carrying a small model of what that
      // step works on (taken from its title and the project's own parts list), laid out in order across the table
      g.add(table(2.6, 1.8, 0.78));
      const titles = (data.stepTitles?.length ? data.stepTitles : Array.from({ length: clamp(data.stepCount || 6, 1, 15) }, (_, i) => `Step ${i + 1}`)).slice(0, 15);
      const n = titles.length;
      const bomNames = (data.bomParts ?? []).map((p) => p.name);
      const findPart = (terms: string[]) => {
        // (a "motor" step means the motors themselves, never the motor driver)
        for (const t of terms) { const hit = bomNames.find((b) => b.toLowerCase().includes(t) && !(t === "motor" && /driver/i.test(b))); if (hit) return hit; }
        return terms[0];
      };
      const PARTS: [RegExp, string[]][] = [
        [/test motor/, ["brushless", "geared", "gear motor", "motor"]], [/propeller/, ["propeller"]], [/brushless/, ["brushless"]], [/\besc\b/, ["esc"]], [/speedybee|flight controller/, ["flight controller"]],
        [/receiver|elrs/, ["receiver"]], [/transmitter/, ["transmitter"]], [/battery/, ["battery holder", "lipo", "battery"]],
        [/hc-sr04/, ["hc-sr04"]], [/bracket/, ["bracket"]], [/ultrasonic|sonar/, ["ultrasonic", "hc-sr04"]], [/line sensor/, ["tcrt", "line sensor"]], [/sensor/, ["sensor"]],
        [/breadboard/, ["breadboard"]], [/nano|arduino|controller/, ["arduino", "nano", "microcontroller"]], [/driver/, ["l298", "driver"]],
        [/gripper/, ["gripper"]], [/servo|shoulder|elbow/, ["servo"]], [/wheel/, ["wheel"]], [/roller|caster/, ["caster"]], [/motor/, ["geared", "gear motor", "dc motor", "motor"]],
        [/bluetooth/, ["bluetooth"]], [/frame|chassis/, ["frame", "chassis"]], [/\bbase\b/, ["arm structure", "chassis", "frame"]],
      ];
      // small props for steps that are not about one part
      const laptop = () => {
        const o = new THREE.Group();
        o.add(mesh(rbox(0.42, 0.025, 0.28, 0.01), M.dark, 0, 0.013, 0.04));
        const lid = mesh(rbox(0.42, 0.28, 0.02, 0.01), M.dark, 0, 0.15, -0.1);
        lid.rotation.x = -0.25;
        lid.add(mesh(rbox(0.37, 0.23, 0.005, 0.004), M.screen, 0, 0, 0.012));
        for (let k = 0; k < 4; k++) lid.add(mesh(rbox(0.12 + (k % 2) * 0.1, 0.014, 0.004, 0.002), k % 2 ? PM.blue : PM.green, -0.08 + (k % 2) * 0.05, 0.07 - k * 0.045, 0.016));
        o.add(lid);
        o.add(pmTurn(mesh(cyl(0.012, 0.012, 0.22, 8), M.tire, 0.28, 0.015, 0.06), 0, 0, Math.PI / 2));
        return o;
      };
      const checkScreen = () => {
        const o = new THREE.Group();
        o.add(mesh(rbox(0.36, 0.26, 0.04, 0.02), M.dark, 0, 0.15, 0), mesh(rbox(0.08, 0.04, 0.12, 0.01), M.dark, 0, 0.02, 0));
        const a = mesh(rbox(0.07, 0.025, 0.01, 0.005), PM.green, -0.04, 0.13, 0.025), b = mesh(rbox(0.14, 0.025, 0.01, 0.005), PM.green, 0.03, 0.16, 0.025);
        a.rotation.z = -0.8; b.rotation.z = 0.9;
        o.add(a, b);
        return o;
      };
      const ball = () => { const o = new THREE.Group(); o.add(mesh(geo("st-ball", () => new THREE.SphereGeometry(0.13, 24, 16)), M.accent, 0, 0.13, 0)); return o; };
      const trackTile = () => {
        const o = new THREE.Group();
        o.add(mesh(rbox(0.44, 0.02, 0.32, 0.01), M.plastic, 0, 0.01, 0));
        const line = new THREE.Mesh(geo("st-track", () => new THREE.TorusGeometry(0.1, 0.018, 6, 32)), M.chip);
        line.rotation.x = -Math.PI / 2; line.scale.set(1.6, 1, 1); line.position.y = 0.022;
        o.add(line);
        return o;
      };
      const box = () => {
        const o = new THREE.Group();
        o.add(mesh(rbox(0.36, 0.18, 0.26, 0.015), M.box, 0, 0.09, 0));
        for (const s of [-1, 1]) { const f = mesh(rbox(0.36, 0.012, 0.13, 0.004), M.box, 0, 0.2, s * 0.17); f.rotation.x = s * 0.6; o.add(f); }
        o.add(mesh(rbox(0.1, 0.05, 0.08, 0.01), PM.uno, -0.06, 0.2, 0.0));
        return o;
      };
      const modelFor = (title: string) => {
        const s = title.toLowerCase();
        if (/upload|program|code|firmware|configure/.test(s)) return laptop();
        if (/^(test|final)/.test(s) && /ball/.test(s)) return ball();
        if (/^(test|final)/.test(s) && /track/.test(s)) return trackTile();
        for (const [re, terms] of PARTS) if (re.test(s)) return partModel(findPart(terms), "");
        if (/test|bind|check/.test(s)) return checkScreen();
        if (/connect|wire|solder|harness|ground/.test(s)) return partModel("jumper wires", "Structure");
        if (/unpack|prepare|peel/.test(s)) return box();
        return partModel("", "Electronics");
      };
      // the tiles, in reading order from back-left to front-right
      const cols = Math.ceil(Math.sqrt(n * 1.5)), rows = Math.ceil(n / cols);
      const cw = 2.4 / cols, cd = 1.6 / rows;
      const tileMat = track(new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.5 }));
      const done = track(new THREE.MeshStandardMaterial({ color: 0x2f9e5b, roughness: 0.45, emissive: 0x2f9e5b, emissiveIntensity: 0.25 }));
      const tiles = titles.map((title, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const t = new THREE.Group();
        t.position.set((col - (cols - 1) / 2) * cw, 0.83, (row - (rows - 1) / 2) * cd);
        const plate = mesh(rbox(cw * 0.86, 0.03, cd * 0.86, 0.012), tileMat, 0, 0.015, 0);
        t.add(plate);
        // its step number, printed on the front of the tile
        const c = document.createElement("canvas");
        c.width = 128; c.height = 64;
        const x2 = c.getContext("2d")!;
        x2.font = "700 44px ui-monospace, Menlo, Consolas, monospace";
        x2.fillStyle = "#C8592E"; x2.textAlign = "center"; x2.textBaseline = "middle";
        x2.fillText(String(i + 1).padStart(2, "0"), 64, 34);
        const tex = track(new THREE.CanvasTexture(c));
        tex.colorSpace = THREE.SRGBColorSpace;
        const num = new THREE.Mesh(track(new THREE.PlaneGeometry(0.16, 0.08)), track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })));
        num.rotation.x = -Math.PI / 2;
        num.position.set(-cw * 0.3, 0.032, cd * 0.32);
        t.add(num);
        const m = modelFor(title);
        m.scale.setScalar(Math.min(cw / 0.62, cd / 0.5, 1) * 0.8);
        m.position.set(0.02, 0.03, -cd * 0.04);
        t.add(m);
        t.rotation.y = ((i * 37) % 11) / 11 * 0.2 - 0.1;
        t.visible = false;
        g.add(t);
        return { t, plate };
      });
      stUpdate(g, (t, dt, lp, here) => {
        const shown = n * clamp(0.08 + lp * 1.1) * smooth(0.2, 0.9, here);
        tiles.forEach(({ t: tile, plate }, i) => {
          // a tile is placed once the reader reaches its step, then drops onto the table on its own
          const on = shown - i > 0.5;
          if (on && !tile.visible) tile.position.y = 0.83 + 0.6;
          tile.visible = on;
          tile.position.y = lerp(tile.position.y, 0.83, 1 - Math.exp(-dt * 9));
          plate.material = state.completed[i] ? done : tileMat;
        });
      });
    },
    view3d(g) {
      g.add(mesh(cyl(1.25, 1.35, 0.3, 64), M.plastic, 0, 0.15, 0));
      const ring = mesh(geo("vring", () => new THREE.TorusGeometry(1.45, 0.06, 16, 120)), M.accent, 0, 1.75, 0);
      g.add(ring);
      const holder = new THREE.Group();
      holder.position.y = 1.05;
      g.add(holder);
      modelHolders.push(holder);
      stUpdate(g, (t, dt) => { holder.rotation.y -= dt * (opts.reduced ? 0 : 0.35); ring.rotation.y = Math.sin(t * 0.4) * 0.12; });
    },
    code(g) {
      // the project's own program on the monitor, scrolling as the reader goes, and its own controller on the desk,
      // plugged in by USB with an upload pulse running down the cable
      g.add(mesh(rbox(3.0, 1.95, 0.1, 0.06), M.screen, 0, 1.7, 0));
      g.add(mesh(cyl(0.06, 0.06, 0.7, 12), M.dark, 0, 0.35, -0.08), mesh(rbox(1.0, 0.05, 0.5, 0.02), M.dark, 0, 0.03, -0.08));
      const ROWS = 18, CW = 1400, CH = 900;
      const c = document.createElement("canvas");
      c.width = CW; c.height = CH;
      const x2 = c.getContext("2d")!;
      const tex = track(new THREE.CanvasTexture(c));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const screen = new THREE.Mesh(track(new THREE.PlaneGeometry(2.84, 2.84 * (CH / CW))), track(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })));
      screen.position.set(0, 1.7, 0.056);
      g.add(screen);
      const lines = data.codeLines.length ? data.codeLines.map((l) => l.replace(/\t/g, "  ")) : ["// no program for this project yet"];
      const controller = (data.controller ?? "").replace(/\s*\(.*\)\s*$/, "").trim() || "Controller";
      const isFc = /flight|speedybee|\bfc\b/i.test(controller);
      const colour = (t: string) => {
        const s = t.trim();
        return s.startsWith("//") || s.startsWith("/*") || s.startsWith("*") ? "#6A9955"
          : s.startsWith("#") ? "#C586C0"
          : /^(void|int|const|float|bool|long|unsigned|if|else|for|while|return|set|feature|serial|map|resource|save)\b/i.test(s) ? "#569CD6"
          : /^[a-zA-Z_]+\s*\(/.test(s) ? "#DCDCAA" : "#D4D4D4";
      };
      let offset = -1;
      const draw = (o: number) => {
        x2.fillStyle = "#0E1116";
        x2.fillRect(0, 0, CW, CH);
        // title bar: the controller this program runs on
        x2.fillStyle = "#171B22";
        x2.fillRect(0, 0, CW, 64);
        ["#FF5F57", "#FEBC2E", "#28C840"].forEach((col, i) => { x2.fillStyle = col; x2.beginPath(); x2.arc(36 + i * 30, 32, 9, 0, Math.PI * 2); x2.fill(); });
        x2.font = "600 26px ui-sans-serif, system-ui, sans-serif";
        x2.fillStyle = "#AEB5C0";
        x2.textAlign = "center";
        x2.fillText(`${controller} · ${isFc ? "configuration" : "program"}`, CW / 2, 41);
        x2.textAlign = "left";
        const rowH = (CH - 84) / ROWS;
        x2.font = `500 ${Math.round(rowH * 0.62)}px ui-monospace, Menlo, Consolas, monospace`;
        for (let i = 0; i < ROWS; i++) {
          const n = o + i, line = lines[n];
          if (line === undefined) break;
          const y = 64 + 12 + rowH * (i + 0.72);
          x2.fillStyle = "rgba(174, 181, 192, 0.4)";
          x2.textAlign = "right";
          x2.fillText(String(n + 1), 70, y);
          x2.textAlign = "left";
          x2.fillStyle = colour(line);
          x2.fillText(line.length > 78 ? `${line.slice(0, 77)}…` : line, 96, y);
        }
        // a scroll thumb showing where in the program the reader is
        const total = Math.max(lines.length, 1), th = Math.max(40, (CH - 84) * Math.min(1, ROWS / total));
        x2.fillStyle = "rgba(255, 255, 255, 0.14)";
        x2.fillRect(CW - 14, 72 + ((CH - 84 - th) * o) / Math.max(1, total - ROWS), 6, th);
        tex.needsUpdate = true;
      };
      draw(0);
      document.fonts?.ready.then(() => draw(Math.max(offset, 0))).catch(() => {});
      // the controller on the desk, and its USB cable up to the monitor
      const board = partModel(controller, "Electronics");
      board.scale.setScalar(1.5);
      board.position.set(0.95, 0.06, 0.62);
      board.rotation.y = -0.35;
      g.add(board);
      const cable = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.62, 0.12, 0.5), new THREE.Vector3(0.35, 0.05, 0.42), new THREE.Vector3(0.12, 0.05, 0.15), new THREE.Vector3(0.05, 0.3, -0.02), new THREE.Vector3(0.05, 0.62, -0.02),
      ]);
      const cord = mesh(track(new THREE.TubeGeometry(cable, 64, 0.022, 8, false)), M.tire);
      g.add(cord);
      const pulse = new THREE.Sprite(M.halo);
      pulse.scale.setScalar(0.28);
      g.add(pulse);
      stUpdate(g, (t, dt, lp) => {
        const o = Math.max(0, Math.round(lp * Math.max(0, lines.length - ROWS)));
        if (o !== offset) { offset = o; draw(o); }
        // the upload runs from the computer down to the board
        cable.getPoint(1 - ((t * 0.45) % 1), pulse.position);
      });
    },
    stores(g) {
      // a shelving unit per store, stocked with this project's own parts: what the store has sits on its shelves, what
      // it is missing leaves an empty slot with a red tag, and its sign gives its name, price for the kit and stock count
      const parts = (data.bomParts ?? []).slice(0, 15);
      const list = data.storeList?.length ? data.storeList : data.storeParts.map((n, i) => ({ name: `Store ${i + 1}`, cost: "", available: n, total: n, missing: undefined as string | undefined, top: i === data.topStore }));
      const cols = Math.max(1, list.length || 4);
      const width = 0.8;
      const perShelf = parts.length > 12 ? 5 : 4;
      const slotW = (width - 0.08) / perShelf;
      const outMat = track(new THREE.MeshStandardMaterial({ color: 0xd8432f, roughness: 0.5, emissive: 0xd8432f, emissiveIntensity: 0.35 }));
      const sign = (lines: [string, string], x: number, top: boolean) => {
        const c = document.createElement("canvas");
        c.width = 512; c.height = 192;
        const x2 = c.getContext("2d")!;
        x2.fillStyle = top ? "#C8592E" : "#1d2229";
        x2.fillRect(0, 0, 512, 192);
        x2.textAlign = "center"; x2.textBaseline = "middle";
        x2.fillStyle = "#ffffff";
        let size = 64;
        x2.font = `800 ${size}px ui-sans-serif, system-ui, sans-serif`;
        while (size > 24 && x2.measureText(lines[0]).width > 480) { size -= 4; x2.font = `800 ${size}px ui-sans-serif, system-ui, sans-serif`; }
        x2.fillText(lines[0], 256, 70);
        x2.font = "600 40px ui-sans-serif, system-ui, sans-serif";
        x2.fillStyle = top ? "#FFE3D6" : "#AEB5C0";
        x2.fillText(lines[1], 256, 142);
        const tex = track(new THREE.CanvasTexture(c));
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        const board = mesh(rbox(width, 0.3, 0.04, 0.02), M.dark, x, 2.28, 0.05);
        const face = new THREE.Mesh(track(new THREE.PlaneGeometry(width - 0.04, 0.28)), track(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })));
        face.position.set(x, 2.28, 0.072);
        g.add(board, face);
      };
      const shelves: THREE.Object3D[][] = [];
      list.forEach((store, c) => {
        const x = (c - (cols - 1) / 2) * (width + 0.1);
        for (const sx of [-1, 1]) g.add(mesh(rbox(0.05, 2.1, 0.5, 0.01), M.dark, x + sx * width / 2, 1.05, 0));
        for (let s = 0; s < 3; s++) g.add(mesh(rbox(width, 0.04, 0.5, 0.01), M.wood, x, 0.4 + s * 0.65, 0));
        // which of the project's parts this store is missing: the one it names, then from the end of the list
        const missing = new Set<number>();
        if (store.missing) parts.forEach((p, i) => { if (store.missing!.toLowerCase().includes(p.name.toLowerCase())) missing.add(i); });
        for (let i = parts.length - 1; i >= 0 && parts.length - missing.size > store.available; i--) missing.add(i);
        sign([store.name, `${store.cost ? `${store.cost} · ` : ""}${Math.min(store.available, store.total)}/${store.total} parts`], x, !!store.top);
        const items: THREE.Object3D[] = [];
        parts.forEach((p, i) => {
          const s = 2 - Math.floor(i / perShelf), k = i % perShelf; // fills from the top shelf down
          const px = x - width / 2 + 0.04 + (k + 0.5) * slotW, py = 0.42 + s * 0.65;
          if (missing.has(i)) {
            // an empty slot: a red "out of stock" tag hanging from the shelf edge
            const tag = mesh(rbox(slotW * 0.7, 0.07, 0.012, 0.01), outMat, px, py - 0.06, 0.255);
            tag.userData.y = tag.position.y;
            items.push(tag);
            g.add(tag);
            return;
          }
          const m = partModel(p.name, p.category);
          m.scale.setScalar((slotW / 0.46) * 0.95);
          m.rotation.y = Math.PI / 2 * (i % 2 ? 0.15 : -0.15);
          m.position.set(px, py, 0.02);
          m.userData.y = py;
          items.push(m);
          g.add(m);
        });
        shelves.push(items);
      });
      stUpdate(g, (t, dt, lp, here) => {
        const k = clamp(0.25 + lp * 1.4) * smooth(0.2, 0.9, here);
        shelves.forEach((items) => items.forEach((b, i) => {
          const on = k * items.length - i > 0.5;
          if (on && !b.visible) b.position.y = (b.userData.y as number) + 0.4;
          b.visible = on;
          b.position.y = lerp(b.position.y, b.userData.y as number, 1 - Math.exp(-dt * 9));
        }));
      });
    },
    faq(g) {
      g.add(pad(1.9));
      const ring = new THREE.Mesh(geo("faqring", () => new THREE.TorusGeometry(1.0, 0.035, 10, 96)), M.landing);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.125;
      g.add(ring);
    },
  };
  // stations register their per-frame behaviour through this tiny helper
  let pendingUpdate: Station["update"];
  function stUpdate(_g: THREE.Group, fn: NonNullable<Station["update"]>) { pendingUpdate = fn; }

  // panel journey: one floating panel per station (to the subject's left, Nesto stands to its right)
  const panelMode = !!data.panels;
  const boards: THREE.Mesh[] = [];
  const BOARD = { w: 2.7, h: 2.7 * (PANEL_H / PANEL_W), x: -1.95, y: 2.3, z: 0.8 };
  /* each panel is a pane of transparent grey glass in the 3D scene (so space shows through it), and its content is a
     real HTML screen (crisp at any zoom) drawn by a CSS 3D layer over the canvas, following the pane exactly. Only
     the panels near the visitor's chapter show their screen, so a distant one never draws over the scene in front */
  const css = panelMode ? new CSS3DRenderer() : null;
  const cssScene = new THREE.Scene();
  const cssScale = new THREE.Matrix4().makeScale(BOARD.w / PANEL_W, BOARD.h / PANEL_H, 1);
  if (css && canvas.parentElement) {
    Object.assign(css.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    canvas.parentElement.appendChild(css.domElement);
  }
  const glassMat = track(new THREE.MeshBasicMaterial({ color: 0xc4c9cf, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  const holeGeo = (() => {
    const w = BOARD.w, h = BOARD.h, r = (40 / PANEL_W) * BOARD.w, x = -w / 2, y = -h / 2;
    const sh = new THREE.Shape();
    sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r);
    sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r);
    sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y);
    return track(new THREE.ShapeGeometry(sh, 12));
  })();
  let hoverK = -1;
  // the panels' soft silver edge glow, which brightens under the pointer and on the panel Enter would open
  const panelGlowTex = panelMode ? track((() => {
    const m = 0.32, pw = BOARD.w + m * 2, ph = BOARD.h + m * 2, sc = 200;
    const c = document.createElement("canvas");
    c.width = Math.round(pw * sc); c.height = Math.round(ph * sc);
    const x = c.getContext("2d")!;
    const r = 0.17 * sc, bx = m * sc, by = m * sc, bw = BOARD.w * sc, bh = BOARD.h * sc;
    const path = () => {
      x.beginPath();
      x.moveTo(bx + r, by); x.arcTo(bx + bw, by, bx + bw, by + bh, r); x.arcTo(bx + bw, by + bh, bx, by + bh, r);
      x.arcTo(bx, by + bh, bx, by, r); x.arcTo(bx, by, bx + bw, by, r); x.closePath();
    };
    x.shadowColor = "rgba(235, 240, 248, 1)";
    x.shadowBlur = 0.22 * sc;
    x.strokeStyle = "rgba(255, 255, 255, 0.85)";
    x.lineWidth = 0.025 * sc;
    for (let i = 0; i < 2; i++) { path(); x.stroke(); }
    x.shadowColor = "rgba(255, 255, 255, 0.9)"; // a bright reflection along the top edge
    x.shadowBlur = 0.12 * sc;
    x.strokeStyle = "rgba(255, 255, 255, 0.7)";
    x.lineWidth = 0.012 * sc;
    x.beginPath(); x.moveTo(bx + r, by); x.lineTo(bx + bw - r, by); x.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })()) : null;
  // panels need the camera a little further back to frame panel, subject and Nesto together
  const distOf = (kind: StationKind) => SHOT[kind].dist + (panelMode && kind !== "intro" ? 1.9 : 0);

  data.kinds.forEach((kind, k) => {
    const shot = SHOT[kind];
    const g = new THREE.Group();
    g.position.copy(stationPos[k]);
    g.rotation.y = shot.az;
    if (kind !== "faq" && kind !== "intro") g.add(pad(2.15));
    const st: Station = { kind, group: g, prop: new THREE.Vector3(), robot: new THREE.Vector3(), target: new THREE.Vector3(), az: shot.az };
    pendingUpdate = undefined;
    builders[kind](g, st);
    st.update = pendingUpdate;
    scene.add(g);
    // camera-relative placement: Nesto waits to the prop's right as seen from the camera
    const right = new THREE.Vector3(Math.cos(shot.az), 0, -Math.sin(shot.az));
    const fwd = new THREE.Vector3(Math.sin(shot.az), 0, Math.cos(shot.az));
    st.prop.copy(stationPos[k]).setY(1.0);
    st.robot.copy(stationPos[k]).addScaledVector(right, shot.robot[0]).addScaledVector(fwd, shot.robot[2]).setY(shot.robot[1]);
    st.target.copy(stationPos[k]).addScaledVector(right, shot.robot[0] * 0.48).setY(shot.up);
    if (kind === "intro") st.target.copy(st.robot).setY(shot.up);
    // panel journey: a floating panel beside the station's subject, facing the camera; Nesto presents it
    const preview = data.panels?.[k];
    if (preview) {
      const board = new THREE.Mesh(holeGeo, glassMat);
      const screen = new CSS3DObject(createPanelDom(preview));
      screen.matrixAutoUpdate = false;
      screen.element.style.pointerEvents = "none"; // clicks reach the panel through the 3D pick, as before
      cssScene.add(screen);
      board.position.set(BOARD.x, BOARD.y, BOARD.z);
      board.rotation.x = -shot.el * 0.6;
      board.userData = { k, base: BOARD.y, hover: 0, screen, fade: -1 };
      const glow = new THREE.Mesh(geo("board-glow", () => new THREE.PlaneGeometry(BOARD.w + 0.64, BOARD.h + 0.64)), track(new THREE.MeshBasicMaterial({ map: panelGlowTex!, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
      glow.position.z = 0.004;
      glow.renderOrder = 2;
      board.add(glow);
      board.renderOrder = 1;
      g.add(board);
      boards.push(board);
      g.updateMatrixWorld(true);
      const centre = board.getWorldPosition(new THREE.Vector3());
      st.target.lerpVectors(centre, st.robot, 0.5);
      st.look = () => centre;
      // portrait screens can't fit panel, subject and Nesto side by side: frame mostly the panel, Nesto at the edge
      st.panelTarget = st.target.clone().lerp(centre, 0.62);
    }
    stations.push(st);
  });

  /* ---------- the project's own 3D model sits on the overview pedestal and inside the 3D View ring ---------- */
  let modelRoot: THREE.Object3D | null = null;
  let modelDispose: (() => void) | null = null;
  const placeModel = (m: THREE.Object3D, span = 1.5) => {
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
    const s = span / Math.max(size.x, size.y, size.z, 0.001);
    m.position.set(-centre.x * s, -box.min.y * s, -centre.z * s);
    m.scale.setScalar(s);
    m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    modelRoot = m;
    modelHolders.forEach((h, i) => h.add(i === 0 ? m : m.clone()));
  };
  if (data.localModel === "line-follower" && modelHolders.length) {
    // the Line Follower's detailed, fully assembled model (the same one its build guide uses)
    import("@/components/workshop/lineFollowerModel").then(({ buildLineFollowerModel }) => {
      if (disposed) return;
      const lf = buildLineFollowerModel();
      lf.root.remove(lf.track); // the test track isn't part of the robot
      modelDispose = lf.dispose;
      const turn = new THREE.Group();
      turn.rotation.y = LF_TURN;
      turn.add(lf.root);
      placeModel(turn, 1.9); // a low, wide robot: a little larger so its parts read at pedestal size
    }).catch(() => { /* the stations still read fine without the model */ });
  } else if (data.localModel && data.localModel !== "line-follower" && modelHolders.length) {
    // the drone's, arm's or soccer bot's detailed, fully assembled model (the same one its build guide uses)
    (data.localModel === "drone-explorer"
      ? import("@/components/workshop/droneModel").then((m) => m.buildDroneModel)
      : data.localModel === "robotic-arm"
        ? import("@/components/workshop/armModel").then((m) => m.buildArmModel)
        : data.localModel === "robosoccer"
          ? import("@/components/workshop/soccerModel").then((m) => m.buildSoccerModel)
          : data.localModel === "vision-sorter"
            ? import("@/components/workshop/vsModel").then((m) => m.buildVsModel)
          : data.localModel === "balancebot-pro"
            ? import("@/components/workshop/balModel").then((m) => m.buildBalModel)
          : data.localModel === "smart-agro-rover"
            ? import("@/components/workshop/agroModel").then((m) => m.buildAgroModel)
            : import("@/components/workshop/mazeModel").then((m) => m.buildMazeModel)
    ).then((build) => {
      if (disposed) return;
      const dr = build();
      if (dr.track) dr.root.remove(dr.track); // the soccer bot's ball isn't part of the robot
      modelDispose = dr.dispose;
      const turn = new THREE.Group();
      turn.rotation.y = LF_TURN;
      turn.add(dr.root);
      placeModel(turn, 1.9);
    }).catch(() => { /* the stations still read fine without the model */ });
  } else if (data.modelUrl && modelHolders.length) {
    new GLTFLoader().load(
      data.modelUrl,
      (gltf) => { if (!disposed) placeModel(gltf.scene); },
      undefined,
      () => { /* no model for this project: the stations still read fine without it */ }
    );
  }

  /* ---------- Nesto ---------- */
  const nesto = buildNesto(haloTex);
  const NESTO_SCALE = 0.55;
  nesto.root.scale.setScalar(NESTO_SCALE);
  const rig = new THREE.Group(), tilt = new THREE.Group();
  rig.add(tilt);
  tilt.add(nesto.root);
  scene.add(rig);
  const blob = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), M.shadow);
  blob.rotation.x = -Math.PI / 2;
  scene.add(blob);
  const animate = createNestoAnimator(nesto);
  const robotPath = new THREE.CatmullRomCurve3(stations.map((s) => s.robot), false, "centripetal");

  /* ---------- per-frame ---------- */
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
  const look = new THREE.Vector3(), lastRobot = new THREE.Vector3(), parallax = new THREE.Vector2(), ndc = new THREE.Vector2();
  const DARK_FLOOR = new THREE.Color(0x1c2128), LIGHT_FLOOR = new THREE.Color(0xefe8dd);
  const raycaster = new THREE.Raycaster();
  let fs = state.f, fv = 0, first = true, frame = 0, raf = 0, last = performance.now(), disposed = false;
  let arrived = -1, arrivedAt = 0, lastDark = -1, shift = { x: 0, y: 0 };
  const bg = new THREE.Color(), fogC = new THREE.Color();
  const clock0 = performance.now();

  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    if (renderer.getPixelRatio() !== pixelRatio()) renderer.setPixelRatio(pixelRatio());
    renderer.setSize(w, h, false);
    css?.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    if (!state.visible || document.hidden) return;
    // the dedicated 3D viewer has its own renderer: while it is on screen this world idles at a low rate
    if (state.viewerBusy && frame++ % 3 !== 0) return;
    // a frame's timestamp is when the frame began, which can predate the (long) stage setup: never let time run
    // backwards, or every eased value in the scene is thrown off on the first frame
    const elapsed = clamp((now - last) / 1000, 0, 0.25);
    const dt = Math.min(elapsed, 0.05);
    last = Math.max(last, now);
    const t = Math.max(0, (now - clock0) / 1000);

    /* scroll → continuous chapter position on a critically damped spring: wheel steps glide, and a long jump
       (chapter navigator, deep scroll) becomes one continuous flight of about a second, never a teleport */
    const target = clamp(state.f, 0, N - 1);
    if (opts.reduced) { fs = Math.round(target); fv = 0; }
    else if (first) { fs = target; fv = 0; }
    else {
      const ex = Math.exp(-7 * elapsed), d = fs - target, c = fv + 7 * d;
      fs = clamp(target + (d + c * elapsed) * ex, 0, N - 1);
      fv = (fv - 7 * c * elapsed) * ex;
    }
    const i = Math.min(Math.floor(fs), N - 2 < 0 ? 0 : N - 2);
    const frac = N > 1 ? clamp(fs - i) : 0;
    // parked or browsing, each leg eases in and out of its station; flying past several stations at once, the
    // easing gives way to a steady pace so Nesto sweeps through instead of braking at every one
    const fast = opts.reduced ? 0 : smooth(0.8, 2.5, Math.abs(fv));
    const e = lerp(ease(frac), frac, fast);
    const A = stations[i], B = stations[Math.min(i + 1, N - 1)];
    const travel = lerp(Math.sin(Math.PI * frac), 1, fast);

    /* Nesto travels the route: lifts off, flies over, settles beside the next station */
    const u = N > 1 ? (i + e) / (N - 1) : 0;
    const pos = robotPath.getPoint(u, tmp);
    const landed = B.kind === "faq" ? smooth(0.85, 1, fs - (N - 2)) : 0;
    pos.y += travel * 1.6 + (opts.reduced ? 0 : Math.sin(t * 1.6) * 0.06 * (1 - landed));
    if (B.kind === "faq") pos.y = lerp(pos.y, stations[N - 1].robot.y, landed);
    rig.position.copy(pos);
    const speed = first ? 0 : pos.distanceTo(lastRobot) / Math.max(dt, 1e-3);
    lastRobot.copy(pos);

    /* camera: orbit parameters interpolate between the two stations' shots, pulling back mid-flight */
    const sa = SHOT[A.kind], sb = SHOT[B.kind];
    const portrait = camera.aspect < 0.8;
    const introW = A.kind === "intro" ? 1 - e : 0; // how much of the shot is still the intro
    const tA = portrait ? A.panelTarget ?? A.target : A.target, tB = portrait ? B.panelTarget ?? B.target : B.target;
    camTarget.lerpVectors(tA, tB, e).lerp(pos, travel * 0.55);
    const az = lerpAngle(sa.az, sb.az, e);
    const el = lerp(sa.el, sb.el, e) + travel * 0.22;
    const narrow = camera.aspect < 1 ? 1.45 : camera.aspect < 1.3 ? 1.15 : 1;
    // (on a phone the intro steps back a little so Nesto fits between the header and his title)
    const dist = (lerp(distOf(A.kind), distOf(B.kind), e) + travel * 3.2) * narrow * (portrait ? lerp(1, 1.3, introW) : 1);
    camPos.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(camTarget);
    if (!opts.reduced && !mobile) {
      parallax.lerp(ndc.set(state.pointer.x, state.pointer.y), 1 - Math.exp(-dt * 3));
      camPos.x += parallax.x * 0.35 * Math.cos(az);
      camPos.z -= parallax.x * 0.35 * Math.sin(az);
      camPos.y -= parallax.y * 0.2;
    }
    camera.position.copy(camPos);
    camera.lookAt(camTarget);

    /* frame the scene in the half of the screen the chapter text leaves free */
    const w = canvas.clientWidth, h = canvas.clientHeight, wide = w >= 1024;
    const sideA = state.side[i] ?? 0, sideB = state.side[Math.min(i + 1, N - 1)] ?? 0;
    // (the panel journey keeps a caption along the bottom, so its scene sits a little higher)
    // on narrow screens the intro lifts Nesto clear of the title below him
    const sx = wide ? lerp(sideA, sideB, e) * 0.21 : 0, sy = wide ? (panelMode ? 0.05 : 0) : panelMode ? lerp(0.1, 0.18, introW) : 0.17;
    if (first || Math.abs(sx - shift.x) > 1e-4 || Math.abs(sy - shift.y) > 1e-4) {
      shift = { x: sx, y: sy };
      camera.setViewOffset(w, h, -sx * w, sy * h, w, h);
    }

    /* body faces the way it flies, then turns to the visitor once it arrives */
    const tng = robotPath.getTangent(clamp(u, 0, 1), tmp2);
    const flyYaw = Math.atan2(tng.x, tng.z);
    const faceYaw = Math.atan2(camPos.x - pos.x, camPos.z - pos.z);
    const moving = Math.max(smooth(0.02, 0.2, frac) * smooth(0.98, 0.8, frac), fast);
    rig.rotation.y = lerpAngle(faceYaw, flyYaw, moving);
    tilt.rotation.x = lerp(tilt.rotation.x, moving * 0.32, 1 - Math.exp(-dt * 6));

    /* where he looks: ahead while flying; at the station's subject on arrival; otherwise at the visitor */
    const rest = Math.round(fs);
    if (Math.abs(fs - rest) < 0.03) {
      if (arrived !== rest) { arrived = rest; arrivedAt = t; }
    } else arrived = -1;
    const here = stations[Math.min(Math.max(rest, 0), N - 1)];
    const sinceArrive = arrived >= 0 ? t - arrivedAt : -1;
    // (the intro has nothing to present: Nesto greets the visitor instead)
    const presents = here.kind !== "intro" && (here.kind !== "faq" || panelMode);
    const showing = presents && sinceArrive >= 0 && (sinceArrive < 2.6 || (sinceArrive % 7) > 5.6);
    const greeting = here.kind === "intro" && sinceArrive >= 0 && sinceArrive < 2.4;
    const pointerFresh = !mobile && now - state.pointer.at < 2500;
    if (moving > 0.3) look.copy(pos).addScaledVector(tng.normalize(), 4);
    else if (showing) look.copy(here.look?.() ?? here.prop);
    else if (pointerFresh && !opts.reduced) {
      raycaster.setFromCamera(ndc.set(state.pointer.x, -state.pointer.y), camera);
      // a point on the glass between visitor and robot, so the gaze stays stable even with the cursor over Nesto
      raycaster.ray.at(camera.position.distanceTo(pos) * 0.55, look);
    } else look.copy(camera.position);
    animate({
      t, dt, look, reduced: opts.reduced, speed,
      happy: pointerFresh || greeting || (here.kind === "faq" && landed > 0.9),
      pointing: showing && moving < 0.1,
      waving: greeting || (here.kind === "faq" && landed > 0.9 && sinceArrive >= 0 && sinceArrive < 2.2),
      landed,
    });
    const onPad = stations.some((st) => tmp2.set(pos.x, 0, pos.z).distanceTo(st.group.position) < 2.9);
    blob.position.set(pos.x, onPad ? 0.112 : 0.015, pos.z);
    const hgt = Math.max(pos.y - 0.6, 0);
    blob.scale.setScalar(0.9 + hgt * 0.35);
    M.shadow.opacity = 0.26 / (1 + hgt * 0.8);

    /* stations: each one animates its own subject, driven by how far the visitor has read that chapter */
    stations.forEach((st, k) => {
      const near = Math.abs(fs - k) < 1.6;
      // the panel journey keeps every station in view, so the route ahead shows in the distance
      st.group.visible = panelMode || Math.abs(fs - k) < 0.995;
      if (near && st.update) st.update(t, dt, state.local[k] ?? 0, clamp(1 - Math.abs(fs - k)));
    });
    // panels float gently and lift a touch under the pointer
    boards.forEach((b) => {
      const u = b.userData as { k: number; base: number; hover: number };
      u.hover = lerp(u.hover, u.k === hoverK ? 1 : 0, 1 - Math.exp(-dt * 10));
      b.scale.setScalar(1 + u.hover * 0.05);
      const ready = u.k === Math.round(fs) ? 1 : 0;
      ((b.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.22 + ready * 0.18 + u.hover * 0.5;
      b.position.y = u.base + (opts.reduced ? 0 : Math.sin(t * 0.64 + u.k * 1.3) * 0.05);
    });
    if (N > 1) dashes.count = Math.max(1, Math.round(dashCount * clamp(uToArc(clamp(u + 0.02)) + 0.002)));
    M.landing.emissiveIntensity = landed * (1.4 + Math.sin(t * 2) * 0.3);

    /* light and colour follow the chapter: warm studio ↔ dark technical workspace */
    const dark = 1 + 0 * lerp(sa.dark, sb.dark, e); // every chapter is the dark technical space now
    bg.copy(LIGHT_BG).lerp(DARK_BG, dark);
    fogC.copy(bg);
    (scene.fog as THREE.Fog).color.copy(fogC);
    M.floor.color.copy(LIGHT_FLOOR).lerp(DARK_FLOOR, dark);
    hemi.intensity = lerp(1.1, 0.35, dark);
    key.intensity = lerp(2.2, 1.3, dark);
    rim.intensity = lerp(0, 14, dark);
    rim.position.copy(camTarget).add(tmp.set(-3, 3, 2));
    scene.environmentIntensity = lerp(0.9, 0.4, dark);
    if (Math.abs(dark - lastDark) > 0.01) { lastDark = dark; opts.onDark(dark); }
    key.target.position.copy(camTarget);
    key.position.copy(camTarget).add(tmp.set(4, 7, 5));

    renderer.clear();
    cosmos.render({ t, dt, progress: N > 1 ? fs / (N - 1) : 0, warp: smooth(0.5, 2.6, Math.abs(fv)), view: camera, aspect: camera.aspect });
    renderer.clearDepth();
    renderer.render(scene, camera);
    if (css) {
      // each screen follows its panel exactly (float, hover lift, tilt) and fades into the distance like the fog
      boards.forEach((b) => {
        const u = b.userData as { screen: CSS3DObject; fade: number };
        b.updateMatrixWorld();
        u.screen.matrix.copy(b.matrixWorld).multiply(cssScale);
        u.screen.matrixWorldNeedsUpdate = true;
        const fog = scene.fog as THREE.Fog;
        const near = 1 - smooth(0.55, 0.95, Math.abs(fs - (b.userData.k as number)));
        const fade = Math.round(near * (1 - smooth(fog.near, fog.far, b.getWorldPosition(tmp).distanceTo(camera.position))) * 50) / 50;
        u.screen.visible = fade > 0.01;
        if (fade !== u.fade) { u.fade = fade; u.screen.element.style.opacity = String(fade); }
      });
      css.render(cssScene, camera);
    }
    first = false;
  }
  raf = requestAnimationFrame(tick);

  const pickNdc = new THREE.Vector2(), corner = new THREE.Vector3();
  return {
    resize,
    /* panel under a point given in normalised device coordinates (x right, y up), or -1 */
    pick(nx: number, ny: number) {
      if (!boards.length) return -1;
      raycaster.setFromCamera(pickNdc.set(nx, ny), camera);
      const hit = raycaster.intersectObjects(boards, false)[0];
      return hit ? (hit.object.userData.k as number) : -1;
    },
    setHover(k: number) { hoverK = k; },
    /* where a station's panel currently sits on screen, in CSS pixels (the open animation grows from it) */
    panelRect(k: number) {
      const b = boards.find((x) => x.userData.k === k);
      if (!b) return null;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        b.localToWorld(corner.set((sx * BOARD.w) / 2, (sy * BOARD.h) / 2, 0)).project(camera);
        const x = ((corner.x + 1) / 2) * w, y = ((1 - corner.y) / 2) * h;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      return { left, top, right, bottom };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      nesto.dispose();
      modelDispose?.();
      modelRoot?.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
        }
      });
      geoCache.forEach((g) => g.dispose());
      disposables.forEach((d) => d.dispose());
      cosmos.dispose();
      css?.domElement.remove();
      renderer.dispose();
    },
  };
}
