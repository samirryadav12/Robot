import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CONNECTIONS } from "./vsData";
import type { KitModel, KitPartNode, KitWire } from "./kit";
import { wireHex } from "./wiringStyle";

/* A detailed, procedural Vision Sorter Station built from the project's hardware (src/data/projects.ts): a 2020
   T-slot table on levelling feet carrying a PVC conveyor (drive and idler rollers, bed, side guards) turned by a
   12 V gear motor; a vision arch with the Pi Camera looking down between two LED bars; the infrared item sensor;
   two servo pushers opposite two chutes and their red and green bins; and a control cabinet with a clear door
   (shown open), holding the Raspberry Pi, PCA9685, L298N, MOSFET switch, buck converter and terminal strip, an
   E-stop on top and the 7" HMI on its arm. Units are centimetres; +x along the belt (items travel +x), +y up, +z
   toward the operator. Every part is its own group (installed pose + exploded offset); wires are rebuilt from named
   terminals so they stay attached while the parts move. Step 13's test items are shown on their own. */

type Node = KitPartNode & { anchors: THREE.Vector3[] };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const RAIL_Y = 28, BELT_Y = 31, BELT_TOP = BELT_Y + 1.7, ROLLER_X = 29;
const ARCH_X = -10, ARCH_TOP = 52;
const CAB = { x0: 36, x1: 52, y0: 10, y1: 40, z0: -7, z1: 7 };
const BACK_Z = CAB.z0 + 0.6;
const PUSH_X = [4, 14];

