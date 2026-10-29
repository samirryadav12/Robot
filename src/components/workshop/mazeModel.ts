import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CONNECTIONS } from "./mazeData";
import type { KitConnection, KitModel, KitPartNode, KitWire } from "./kit";
import { wireHex } from "./wiringStyle";

/* A detailed, procedural RoboMaze Ultrasonic Solver built from the project's actual hardware
   (src/data/projects.ts): a narrow clear acrylic plate, front and rear ball casters, two yellow TT gear motors with
   65 mm wheels, a crown of three HC-SR04 sensors on brackets (left and right angled outward), a mini breadboard
   with an Arduino Nano, an L298N on standoffs, and a 2× 18650 holder with a slide switch. Units are centimetres; +x
   right, +y up, +z the front of the robot. Every part is its own group (installed pose + exploded offset) so it can
   be selected, isolated, highlighted and exploded; wires are rebuilt from named terminals so they stay attached
   while the parts move. Step 12's cardboard maze is shown on its own. */

type Node = KitPartNode & { anchors: THREE.Vector3[] };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const PIN = 0.254;

const PLATE = { w: 9, l: 15, t: 0.3, y: 4.45 };
const TOP = PLATE.y + PLATE.t;
const WHEEL_R = 3.25, AXLE_Y = WHEEL_R, WHEEL_X = 5.85;

export function buildMazeModel(): KitModel {
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
    acrylic: keep(new THREE.MeshPhysicalMaterial({ color: 0xe4f1f6, roughness: 0.06, transparent: true, opacity: 0.42, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide })),
    acrylicEdge: keep(new THREE.LineBasicMaterial({ color: 0x9fc4d3, transparent: true, opacity: 0.9 })),
    bracket: keep(new THREE.MeshPhysicalMaterial({ color: 0xeaf4f8, roughness: 0.1, transparent: true, opacity: 0.55, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide })),
    yellow: std({ color: 0xf2c230, roughness: 0.45 }),
    motorCan: std({ color: 0xc6c9ce, roughness: 0.28, metalness: 1 }),
    white: std({ color: 0xf4f2ec, roughness: 0.5 }),
    copperTab: std({ color: 0xc98a4b, roughness: 0.35, metalness: 1 }),
    rubber: std({ color: 0x1c1e21, roughness: 0.92 }),
    rim: std({ color: 0xf5c518, roughness: 0.4 }),
    steel: std({ color: 0xdfe3e8, roughness: 0.12, metalness: 1 }),
    darkMetal: std({ color: 0x3a3f46, roughness: 0.35, metalness: 0.8 }),
    brass: std({ color: 0xc9a043, roughness: 0.3, metalness: 1 }),
    screw: std({ color: 0xb8bcc2, roughness: 0.3, metalness: 1 }),
    headerBlack: std({ color: 0x17191c, roughness: 0.6 }),
    gold: std({ color: 0xe3bd5f, roughness: 0.25, metalness: 1 }),
    chip: std({ color: 0x141619, roughness: 0.45 }),
    heatsink: std({ color: 0x23262b, roughness: 0.4, metalness: 0.7 }),
    terminalBlue: std({ color: 0x2a5fb0, roughness: 0.55 }),
    capBlack: std({ color: 0x1e2024, roughness: 0.35 }),
    sonarCan: std({ color: 0xd5d9de, roughness: 0.3, metalness: 1 }),
    sonarMesh: std({ color: 0x2a2d32, roughness: 0.8 }),
    crystal: std({ color: 0xc6cad0, roughness: 0.2, metalness: 1 }),
    breadboard: std({ color: 0xf3f1ea, roughness: 0.7 }),
    holes: std({ color: 0x2a2c30, roughness: 0.8 }),
    railRed: std({ color: 0xd8432f, roughness: 0.5 }),
    railBlue: std({ color: 0x2f6fd6, roughness: 0.5 }),
    holder: std({ color: 0x1a1c1f, roughness: 0.65 }),
    cellWrap: std({ color: 0x2b7bb9, roughness: 0.35, metalness: 0.15 }),
    cellTop: std({ color: 0xc9ccd1, roughness: 0.25, metalness: 1 }),
    switchBody: std({ color: 0x232528, roughness: 0.5 }),
    usb: std({ color: 0xbfc3c9, roughness: 0.25, metalness: 1 }),
    plug: std({ color: 0x18191c, roughness: 0.5 }),
    card: std({ color: 0xc9a77a, roughness: 0.95 }),
    floor: std({ color: 0xe9e4da, roughness: 0.95 }),
    ledRed: std({ color: 0x8a1c14, emissive: 0xff3b2b, emissiveIntensity: 0.9, roughness: 0.3 }),
  };

  function pcbTexture(w: number, h: number, base: string, draw: (g: CanvasRenderingContext2D, W: number, H: number) => void) {
    const W = 1024, H = Math.round((1024 * h) / w);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.16; g.strokeStyle = "#ffffff"; g.lineWidth = 3;
    for (let i = 0; i < 22; i++) { g.beginPath(); const y = (i * 37) % H, x = (i * 91) % W; g.moveTo(x, y); g.lineTo(x + 120, y); g.lineTo(x + 170, y + 50); g.lineTo(x + 320, y + 50); g.stroke(); }
    g.globalAlpha = 1;
    draw(g, W, H);
    const t = keep(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  const pcbMaterials = (tex: THREE.Texture, edge: number) => {
    const side = std({ color: edge, roughness: 0.6 });
    const top = std({ map: tex, roughness: 0.55, metalness: 0.05 });
    return [side, side, top, side, side, side];
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

  /* ---------- narrow acrylic plate, with its slots and the clear motor brackets ---------- */
  {
    const n = part("chassis", V(0, PLATE.y, 0), V(0, 0, 0));
    const s = new THREE.Shape(), hw = PLATE.w / 2, hl = PLATE.l / 2, r = 1.2;
    s.moveTo(-hw + r, -hl); s.lineTo(hw - r, -hl); s.quadraticCurveTo(hw, -hl, hw, -hl + r);
    s.lineTo(hw, hl - 2.4); s.quadraticCurveTo(hw, hl, hw - 2.4, hl);           // a rounded nose for the sensor crown
    s.lineTo(-hw + 2.4, hl); s.quadraticCurveTo(-hw, hl, -hw, hl - 2.4);
    s.lineTo(-hw, -hl + r); s.quadraticCurveTo(-hw, -hl, -hw + r, -hl);
    const hole = (x: number, z: number, rr = 0.16) => { const h = new THREE.Path(); h.absarc(x, z, rr, 0, Math.PI * 2, true); s.holes.push(h); };
    const slot = (x0: number, z0: number, x1: number, z1: number) => { const h = new THREE.Path(); h.moveTo(x0, z0); h.lineTo(x0, z1); h.lineTo(x1, z1); h.lineTo(x1, z0); h.lineTo(x0, z0); s.holes.push(h); };
    for (const z of [6.0, -6.2]) for (const x of [-0.95, 0.95]) hole(x, z);
    slot(-1.6, -1.0, 1.6, -0.4);                               // motor-wire pass-through
    slot(-1.8, 4.6, 1.8, 5.1);                                  // sensor-wire pass-through
    const g = keep(new THREE.ExtrudeGeometry(s, { depth: PLATE.t, bevelEnabled: false, curveSegments: 18 }));
    g.rotateX(Math.PI / 2); g.translate(0, PLATE.t, 0);
    const plate = add(n, g, M.acrylic, 0, 0, 0); plate.castShadow = false;
    const edges = new THREE.LineSegments(keep(new THREE.EdgesGeometry(g, 25)), M.acrylicEdge); edges.userData.part = "chassis"; n.group.add(edges);
    for (const sx of [-1, 1]) for (const dz of [-1.15, 1.15]) {
      add(n, rbox(0.3, 2.5, 1.8, 0.08), M.bracket, sx * 3.0, -1.25, dz).castShadow = false;   // clear motor brackets (step 3)
    }
  }

  /* ---------- front and rear ball casters ---------- */
  {
    const anchors = [V(0, 0, 6.0), V(0, 0, -6.2)];
    const n = part("casters", V(0, 0, 0), V(0, -0.2, 0), 0, anchors);
    for (const z of [6.0, -6.2]) {
      add(n, geo("ball", () => new THREE.SphereGeometry(0.75, 28, 16)), M.steel, 0, 0.75, z);
      add(n, cyl(0.95, 0.75, 0.9, 24), M.darkMetal, 0, 1.25, z);
      add(n, rbox(3.0, 0.22, 1.2, 0.1), M.darkMetal, 0, 1.75, z);
      for (const x of [-0.95, 0.95]) { add(n, cyl(0.26, 0.26, PLATE.y - 1.86, 6), M.brass, x, (PLATE.y + 1.86) / 2, z); add(n, cyl(0.28, 0.28, 0.12, 6), M.screw, x, TOP + 0.06, z); }
    }
  }

  /* ---------- TT gear motors (yellow 1:48 gearbox + motor can) ---------- */
  for (const [id, sx] of [["motorL", -1], ["motorR", 1]] as const) {
    const n = part(id, V(sx * 2.2, AXLE_Y, 0), V(sx * 3.4, -0.5, 0));
    add(n, rbox(3.7, 2.25, 1.85, 0.12), M.yellow, sx * 0.6, 0.15, 0);
    add(n, box(0.5, 0.35, 0.9), M.yellow, sx * 0.6, 1.4, 0);
    const can = add(n, cyl(1.0, 1.0, 1.9, 28), M.motorCan, sx * -2.2, 0.35, 0); can.rotation.z = Math.PI / 2;
    const cap = add(n, cyl(0.85, 0.85, 0.3, 24), M.white, sx * -3.28, 0.35, 0); cap.rotation.z = Math.PI / 2;
    for (const dz of [-0.35, 0.35]) add(n, box(0.06, 0.45, 0.22), M.copperTab, sx * -3.45, 0.35, dz);
    const sh = add(n, cyl(0.27, 0.27, 2.0, 16), M.white, sx * 2.9, 0, 0); sh.rotation.z = Math.PI / 2;
    const k = id === "motorL" ? "L" : "R";
    term(`mot${k}.a`, id, sx * -3.48, 0.6, -0.35); term(`mot${k}.b`, id, sx * -3.48, 0.6, 0.35);
  }

  /* ---------- 65 mm high-traction wheels ---------- */
  for (const [id, sx] of [["wheelL", -1], ["wheelR", 1]] as const) {
    const n = part(id, V(sx * WHEEL_X, AXLE_Y, 0), V(sx * 4.5, 0, 0));
    const spin = new THREE.Group(); spin.rotation.z = Math.PI / 2; n.group.add(spin);
    const tyre = add(n, geo("tyre", () => new THREE.TorusGeometry(2.72, 0.55, 18, 64)), M.rubber, 0, 0, 0, spin);
    tyre.rotation.x = Math.PI / 2; tyre.scale.set(1, 1, 2.0);
    for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; const t = add(n, box(0.32, 2.1, 0.22), M.rubber, Math.cos(a) * 3.22, 0, Math.sin(a) * 3.22, spin); t.rotation.y = -a; }
    add(n, cyl(2.3, 2.3, 2.0, 40), M.rim, 0, 0, 0, spin);
    add(n, cyl(0.62, 0.62, 2.2, 20), M.rim, 0, 0, 0, spin);
    for (let i = 0; i < 6; i++) { const sp = add(n, box(0.34, 0.25, 1.75), M.white, 0, sx * 0.98, 0, spin); sp.rotation.y = (i / 6) * Math.PI * 2; sp.translateZ(1.3); }
  }

  /* ---------- the sensor crown: three brackets and three HC-SR04s (left and right angled 45° outward) ---------- */
  const SENSORS = [
    { id: "sensorL", key: "l", x: -2.9, z: 5.75, rot: -Math.PI / 4 },
    { id: "sensorC", key: "c", x: 0, z: 6.65, rot: 0 },
    { id: "sensorR", key: "r", x: 2.9, z: 5.75, rot: Math.PI / 4 },
  ];
  {
    const anchors = SENSORS.map((sn) => V(sn.x, 0, sn.z));
    const n = part("brackets", V(0, TOP, 0), V(0, 2.2, 3.2), 0, anchors);
    for (const sn of SENSORS) {
      const g = new THREE.Group(); g.position.set(sn.x, 0, sn.z); g.rotation.y = sn.rot; n.group.add(g);
      add(n, rbox(4.6, 0.25, 1.2, 0.06), M.bracket, 0, 0.12, -0.6, g).castShadow = false;           // foot on the deck
      const face = add(n, rbox(4.6, 2.3, 0.25, 0.06), M.bracket, 0, 1.15, 0, g); face.castShadow = false; // upright face
      for (const sx of [-1, 1]) add(n, cyl(0.1, 0.1, 0.3, 8), M.screw, sx * 1.9, 0.26, -0.8, g);
    }
  }
  const sonarTex = pcbTexture(4.5, 2.0, "#1f4fa8", (g, W, H) => {
    g.fillStyle = "#eef3fb"; g.textAlign = "center"; g.font = `bold ${H * 0.13}px sans-serif`;
    g.fillText("HC-SR04", W / 2, H * 0.92);
    g.font = `bold ${H * 0.09}px sans-serif`; g.fillText("VCC  TRIG  ECHO  GND", W / 2, H * 0.12);
  });
  const sonarSide = std({ color: 0x173d84, roughness: 0.6 }), sonarFace = std({ map: sonarTex, roughness: 0.55, metalness: 0.05 });
  const sonarMats = [sonarSide, sonarSide, sonarSide, sonarSide, sonarFace, sonarSide];
  for (const sn of SENSORS) {
    // the board stands upright just in front of its bracket, cylinders through the bracket face, pins on top
    const n = part(sn.id, V(sn.x, TOP + 1.25, sn.z), V(Math.sin(sn.rot) * 2.8, 2.4, Math.cos(sn.rot) * 2.8 + 1.6), sn.rot);
    add(n, box(4.5, 2.0, 0.16), sonarMats, 0, 0, -0.2);                          // printed face toward the walls
    for (const sx of [-1, 1]) {
      const can = add(n, cyl(0.8, 0.8, 1.2, 32), M.sonarCan, sx * 1.3, 0, 0.45); can.rotation.x = Math.PI / 2;
      const mesh = add(n, cyl(0.68, 0.68, 0.04, 28), M.sonarMesh, sx * 1.3, 0, 1.06); mesh.rotation.x = Math.PI / 2;
    }
    add(n, rbox(0.9, 0.35, 0.3, 0.1), M.crystal, 0, 0.55, -0.05);
    add(n, box(4 * PIN + 0.1, 0.26, 0.25), M.headerBlack, 0, 1.12, -0.3);
    (["vcc", "trig", "echo", "gnd"] as const).forEach((pn, i) => {
      const x = (i - 1.5) * PIN;
      add(n, box(0.06, 0.6, 0.06), M.gold, x, 1.35, -0.3);
      term(`${sn.id}.${pn}`, sn.id, x, 1.62, -0.3);
    });
  }

  /* ---------- mini breadboard with the Nano across its centre trench ---------- */
  {
    const n = part("breadboard", V(0, TOP, 2.9), V(0, 3.0, 0.5));
    add(n, box(3.5, 0.85, 4.7), M.breadboard, 0, 0.425, 0);
    add(n, box(0.3, 0.02, 4.4), M.holes, 0, 0.86, 0);                                    // the centre trench
    for (const [x, m] of [[-1.55, M.railRed], [1.55, M.railBlue]] as const) add(n, box(0.04, 0.02, 4.4), m, x, 0.86, 0);
    for (let zi = 0; zi < 17; zi++) for (const x of [-1.2, -0.95, -0.7, 0.7, 0.95, 1.2, -1.45, 1.45]) add(n, box(0.08, 0.02, 0.08), M.holes, x, 0.86, -2.0 + zi * PIN);
    term("bb.5v", "breadboard", -1.45, 0.9, -1.6);
    term("bb.gnd", "breadboard", 1.45, 0.9, -1.6);
  }
  const usbPort = new THREE.Group();
  {
    // pins down into the breadboard; its two header rows run along z either side of the trench
    const n = part("nano", V(0, TOP + 1.25, 2.9), V(0, 5.5, 0.5));
    const tex = pcbTexture(1.8, 4.3, "#0b6e99", (g, W, H) => { g.fillStyle = "#e8f6fb"; g.textAlign = "center"; g.font = `bold ${W * 0.14}px sans-serif`; g.fillText("NANO", W / 2, H * 0.5); });
    add(n, box(1.8, 0.14, 4.3), pcbMaterials(tex, 0x07506f), 0, 0, 0);
    add(n, box(0.75, 0.15, 0.75), M.chip, 0, 0.14, 0.2);
    const usb = add(n, rbox(0.8, 0.4, 0.7, 0.06), M.usb, 0, 0.25, -2.0);             // USB facing the rear (step 7)
    usbPort.position.copy(usb.position); n.group.add(usbPort);
    add(n, box(0.12, 0.06, 0.08), M.ledRed, 0.5, 0.1, -1.4);
    for (const sx of [-1, 1]) add(n, box(0.25, 0.3, 15 * PIN), M.headerBlack, sx * 0.75, -0.2, 0);
    // right row: D2–D11 (front to back), left row: VIN, GND, 5V
    ["d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "d10", "d11"].forEach((p, i) => term(`nano.${p}`, "nano", 0.75, 0.14, 1.8 - i * PIN));
    term("nano.vin", "nano", -0.75, 0.14, 1.8);
    term("nano.gnd", "nano", -0.75, 0.14, 1.8 - PIN);
    term("nano.5v", "nano", -0.75, 0.14, 1.8 - 3 * PIN);
  }

  /* ---------- L298N on standoffs behind the breadboard ---------- */
  {
    const n = part("driver", V(0, TOP + 0.6, -1.4), V(0, 4.0, -2.4));
    const S = 4.3;
    const tex = pcbTexture(S, S, "#b3241f", (g, W, H) => {
      g.fillStyle = "#fbeeee"; g.textAlign = "center";
      g.font = `bold ${H * 0.075}px sans-serif`; g.fillText("L298N", W * 0.5, H * 0.14);
      g.font = `bold ${H * 0.055}px sans-serif`;
      g.fillText("OUT1 OUT2", W * 0.1, H * 0.5); g.fillText("OUT3 OUT4", W * 0.9, H * 0.5);
      g.fillText("+12V GND +5V", W * 0.3, H * 0.94); g.fillText("ENA IN1 IN2 IN3 IN4 ENB", W * 0.7, H * 0.8);
    });
    add(n, box(S, 0.16, S), pcbMaterials(tex, 0x7e1714), 0, 0, 0);
    add(n, box(2.3, 0.35, 1.5), M.heatsink, 0, 0.3, -0.75);
    for (let i = 0; i < 9; i++) add(n, box(0.1, 1.8, 1.5), M.heatsink, -1.1 + i * 0.275, 1.35, -0.75);
    for (const x of [-1.6, 1.6]) add(n, cyl(0.35, 0.35, 0.95, 18), M.capBlack, x, 0.55, 0.5);
    const terminal = (count: number, x: number, z: number, alongZ: boolean) => {
      add(n, box(alongZ ? 0.8 : count * 0.5, 0.95, alongZ ? count * 0.5 : 0.8), M.terminalBlue, x, 0.55, z);
      for (let i = 0; i < count; i++) { const o = (i - (count - 1) / 2) * 0.5; add(n, cyl(0.15, 0.15, 0.08, 12), M.screw, alongZ ? x : x + o, 1.06, alongZ ? z + o : z); }
    };
    terminal(2, -S / 2 + 0.4, -0.6, true); terminal(2, S / 2 - 0.4, -0.6, true); terminal(3, -1.1, S / 2 - 0.4, false);
    term("drv.out1", "driver", -S / 2 + 0.05, 0.6, -0.85); term("drv.out2", "driver", -S / 2 + 0.05, 0.6, -0.35);
    term("drv.out3", "driver", S / 2 - 0.05, 0.6, -0.85); term("drv.out4", "driver", S / 2 - 0.05, 0.6, -0.35);
    term("drv.12v", "driver", -1.6, 0.6, S / 2 + 0.05); term("drv.gnd", "driver", -1.1, 0.6, S / 2 + 0.05); term("drv.5v", "driver", -0.6, 0.6, S / 2 + 0.05);
    add(n, box(8 * PIN, 0.25, 0.5), M.headerBlack, 1.05, 0.2, S / 2 - 0.35);
    const pins: [string, number][] = [["drv.in1", 1.5], ["drv.in2", 2.5], ["drv.in3", 3.5], ["drv.in4", 4.5]];
    for (const [t, i] of pins) { const x = 1.05 - 3.5 * PIN + i * PIN; add(n, box(0.06, 0.62, 0.06), M.gold, x, 0.5, S / 2 - 0.35); term(t, "driver", x, 0.8, S / 2 - 0.35); }
    for (const x of [1.05 - 3.5 * PIN, 1.05 + 2.5 * PIN]) add(n, box(0.18, 0.2, 0.32), M.headerBlack, x, 0.55, S / 2 - 0.35); // ENA / ENB jumper caps stay on
    for (const [x, z] of [[-1.85, -1.85], [1.85, -1.85], [-1.85, 1.85], [1.85, 1.85]]) add(n, cyl(0.26, 0.26, 0.6, 6), M.brass, x, -0.38, z);
  }

  /* ---------- 2× 18650 holder with its slide switch, at the rear ---------- */
  const slideSwitch = new THREE.Group();
  {
    const n = part("holder", V(0, TOP + 1.05, -5.55), V(0, 2.6, -4.5));
    const Lh = 7.8, Wh = 4.1, Hh = 2.1;
    add(n, rbox(Lh, 0.3, Wh, 0.1), M.holder, 0, -Hh / 2 + 0.15, 0);
    for (const sz of [-1, 1]) add(n, box(Lh, Hh * 0.75, 0.22), M.holder, 0, -0.1, sz * (Wh / 2 - 0.11));
    add(n, box(0.4, Hh * 0.8, 0.25), M.holder, 0, -0.1, 0);
    for (const sx of [-1, 1]) add(n, box(0.35, Hh, Wh), M.holder, sx * (Lh / 2 - 0.17), 0, 0);
    slideSwitch.position.set(Lh / 2 + 0.25, 0.25, -0.9); n.group.add(slideSwitch);
    add(n, box(0.4, 0.7, 1.3), M.switchBody, 0, 0, 0, slideSwitch);
    add(n, box(0.25, 0.3, 0.35), M.white, 0.28, 0.1, -0.25, slideSwitch);
    term("bat.pos", "holder", -1.0, 0.7, Wh / 2);
    term("bat.neg", "holder", -0.5, 0.7, Wh / 2);
  }
  {
    const n = part("cells", V(0, TOP + 1.05, -5.55), V(0, 2.8, -9));
    for (const sz of [-1, 1]) {
      const c = add(n, cyl(0.9, 0.9, 6.5, 32), M.cellWrap, 0, 0.05, sz * 0.95); c.rotation.z = Math.PI / 2;
      const t = add(n, cyl(0.35, 0.35, 0.12, 16), M.cellTop, 3.3, 0.05, sz * 0.95); t.rotation.z = Math.PI / 2;
    }
  }

  /* ---------- step 12's test maze: cardboard corridors on a floor (not a BOM part) ---------- */
  const track = new THREE.Group();
  {
    const fl = new THREE.Mesh(box(60, 0.05, 60), M.floor); fl.position.y = -0.03; fl.receiveShadow = true; track.add(fl);
    const wall = (x: number, z: number, w: number, d: number) => { const m = new THREE.Mesh(box(w, 8, d), M.card); m.position.set(x, 4, z); m.castShadow = true; m.receiveShadow = true; track.add(m); };
    wall(-14, 0, 0.5, 40); wall(14, 6, 0.5, 28); wall(0, 20, 28, 0.5); wall(6, -8, 16, 0.5); wall(-4, -20, 20, 0.5);
    track.visible = false;
    root.add(track);
  }

  /* ---------- wires ---------- */
  const wires = new Map<string, KitWire>();
  const wiresNode = part("wires", V(0, 0, 0), V(0, 0, 0));
  const plugGeo = box(0.26, 1.1, 0.26);
  for (const conn of CONNECTIONS) {
    const mat = std({ color: wireHex(conn.color), roughness: 0.45, emissive: 0x000000 });
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
  /* assembled routes: motor wires up through the centre slot to the driver's side terminals; everything else arcs
     over the deck */
  const via = (c: KitConnection, a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3[] | null => {
    if (c.kind === "Motor") { const sx = Math.sign(a.x), o = c.id.endsWith("2") ? 0.18 : 0; return [V(sx * (1.0 + o), PLATE.y - 0.5, -0.7), V(sx * (1.0 + o), TOP + 0.6, -0.7), V(b.x + sx * 0.6, b.y + 0.4, b.z + 0.3)]; }
    return null;
  };
  function updateWires() {
    root.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    for (const w of wires.values()) {
      terminalWorld(w.conn.from.terminal, tA).applyMatrix4(inv);
      terminalWorld(w.conn.to.terminal, tB).applyMatrix4(inv);
      const up = w.conn.jumper ? 0.5 : 0.25;
      const pts = [tA.clone()];
      const path = explodeK < 0.02 ? via(w.conn, tA, tB) : null;
      if (path) pts.push(...path);
      else {
        const span = tA.distanceTo(tB);
        const lift = Math.max(tA.y, tB.y) + Math.min(2.2, 0.5 + span * 0.14);
        pts.push(tA.clone().add(V(0, up, 0)), tA.clone().lerp(tB, 0.5).setY(lift), tB.clone().add(V(0, up, 0)));
      }
      pts.push(tB.clone());
      const geoW = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5), 64, w.conn.jumper ? 0.055 : 0.075, 8, false);
      w.mesh.geometry.dispose();
      w.mesh.geometry = geoW;
      if (w.plugs.length) { w.plugs[0].position.copy(tA).add(V(0, 0.25, 0)); w.plugs[1].position.copy(tB).add(V(0, 0.25, 0)); }
    }
  }

  /* assembly axes */
  const guideMat = keep(new THREE.LineDashedMaterial({ color: 0x7d838b, dashSize: 0.32, gapSize: 0.24, transparent: true, opacity: 0.8 }));
  const guides: { node: Node; anchor: THREE.Vector3; line: THREE.Line }[] = [];
  for (const n of parts.values()) {
    if (n.away.length() < 0.1) continue;
    for (const anchor of n.anchors) {
      // anchors are world points for the groups built in world space (casters, brackets), local offsets otherwise
      const a = n.id === "casters" || n.id === "brackets" ? anchor.clone().sub(n.home) : anchor.clone();
      const p = n.home.clone().add(a);
      const line = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints([p, p])), guideMat);
      line.visible = false; root.add(line);
      guides.push({ node: n, anchor: a, line });
    }
  }

  const spread = new THREE.Vector3(1, 1, 1);
  const tmpAway = new THREE.Vector3(), pa = new THREE.Vector3(), pb = new THREE.Vector3();
  const ORDER = ["sensorL", "sensorC", "sensorR", "nano", "cells", "holder", "brackets", "breadboard", "driver", "wires", "wheelL", "wheelR", "motorL", "motorR", "casters", "chassis"];
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
    features: { usb: usbPort, switch: slideSwitch },
    setExplode, terminalWorld,
    setSpread(x: number, y: number, z: number) { spread.set(x, y, z); setExplode(explodeK); },
    dispose() {
      for (const w of wires.values()) w.mesh.geometry.dispose();
      geoCache.forEach((g) => g.dispose());
      disposables.forEach((d) => d.dispose());
    },
  };
}