export function buildVsModel(): KitModel {
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };
  const geoCache = new Map<string, THREE.BufferGeometry>();
  const geo = (k: string, make: () => THREE.BufferGeometry) => { let g = geoCache.get(k); if (!g) { g = make(); geoCache.set(k, g); } return g; };
  const rbox = (w: number, h: number, d: number, r: number) => geo(`rb${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.999));
  const box = (w: number, h: number, d: number) => geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
  const cyl = (rt: number, rb: number, h: number, s = 24) => geo(`c${rt}|${rb}|${h}|${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));

  /* ---------- materials ---------- */
  const std = (p: THREE.MeshStandardMaterialParameters) => keep(new THREE.MeshStandardMaterial(p));
  const M = {
    alu: std({ color: 0xc3c8ce, roughness: 0.32, metalness: 0.85 }),
    aluDark: std({ color: 0x8d939a, roughness: 0.35, metalness: 0.85 }),
    slot: std({ color: 0x4a4f56, roughness: 0.5, metalness: 0.6 }),
    belt: std({ color: 0x1f2226, roughness: 0.85 }),
    roller: std({ color: 0xa9afb6, roughness: 0.25, metalness: 1 }),
    steel: std({ color: 0xc9ced4, roughness: 0.22, metalness: 1 }),
    screw: std({ color: 0xb8bcc2, roughness: 0.3, metalness: 1 }),
    darkMetal: std({ color: 0x3a3f46, roughness: 0.35, metalness: 0.8 }),
    rubber: std({ color: 0x1b1d20, roughness: 0.9 }),
    motorCan: std({ color: 0xb9bec5, roughness: 0.25, metalness: 1 }),
    gearbox: std({ color: 0x8d939b, roughness: 0.35, metalness: 0.9 }),
    blueGear: std({ color: 0x2a5fb0, roughness: 0.45, metalness: 0.3 }),
    cabinet: std({ color: 0xc8ccd1, roughness: 0.55, metalness: 0.15 }),
    panel: std({ color: 0xe9ebee, roughness: 0.7 }),
    glass: keep(new THREE.MeshPhysicalMaterial({ color: 0xdfeaf0, roughness: 0.05, transparent: true, opacity: 0.25, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide })),
    dinRail: std({ color: 0xd4d8dd, roughness: 0.25, metalness: 1 }),
    terminalGrey: std({ color: 0x9aa0a8, roughness: 0.6 }),
    terminalBlue: std({ color: 0x2a5fb0, roughness: 0.55 }),
    terminalRed: std({ color: 0xc7372a, roughness: 0.55 }),
    headerBlack: std({ color: 0x17191c, roughness: 0.6 }),
    gold: std({ color: 0xe3bd5f, roughness: 0.25, metalness: 1 }),
    chip: std({ color: 0x141619, roughness: 0.45 }),
    heatsink: std({ color: 0x23262b, roughness: 0.4, metalness: 0.7 }),
    capBlack: std({ color: 0x1e2024, roughness: 0.35 }),
    coil: std({ color: 0x3b3f45, roughness: 0.5, metalness: 0.4 }),
    usb: std({ color: 0xbfc3c9, roughness: 0.25, metalness: 1 }),
    plug: std({ color: 0x18191c, roughness: 0.5 }),
    ledBar: std({ color: 0x2a2d33, roughness: 0.4, metalness: 0.5 }),
    ledLit: std({ color: 0xffffff, emissive: 0xf4f7ff, emissiveIntensity: 1.4, roughness: 0.3 }),
    lens: std({ color: 0x0c0d10, roughness: 0.05, metalness: 0.6 }),
    lensRing: std({ color: 0x2a2d32, roughness: 0.3, metalness: 0.8 }),
    servo: std({ color: 0x1d2024, roughness: 0.45 }),
    paddle: std({ color: 0xf4f2ec, roughness: 0.5 }),
    chute: std({ color: 0xd5dade, roughness: 0.3, metalness: 0.8 }),
    binRed: std({ color: 0xd8432f, roughness: 0.55 }),
    binGreen: std({ color: 0x2f9e5b, roughness: 0.55 }),
    estopRed: std({ color: 0xd32f2f, roughness: 0.4 }),
    estopYellow: std({ color: 0xf2c230, roughness: 0.5 }),
    screen: std({ color: 0x0f1318, roughness: 0.2, metalness: 0.3 }),
    screenGlow: std({ color: 0x0f2a1c, emissive: 0x2fbf71, emissiveIntensity: 0.6, roughness: 0.3 }),
    floor: std({ color: 0xe9e4da, roughness: 0.95 }),
    itemRed: std({ color: 0xd8432f, roughness: 0.5 }),
    itemGreen: std({ color: 0x2f9e5b, roughness: 0.5 }),
    itemBlue: std({ color: 0x2f6fd6, roughness: 0.5 }),
    ledRed: std({ color: 0x8a1c14, emissive: 0xff3b2b, emissiveIntensity: 0.9, roughness: 0.3 }),
    ledGreen: std({ color: 0x0f5a24, emissive: 0x34d058, emissiveIntensity: 0.9, roughness: 0.3 }),
  };

  function pcbTexture(w: number, h: number, base: string, text: string, sub = "") {
    const W = 1024, H = Math.max(64, Math.round((1024 * h) / w));
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.16; g.strokeStyle = "#ffffff"; g.lineWidth = 3;
    for (let i = 0; i < 22; i++) { g.beginPath(); const y = (i * 37) % H, x = (i * 91) % W; g.moveTo(x, y); g.lineTo(x + 120, y); g.lineTo(x + 170, y + 50); g.lineTo(x + 320, y + 50); g.stroke(); }
    g.globalAlpha = 1;
    g.fillStyle = "#eef3fb"; g.textAlign = "center";
    g.font = `bold ${Math.min(H * 0.2, W * 0.09)}px sans-serif`; g.fillText(text, W / 2, H * (sub ? 0.5 : 0.6));
    if (sub) { g.font = `bold ${Math.min(H * 0.12, W * 0.05)}px sans-serif`; g.fillText(sub, W / 2, H * 0.75); }
    const t = keep(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  // a board standing on the back panel: printed face toward the door (+z)
  const boardMats = (tex: THREE.Texture, edge: number) => {
    const side = std({ color: edge, roughness: 0.6 });
    return [side, side, side, side, std({ map: tex, roughness: 0.55, metalness: 0.05 }), side];
  };

  const root = new THREE.Group();
  const parts = new Map<string, Node>();
  const terminals = new Map<string, { part: string; local: THREE.Vector3 }>();
  const part = (id: string, home: THREE.Vector3, away: THREE.Vector3, rotY = 0, anchors: THREE.Vector3[] = [V(0, 0, 0)]) => {
    const g = new THREE.Group();
    g.name = id; g.position.copy(home); g.rotation.y = rotY; root.add(g);
    const node: Node = { id, group: g, home: home.clone(), homeQ: g.quaternion.clone(), away, meshes: [], anchors };
    parts.set(id, node);
    return node;
  };
  const add = (node: Node, g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0, parent?: THREE.Object3D) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.part = node.id;
    (parent ?? node.group).add(mesh);
    node.meshes.push(mesh);
    return mesh;
  };
  const term = (t: string, p: string, x: number, y: number, z: number) => terminals.set(t, { part: p, local: V(x, y, z) });
  // a 2020 extrusion between two points (axis-aligned), with its slots
  const extrusion = (n: Node, a: THREE.Vector3, b: THREE.Vector3) => {
    const d = b.clone().sub(a), len = d.length(), mid = a.clone().add(b).multiplyScalar(0.5);
    const along = Math.abs(d.x) > 0.01 ? "x" : Math.abs(d.y) > 0.01 ? "y" : "z";
    const size = along === "x" ? [len, 2, 2] : along === "y" ? [2, len, 2] : [2, 2, len];
    add(n, rbox(size[0], size[1], size[2], 0.15), M.alu, mid.x, mid.y, mid.z);
    for (const s of [-1, 1]) {
      const g2 = along === "x" ? box(len, 0.35, 0.05) : along === "y" ? box(0.05, len, 0.35) : box(0.35, 0.05, len);
      const o = along === "x" ? V(0, 0, s * 1.0) : along === "y" ? V(s * 1.0, 0, 0) : V(0, s * 1.0, 0);
      add(n, g2, M.slot, mid.x + o.x, mid.y + o.y, mid.z + o.z);
    }
  };
  const bracket = (n: Node, x: number, y: number, z: number) => add(n, rbox(1.6, 1.6, 1.6, 0.2), M.aluDark, x, y, z);

  /* ---------- the T-slot table frame, with levelling feet ---------- */
  {
    const n = part("frame", V(0, 0, 0), V(0, 0, 0));
    for (const z of [-9, 9]) { extrusion(n, V(-32, RAIL_Y, z), V(32, RAIL_Y, z)); extrusion(n, V(-31, 6, z), V(31, 6, z)); }
    for (const x of [-31, 31, ARCH_X]) extrusion(n, V(x, RAIL_Y, -8), V(x, RAIL_Y, 8));
    for (const x of [-31, 31]) extrusion(n, V(x, 6, -8), V(x, 6, 8));
    for (const x of [-31, 31]) for (const z of [-9, 9]) {
      extrusion(n, V(x, 2, z), V(x, RAIL_Y - 1, z));
      bracket(n, x + (x > 0 ? -1.8 : 1.8), RAIL_Y - 1.8, z); bracket(n, x + (x > 0 ? -1.8 : 1.8), 7.8, z);
      add(n, cyl(1.3, 1.5, 0.5, 20), M.rubber, x, 0.25, z);                         // levelling foot
      add(n, cyl(0.35, 0.35, 1.6, 10), M.steel, x, 1.2, z);
    }
  }

  /* ---------- the conveyor: rollers, bed, belt and side guards ---------- */
  {
    const n = part("belt", V(0, 0, 0), V(0, 8, 0), 0, [V(0, BELT_Y, 0)]);
    for (const x of [-ROLLER_X, ROLLER_X]) {
      const r = add(n, cyl(1.6, 1.6, 9, 32), M.roller, x, BELT_Y, 0); r.rotation.x = Math.PI / 2;
      for (const z of [-4.9, 4.9]) add(n, rbox(3.2, 3.2, 0.8, 0.3), M.aluDark, x, BELT_Y, z);        // bearing blocks
    }
    add(n, box(ROLLER_X * 2, 0.4, 8), M.aluDark, 0, BELT_Y + 1.2, 0);                                  // support bed
    add(n, box(ROLLER_X * 2, 0.22, 8), M.belt, 0, BELT_TOP - 0.11, 0);                                  // top run
    add(n, box(ROLLER_X * 2, 0.22, 8), M.belt, 0, BELT_Y - 1.7, 0);                                    // return run
    for (const x of [-ROLLER_X, ROLLER_X]) { const w = add(n, geo("beltWrap", () => new THREE.CylinderGeometry(1.72, 1.72, 8, 32, 1, true, 0, Math.PI)), M.belt, x, BELT_Y, 0); w.rotation.x = Math.PI / 2; w.rotation.y = x > 0 ? 0 : Math.PI; }
    for (const z of [-4.6, 4.6]) add(n, box(ROLLER_X * 2 - 2, 2.6, 0.25), M.alu, 0, BELT_TOP + 1.2, z);  // side guards
    for (const x of [-20, 0, 20]) for (const z of [-9, 9]) add(n, box(1.2, BELT_Y - RAIL_Y - 1, 1.2), M.aluDark, x, (BELT_Y + RAIL_Y) / 2, z * 0.6);
  }

  /* ---------- conveyor gear motor under the drive roller ---------- */
  {
    const n = part("motor", V(-ROLLER_X, BELT_Y, 7.4), V(-6, -2, 9));
    const gb = add(n, rbox(3.2, 3.2, 3.0, 0.3), M.blueGear, 0, 0, 0);
    gb.castShadow = true;
    const can = add(n, cyl(1.5, 1.5, 4.0, 28), M.motorCan, 0, 0, 3.4); can.rotation.x = Math.PI / 2;
    const cap = add(n, cyl(1.2, 1.2, 0.3, 24), M.capBlack, 0, 0, 5.5); cap.rotation.x = Math.PI / 2;
    const cp = add(n, cyl(0.8, 0.8, 2.0, 16), M.steel, 0, 0, -2.4); cp.rotation.x = Math.PI / 2;     // coupler
    add(n, box(4.0, 0.4, 4.0), M.aluDark, 0, -2.0, 0.8);                                               // bracket
    term("mot.a", "motor", -0.4, 0.8, 5.7); term("mot.b", "motor", 0.4, 0.8, 5.7);
  }

  /* ---------- the vision arch, camera and LED bars ---------- */
  {
    const n = part("arch", V(0, 0, 0), V(0, 16, 0), 0, [V(ARCH_X, RAIL_Y, 0)]);
    for (const z of [-10, 10]) { extrusion(n, V(ARCH_X, RAIL_Y + 1, z), V(ARCH_X, ARCH_TOP - 1, z)); bracket(n, ARCH_X, RAIL_Y + 1.8, z * 0.85); }
    extrusion(n, V(ARCH_X, ARCH_TOP, -11), V(ARCH_X, ARCH_TOP, 11));
    add(n, box(4.4, 0.4, 24), M.aluDark, ARCH_X, ARCH_TOP + 1.2, 0);
  }
  {
    const n = part("camera", V(ARCH_X, ARCH_TOP - 3.2, 0), V(0, 20, 0));
    add(n, rbox(3.0, 0.3, 3.0, 0.1), M.blueGear, 0, 1.9, 0);                       // mount plate
    add(n, box(2.5, 0.15, 2.4), M.ledGreen, 0, 1.6, 0);                            // camera PCB
    add(n, rbox(1.6, 1.2, 1.6, 0.2), M.lensRing, 0, 0.9, 0);
    add(n, cyl(0.55, 0.55, 0.9, 24), M.lensRing, 0, 0.0, 0);
    add(n, cyl(0.38, 0.38, 0.05, 24), M.lens, 0, -0.46, 0);
    add(n, box(1.6, 0.05, 0.1), M.paddle, 0, 1.75, -1.3);                          // ribbon start
    term("cam.ribbon", "camera", 0, 1.7, -1.6);
  }
  {
    const n = part("leds", V(ARCH_X, ARCH_TOP - 2.0, 0), V(0, 18, 0));
    for (const sx of [-1, 1]) {
      const g = new THREE.Group(); g.position.set(sx * 3.2, 0, 0); g.rotation.z = sx * 0.55; n.group.add(g);
      add(n, box(1.6, 0.6, 18), M.ledBar, 0, 0, 0, g);
      add(n, box(1.2, 0.1, 17), M.ledLit, 0, -0.33, 0, g);
    }
    term("leds.pos", "leds", 3.6, 0.6, -8.6); term("leds.neg", "leds", 3.6, 0.6, -8.2);
  }

  /* ---------- the infrared item sensor on the near guard, before the camera ---------- */
  {
    const n = part("ir", V(ARCH_X - 4, BELT_TOP + 1.4, 5.4), V(0, 3, 8));
    const b = add(n, cyl(0.9, 0.9, 4.0, 20), M.steel, 0, 0, 0.6); b.rotation.x = Math.PI / 2;
    for (const z of [-0.6, 1.6]) { const nut = add(n, cyl(1.2, 1.2, 0.35, 6), M.darkMetal, 0, 0, z); nut.rotation.x = Math.PI / 2; }
    add(n, box(0.3, 0.2, 0.1), M.ledRed, 0, 0.75, 2.6);
    term("ir.out", "ir", -0.25, 0, 2.7); term("ir.vcc", "ir", 0, 0, 2.7); term("ir.gnd", "ir", 0.25, 0, 2.7);
  }

  /* ---------- servo pushers on the far guard ---------- */
  PUSH_X.forEach((x, i) => {
    const id = i === 0 ? "servoA" : "servoB";
    const n = part(id, V(x, BELT_TOP + 3.2, -5.6), V(0, 5, -8));
    add(n, rbox(2.3, 2.2, 1.2, 0.1), M.servo, 0, 0, 0);
    add(n, box(3.2, 0.2, 1.2), M.servo, 0, -0.4, 0);
    add(n, cyl(0.35, 0.35, 0.4, 14), M.paddle, -0.5, 1.25, 0);
    const arm = add(n, box(0.4, 0.3, 7.0), M.paddle, -0.5, 1.5, 3.4);             // paddle arm, resting along the guard
    arm.rotation.y = -1.25;
    add(n, box(0.3, 2.2, 3.0), M.paddle, 2.2, 0.4, 2.6).rotation.y = -1.25;
    term(`${id}.sig`, id, 0.9, -0.6, -0.7); term(`${id}.v`, id, 1.1, -0.6, -0.7); term(`${id}.g`, id, 1.3, -0.6, -0.7);
  });

  /* ---------- chutes on the near side, bins below ---------- */
  {
    const n = part("chutes", V(0, 0, 0), V(0, 0, 10), 0, PUSH_X.map((x) => V(x, BELT_Y, 6)));
    PUSH_X.forEach((x, i) => {
      const g = new THREE.Group(); g.position.set(x, BELT_TOP - 0.4, 5.2); g.rotation.x = 1.05; n.group.add(g);
      add(n, box(4.6, 0.25, 22), M.chute, 0, 0, 11, g);
      for (const s of [-1, 1]) add(n, box(0.25, 1.6, 22), M.chute, s * 2.3, 0.8, 11, g);
      const bin = i === 0 ? M.binRed : M.binGreen;
      add(n, box(8, 0.4, 8), bin, x, 0.2, 21);
      for (const [w, d, ox, oz] of [[8, 0.4, 0, -3.8], [8, 0.4, 0, 3.8], [0.4, 8, -3.8, 0], [0.4, 8, 3.8, 0]] as const) add(n, box(w, 7, d), bin, x + ox, 3.7, 21 + oz);
    });
  }

  /* ---------- the control cabinet (door open), its jack, terminal strip and E-stop ---------- */
  const W = CAB.x1 - CAB.x0, H = CAB.y1 - CAB.y0, D = CAB.z1 - CAB.z0, CX = (CAB.x0 + CAB.x1) / 2, CY = (CAB.y0 + CAB.y1) / 2;
  {
    const n = part("cabinet", V(CX, CY, 0), V(14, 0, 0));
    add(n, box(W, H, 0.4), M.cabinet, 0, 0, CAB.z0 + 0.2);                          // back
    add(n, box(W - 0.8, H - 0.8, 0.2), M.panel, 0, 0, CAB.z0 + 0.5);                 // mounting plate
    for (const s of [-1, 1]) { add(n, box(0.4, H, D), M.cabinet, s * (W / 2 - 0.2), 0, 0); add(n, box(W, 0.4, D), M.cabinet, 0, s * (H / 2 - 0.2), 0); }
    const door = new THREE.Group(); door.position.set(W / 2, 0, CAB.z1); door.rotation.y = -1.9; n.group.add(door);
    add(n, box(W, H, 0.3), M.glass, -W / 2, 0, 0, door);
    for (const s of [-1, 1]) { add(n, box(W, 0.8, 0.5), M.cabinet, -W / 2, s * (H / 2 - 0.4), 0, door); add(n, box(0.8, H, 0.5), M.cabinet, -W / 2 + s * (W / 2 - 0.4), 0, 0, door); }
    for (const x of [-W / 2 + 3, W / 2 - 3]) for (const z of [-4, 4]) { add(n, rbox(2, CAB.y0, 2, 0.15), M.alu, x, -H / 2 - CAB.y0 / 2, z); add(n, cyl(1.2, 1.4, 0.5, 18), M.rubber, x, -H / 2 - CAB.y0 + 0.25, z); }
    add(n, cyl(0.8, 0.8, 0.6, 16), M.darkMetal, -W / 2 - 0.2, 6, -3).rotation.z = Math.PI / 2;   // cable gland
    add(n, cyl(0.8, 0.8, 0.6, 16), M.darkMetal, -5, H / 2 + 0.2, -2);                           // top gland (display)
  }
  {
    // the panel jack on the left side and the 12 V / 0 V / 5 V terminal strip on the DIN rail
    const n = part("psu", V(CX - 1, CAB.y0 + 3, BACK_Z + 0.6), V(-3, -6, 12));
    add(n, box(W - 3, 0.7, 0.4), M.dinRail, 0, 0, 0);
    const mats = [M.terminalRed, M.terminalRed, M.terminalRed, M.terminalGrey, M.terminalGrey, M.terminalGrey, M.terminalBlue, M.terminalBlue];
    mats.forEach((m, i) => { add(n, box(0.6, 2.2, 1.6), m, -4.5 + i * 0.75, 0.4, 0.9); add(n, cyl(0.18, 0.18, 0.1, 10), M.screw, -4.5 + i * 0.75, 1.55, 1.2); });
    const jack = add(n, cyl(0.7, 0.7, 1.4, 18), M.headerBlack, -W / 2 + 0.6, 3.5, -2.5); jack.rotation.z = Math.PI / 2;
    term("psu.pos", "psu", -W / 2 + 1.3, 3.8, -2.3); term("psu.neg", "psu", -W / 2 + 1.3, 3.2, -2.3);
  }
  const estopCap = new THREE.Group();
  {
    const n = part("estop", V(CAB.x0 + 4, CAB.y1, 3.5), V(0, 6, 4));
    add(n, cyl(1.9, 1.9, 0.3, 28), M.estopYellow, 0, 0.15, 0);
    add(n, cyl(1.2, 1.2, 1.4, 24), M.estopRed, 0, 1.0, 0);
    estopCap.position.set(0, 1.9, 0); n.group.add(estopCap);
    add(n, cyl(1.6, 1.4, 0.8, 28), M.estopRed, 0, 0, 0, estopCap);
    add(n, box(2.0, 2.4, 2.0), M.headerBlack, 0, -1.4, 0);                         // contact block inside
    term("estop.in", "estop", -0.6, -2.7, 0.4); term("estop.out", "estop", 0.6, -2.7, 0.4);
  }

  /* ---------- the boards on the back panel ---------- */
  const usbPort = new THREE.Group();
  {
    const n = part("pi", V(CAB.x0 + 5.5, 32.5, BACK_Z + 0.6), V(0, 4, 14));
    add(n, box(8.5, 5.6, 0.16), boardMats(pcbTexture(8.5, 5.6, "#1f7a3a", "Raspberry Pi 4", "Model B"), 0x145a2a), 0, 0, 0);
    add(n, box(1.5, 1.5, 0.25), M.chip, -0.5, 0, 0.2);
    for (const [y, w] of [[1.6, 2.2], [-0.4, 2.2]] as const) add(n, rbox(w, 1.6, 1.5, 0.08), M.usb, 3.6, y, 0.8);   // USB ports
    const eth = add(n, rbox(2.1, 1.7, 1.6, 0.08), M.usb, 3.6, -2.0, 0.85);
    usbPort.position.copy(eth.position); n.group.add(usbPort);
    add(n, box(5.2, 0.5, 0.85), M.headerBlack, -0.8, 2.45, 0.5);                   // 40-pin header
    add(n, box(0.4, 1.9, 0.5), M.headerBlack, 0.9, -0.6, 0.3);                     // CSI
    add(n, box(0.4, 1.9, 0.5), M.headerBlack, -4.0, -0.6, 0.3);                    // DSI
    // header pins by physical number: odd pins on the inner row, even on the outer
    const hdr = (pin: number) => V(-3.3 + Math.floor((pin - 1) / 2) * 0.254, 2.3 + (pin % 2 ? 0 : 0.254), 0.95);
    const pins: [string, number][] = [["3v3", 1], ["5v", 2], ["gpio2", 3], ["gpio3", 5], ["gnd", 6], ["gpio17", 11], ["gpio18", 12], ["gpio27", 13], ["gpio23", 16], ["gpio24", 18]];
    for (const [t, p] of pins) { const v = hdr(p); term(`pi.${t}`, "pi", v.x, v.y, v.z); }
    term("pi.csi", "pi", 0.9, 0.3, 0.6); term("pi.dsi", "pi", -4.0, 0.3, 0.6);
    for (const [x, y] of [[-3.7, -2.3], [2.1, -2.3], [-3.7, 2.3], [2.1, 2.3]]) { const s = add(n, cyl(0.2, 0.2, 0.6, 6), M.steel, x, y, -0.35); s.rotation.x = Math.PI / 2; }
  }
  {
    const n = part("pca", V(CAB.x1 - 4.2, 33.5, BACK_Z + 0.6), V(4, 4, 14));
    add(n, box(6.2, 2.5, 0.16), boardMats(pcbTexture(6.2, 2.5, "#1d4f9c", "PCA9685"), 0x123a73), 0, 0, 0);
    add(n, box(1.1, 0.6, 0.2), M.chip, -1.6, -0.2, 0.15);
    add(n, box(0.9, 0.7, 0.9), M.terminalBlue, -2.6, 0.6, 0.5);                   // V+ terminal
    for (let ch = 0; ch < 2; ch++) for (let r = 0; r < 3; r++) add(n, box(0.06, 0.06, 0.6), M.gold, 0.6 + ch * 0.254, -0.8 + r * 0.254, 0.4);
    term("pca.sda", "pca", 2.6, -0.2, 0.5); term("pca.scl", "pca", 2.6, 0.05, 0.5); term("pca.vcc", "pca", 2.6, 0.3, 0.5); term("pca.gnd", "pca", 2.6, -0.45, 0.5);
    term("pca.vplus", "pca", -2.8, 0.6, 1.0); term("pca.vminus", "pca", -2.4, 0.6, 1.0);
    for (let ch = 0; ch < 2; ch++) { const x = 0.6 + ch * 0.254; term(`pca.ch${ch}g`, "pca", x, -0.8, 0.75); term(`pca.ch${ch}v`, "pca", x, -0.55, 0.75); term(`pca.ch${ch}s`, "pca", x, -0.3, 0.75); }
  }
  {
    const n = part("driver", V(CAB.x0 + 4, 23.5, BACK_Z + 0.9), V(0, -2, 14));
    const S = 4.3;
    add(n, box(S, S, 0.16), boardMats(pcbTexture(S, S, "#b3241f", "L298N"), 0x7e1714), 0, 0, 0);
    add(n, box(2.3, 1.5, 0.35), M.heatsink, 0, 0.75, 0.3);
    for (let i = 0; i < 9; i++) add(n, box(0.1, 1.5, 1.8), M.heatsink, -1.1 + i * 0.275, 0.75, 1.35);
    for (const [x, y, nn] of [[-S / 2 + 0.4, 0.6, 2], [S / 2 - 0.4, 0.6, 2]] as const) add(n, box(0.8, nn * 0.5, 0.95), M.terminalBlue, x, y, 0.55);
    add(n, box(1.5, 0.8, 0.95), M.terminalBlue, -1.1, -S / 2 + 0.4, 0.55);
    term("drv.out1", "driver", -S / 2 + 0.05, 0.85, 0.6); term("drv.out2", "driver", -S / 2 + 0.05, 0.35, 0.6);
    term("drv.12v", "driver", -1.6, -S / 2 - 0.05, 0.6); term("drv.gnd", "driver", -1.1, -S / 2 - 0.05, 0.6);
    add(n, box(2.0, 0.5, 0.25), M.headerBlack, 1.05, -S / 2 + 0.35, 0.2);
    (["ena", "in1", "in2"] as const).forEach((p, i) => { const x = 0.5 + i * 0.3; add(n, box(0.06, 0.06, 0.62), M.gold, x, -S / 2 + 0.35, 0.5); term(`drv.${p}`, "driver", x, -S / 2 + 0.35, 0.8); });
  }
  {
    const n = part("mosfet", V(CAB.x1 - 4.5, 24, BACK_Z + 0.6), V(4, -2, 14));
    add(n, box(3.3, 2.4, 0.16), boardMats(pcbTexture(3.3, 2.4, "#1f6aa3", "IRLZ44N"), 0x144a74), 0, 0, 0);
    add(n, box(1.0, 1.4, 0.45), M.chip, 0.6, 0.2, 0.3);
    add(n, box(1.0, 1.0, 0.9), M.terminalBlue, -1.0, 0.6, 0.5);
    term("mos.vin", "mosfet", -1.3, 0.9, 1.0); term("mos.pgnd", "mosfet", -1.0, 0.9, 1.0);
    term("mos.vplus", "mosfet", -0.7, 0.9, 1.0); term("mos.vminus", "mosfet", -1.3, 0.3, 1.0);
    term("mos.sig", "mosfet", 1.2, -0.9, 0.4); term("mos.gnd", "mosfet", 0.9, -0.9, 0.4);
  }
  {
    const n = part("buck", V(CAB.x1 - 4.2, 17.5, BACK_Z + 0.6), V(4, -6, 14));
    add(n, box(5.0, 2.6, 0.16), boardMats(pcbTexture(5.0, 2.6, "#1d4f9c", "5.1V  5A"), 0x123a73), 0, 0, 0);
    const coil = add(n, cyl(0.8, 0.8, 0.8, 20), M.coil, -0.4, 0, 0.5); coil.rotation.x = Math.PI / 2;
    const cap = add(n, cyl(0.45, 0.45, 1.0, 16), M.capBlack, 1.4, 0.3, 0.6); cap.rotation.x = Math.PI / 2;
    term("buck.inp", "buck", -2.3, 0.6, 0.3); term("buck.ing", "buck", -2.3, -0.6, 0.3);
    term("buck.out5", "buck", 2.3, 0.6, 0.3); term("buck.outg", "buck", 2.3, -0.6, 0.3);
  }

  /* ---------- the HMI arm and 7" touch display ---------- */
  {
    const n = part("hmi", V(CAB.x0 + 4, CAB.y1, -2), V(0, 12, 6));
    add(n, rbox(2, 18, 2, 0.15), M.alu, 0, 9, 0);
    add(n, rbox(2, 2, 6, 0.15), M.alu, 0, 18, 3);
    const disp = new THREE.Group(); disp.position.set(0, 19.5, 6.5); disp.rotation.x = -0.25; n.group.add(disp);
    add(n, rbox(19.4, 11.6, 1.6, 0.3), M.headerBlack, 0, 0, -0.4, disp);
    add(n, box(15.5, 8.6, 0.1), M.screen, 0, 0, 0.45, disp);
    add(n, box(4.0, 4.0, 0.12), M.screenGlow, -3.5, 0.5, 0.5, disp);
    add(n, cyl(1.2, 1.2, 0.12, 24), M.ledGreen, 3.5, 0.5, 0.52, disp).rotation.x = Math.PI / 2;
    term("hmi.ribbon", "hmi", 0, 0.5, 0); term("hmi.5v", "hmi", -0.4, 0.5, 0); term("hmi.gnd", "hmi", 0.4, 0.5, 0);
  }

  /* ---------- step 13's test items on the belt (not BOM parts) ---------- */
  const track = new THREE.Group();
  {
    const fl = new THREE.Mesh(box(150, 0.1, 90), M.floor); fl.position.set(10, -0.06, 5); fl.receiveShadow = true; track.add(fl);
    [[-24, M.itemRed], [-17, M.itemBlue], [-6, M.itemGreen], [9, M.itemRed], [20, M.itemBlue]].forEach(([x, m], i) => {
      const cube = new THREE.Mesh(box(2.4, 2.4, 2.4), m as THREE.Material); cube.position.set(x as number, BELT_TOP + 1.2, (i % 2 ? -1 : 1) * 1.2); cube.castShadow = true; track.add(cube);
    });
    track.visible = false;
    root.add(track);
  }

  /* ---------- wires ---------- */
  const wires = new Map<string, KitWire>();
  const wiresNode = part("wires", V(0, 0, 0), V(0, 0, 0));
  const plugGeo = box(0.26, 1.1, 0.26);
  for (const conn of CONNECTIONS) {
    const ribbon = conn.id === "c-cam" || conn.id === "c-dsi";
    const mat = std({ color: ribbon ? 0xd8dbe0 : wireHex(conn.color), roughness: 0.45, emissive: 0x000000 });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    mesh.castShadow = true;
    mesh.userData.part = conn.jumper ? "wires" : conn.from.part;
    mesh.userData.conn = conn.id;
    wiresNode.group.add(mesh);
    if (conn.jumper) wiresNode.meshes.push(mesh);
    const plugs = conn.jumper ? [0, 1].map(() => { const p = new THREE.Mesh(plugGeo, M.plug); p.userData.part = "wires"; p.userData.conn = conn.id; p.castShadow = true; wiresNode.group.add(p); wiresNode.meshes.push(p); return p; }) : [];
    wires.set(conn.id, { conn, mesh, plugs, mat });
  }
  const tA = new THREE.Vector3(), tB = new THREE.Vector3();
  let explodeK = 0;
  function terminalWorld(t: string, out: THREE.Vector3) {
    const d = terminals.get(t)!;
    const g = parts.get(d.part)!.group;
    g.updateWorldMatrix(true, false);
    return out.copy(d.local).applyMatrix4(g.matrixWorld);
  }
  const inCab = (p: THREE.Vector3) => p.x > CAB.x0 - 0.5 && p.x < CAB.x1 + 0.5 && p.y > CAB.y0 && p.y < CAB.y1 + 0.5 && p.z < CAB.z1;
  const SIDE_GLAND = V(CAB.x0 - 0.6, CY + 6, -3), TOP_GLAND = V(CX - 5, CAB.y1 + 0.6, -2);
  /* assembled routes: inside the cabinet wires bow out toward the door; cables to the machine leave through the side
     gland and run along the far top rail; the display's cables drop through the top gland */
  function updateWires() {
    root.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    for (const w of wires.values()) {
      terminalWorld(w.conn.from.terminal, tA).applyMatrix4(inv);
      terminalWorld(w.conn.to.terminal, tB).applyMatrix4(inv);
      const up = w.conn.jumper ? 0.5 : 0.3;
      const aIn = inCab(tA), bIn = inCab(tB);
      let pts: THREE.Vector3[];
      if (explodeK < 0.02 && aIn !== bIn) {
        const inside = aIn ? tA : tB, outside = aIn ? tB : tA;
        const viaTop = outside.y > CAB.y1;
        const path = viaTop
          ? [inside.clone().add(V(0, 0, 1.2)), V(TOP_GLAND.x, CAB.y1 - 1.5, TOP_GLAND.z), TOP_GLAND.clone(), outside.clone().add(V(0, -1.2, 0))]
          : [inside.clone().add(V(0, 0, 1.2)), V(CAB.x0 + 1.2, SIDE_GLAND.y, SIDE_GLAND.z), SIDE_GLAND.clone(), V(CAB.x0 - 3, RAIL_Y + 1.4, -10.4),
            V(Math.min(Math.max(outside.x, -30), CAB.x0 - 4), RAIL_Y + 1.4, -10.4), outside.clone().add(V(0, outside.y > RAIL_Y + 6 ? -1.5 : 1.0, 0))];
        if (!aIn) path.reverse();
        pts = [tA.clone(), ...path, tB.clone()];
      } else if (explodeK < 0.02 && aIn && bIn) {
        pts = [tA.clone(), tA.clone().add(V(0, 0, 0.9)), tA.clone().lerp(tB, 0.5).add(V(0, 0.4, 2.2)), tB.clone().add(V(0, 0, 0.9)), tB.clone()];
      } else {
        const span = tA.distanceTo(tB);
        const lift = Math.max(tA.y, tB.y) + Math.min(4, 0.6 + span * 0.12);
        pts = [tA.clone(), tA.clone().add(V(0, up, 0)), tA.clone().lerp(tB, 0.5).setY(lift), tB.clone().add(V(0, up, 0)), tB.clone()];
      }
      const ribbon = w.conn.id === "c-cam" || w.conn.id === "c-dsi";
      const geoW = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5), 96, ribbon ? 0.12 : w.conn.jumper ? 0.06 : 0.09, 8, false);
      w.mesh.geometry.dispose();
      w.mesh.geometry = geoW;
      if (w.plugs.length) { w.plugs[0].position.copy(tA).add(V(0, 0, 0.3)); w.plugs[1].position.copy(tB).add(V(0, 0, 0.3)); }
    }
  }

  /* assembly axes */
  const guideMat = keep(new THREE.LineDashedMaterial({ color: 0x7d838b, dashSize: 0.6, gapSize: 0.45, transparent: true, opacity: 0.8 }));
  const guides: { node: Node; anchor: THREE.Vector3; line: THREE.Line }[] = [];
  const worldAnchored = new Set(["belt", "arch", "chutes"]);
  for (const n of parts.values()) {
    if (n.away.length() < 0.1) continue;
    for (const anchor of n.anchors) {
      const a = worldAnchored.has(n.id) ? anchor.clone().sub(n.home) : anchor.clone();
      const p = n.home.clone().add(a);
      const line = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints([p, p])), guideMat);
      line.visible = false; root.add(line);
      guides.push({ node: n, anchor: a, line });
    }
  }

  const spread = new THREE.Vector3(1, 1, 1);
  const tmpAway = new THREE.Vector3(), pa = new THREE.Vector3(), pb = new THREE.Vector3();
  const ORDER = ["hmi", "estop", "pi", "pca", "driver", "mosfet", "buck", "psu", "cabinet", "camera", "leds", "arch", "ir", "servoA", "servoB", "chutes", "wires", "motor", "belt", "frame"];
  function setExplode(k: number) {
    explodeK = k;
    for (const n of parts.values()) {
      const d = (Math.max(0, ORDER.indexOf(n.id)) / ORDER.length) * 0.42;
      const t = Math.min(1, Math.max(0, (k - d) / 0.58));
      const ki = t * t * (3 - 2 * t);
      tmpAway.set(n.away.x * spread.x, n.away.y > 0 ? n.away.y * spread.y : n.away.y, n.away.z * spread.z);
      n.group.position.copy(n.home).addScaledVector(tmpAway, ki);
      n.group.quaternion.copy(n.homeQ);
    }
    for (const g of guides) {
      const on = g.node.group.position.distanceToSquared(g.node.home) > 0.04;
      g.line.visible = on;
      if (on) { g.line.geometry.setFromPoints([pa.copy(g.node.home).add(g.anchor), pb.copy(g.node.group.position).add(g.anchor)]); g.line.computeLineDistances(); }
    }
    updateWires();
  }
  setExplode(0);

  return {
    root, parts, wires, track,
    features: { usb: usbPort, estop: estopCap },
    setExplode, terminalWorld,
    setSpread(x: number, y: number, z: number) { spread.set(x, y, z); setExplode(explodeK); },
    dispose() {
      for (const w of wires.values()) w.mesh.geometry.dispose();
      geoCache.forEach((g) => g.dispose());
      disposables.forEach((d) => d.dispose());
    },
  };
}
