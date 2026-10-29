import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CONNECTIONS } from "./agroData";
import type { KitModel, KitPartNode, KitWire } from "./kit";
import { wireHex } from "./wiringStyle";

/* A detailed, procedural Smart Agro Rover built from the project's hardware (src/data/projects.ts): two round
   carbon-fibre decks on metal standoffs under a clear cover, four metal gear motors on suspension brackets with
   off-road wheels, the L298N, buck converter and MAX485 on the lower deck, the Arduino Mega, 3S Li-Po and toggle
   switch on the upper deck, a mast with the ESP32-CAM and the GPS antenna, a servo-driven probe rail carrying the
   N-P-K sensor on the right side, and two HC-SR04s on the front bracket. Units are centimetres; +x right, +y up, +z
   the front. Every part is its own group (installed pose + exploded offset); wires are rebuilt from named terminals
   so they stay attached while the parts move. Step 13's test patch (soil with crop rows) is shown on its own. */

type Node = KitPartNode & { anchors: THREE.Vector3[] };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const PIN = 0.254;

const WHEEL_R = 4.25, AXLE_Y = WHEEL_R, WHEEL_X = 11.6, WHEEL_Z = 6.8;
const LOWER = { r: 10.5, y: 6.2, t: 0.3 }, UPPER = { r: 10.5, y: 11.0, t: 0.3 }, COVER = { r: 10.5, y: 15.5, t: 0.3 };
const LTOP = LOWER.y + LOWER.t, UTOP = UPPER.y + UPPER.t, CTOP = COVER.y + COVER.t;

export function buildAgroModel(): KitModel {
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
    carbon: std({ color: 0x24272c, roughness: 0.32, metalness: 0.35 }),
    carbonEdge: keep(new THREE.LineBasicMaterial({ color: 0x5a6068, transparent: true, opacity: 0.8 })),
    acrylic: keep(new THREE.MeshPhysicalMaterial({ color: 0xe4f1f6, roughness: 0.06, transparent: true, opacity: 0.32, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide })),
    acrylicEdge: keep(new THREE.LineBasicMaterial({ color: 0x9fc4d3, transparent: true, opacity: 0.9 })),
    steel: std({ color: 0xc9ced4, roughness: 0.22, metalness: 1 }),
    darkMetal: std({ color: 0x3a3f46, roughness: 0.35, metalness: 0.8 }),
    motorCan: std({ color: 0xb9bec5, roughness: 0.25, metalness: 1 }),
    gearbox: std({ color: 0x8d939b, roughness: 0.35, metalness: 0.9 }),
    spring: std({ color: 0xd8a03a, roughness: 0.3, metalness: 0.9 }),
    rubber: std({ color: 0x1b1d20, roughness: 0.94 }),
    rim: std({ color: 0x2b2f35, roughness: 0.45, metalness: 0.4 }),
    screw: std({ color: 0xb8bcc2, roughness: 0.3, metalness: 1 }),
    headerBlack: std({ color: 0x17191c, roughness: 0.6 }),
    gold: std({ color: 0xe3bd5f, roughness: 0.25, metalness: 1 }),
    chip: std({ color: 0x141619, roughness: 0.45 }),
    heatsink: std({ color: 0x23262b, roughness: 0.4, metalness: 0.7 }),
    terminalBlue: std({ color: 0x2a5fb0, roughness: 0.55 }),
    terminalGreen: std({ color: 0x1f8a4c, roughness: 0.55 }),
    capBlack: std({ color: 0x1e2024, roughness: 0.35 }),
    coil: std({ color: 0x3b3f45, roughness: 0.5, metalness: 0.4 }),
    trimmer: std({ color: 0x2f6fd6, roughness: 0.5 }),
    sonarCan: std({ color: 0xd5d9de, roughness: 0.3, metalness: 1 }),
    sonarMesh: std({ color: 0x2a2d32, roughness: 0.8 }),
    lipo: std({ color: 0x2d3238, roughness: 0.4, metalness: 0.2 }),
    lipoLabel: std({ color: 0x8fd14f, roughness: 0.5, emissive: 0x2a4a10, emissiveIntensity: 0.4 }),
    xt60: std({ color: 0xf2c230, roughness: 0.5 }),
    red: std({ color: 0xc7372a, roughness: 0.5 }),
    switchBody: std({ color: 0x232528, roughness: 0.5 }),
    usb: std({ color: 0xbfc3c9, roughness: 0.25, metalness: 1 }),
    plug: std({ color: 0x18191c, roughness: 0.5 }),
    printed: std({ color: 0x3a3e44, roughness: 0.75 }),
    gpsPuck: std({ color: 0xd9dadc, roughness: 0.55 }),
    lens: std({ color: 0x0c0d10, roughness: 0.05, metalness: 0.6 }),
    lensRing: std({ color: 0x8e949b, roughness: 0.25, metalness: 1 }),
    servo: std({ color: 0x1d2024, roughness: 0.45 }),
    horn: std({ color: 0xf4f2ec, roughness: 0.5 }),
    rail: std({ color: 0x9aa0a8, roughness: 0.3, metalness: 0.9 }),
    npk: std({ color: 0x23262b, roughness: 0.5 }),
    prong: std({ color: 0xe3e6ea, roughness: 0.15, metalness: 1 }),
    soil: std({ color: 0x5b3e2a, roughness: 0.98 }),
    ridge: std({ color: 0x6b4a32, roughness: 0.98 }),
    leaf: std({ color: 0x3f8f3a, roughness: 0.7 }),
    ledRed: std({ color: 0x8a1c14, emissive: 0xff3b2b, emissiveIntensity: 0.9, roughness: 0.3 }),
    ledGreen: std({ color: 0x0f5a24, emissive: 0x34d058, emissiveIntensity: 0.9, roughness: 0.3 }),
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

  /* ---------- round decks: carbon lower and upper plates, clear cover ---------- */
  const disc = (r: number, t: number, holes: (s: THREE.Shape) => void) => {
    const s = new THREE.Shape();
    s.absarc(0, 0, r, 0, Math.PI * 2, false);
    holes(s);
    const g = keep(new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 64 }));
    g.rotateX(Math.PI / 2); g.translate(0, t, 0);
    return g;
  };
  const slot = (s: THREE.Shape, x0: number, z0: number, x1: number, z1: number) => { const h = new THREE.Path(); h.moveTo(x0, z0); h.lineTo(x0, z1); h.lineTo(x1, z1); h.lineTo(x1, z0); h.lineTo(x0, z0); s.holes.push(h); };
  const hole = (s: THREE.Shape, x: number, z: number, r = 0.18) => { const h = new THREE.Path(); h.absarc(x, z, r, 0, Math.PI * 2, true); s.holes.push(h); };
  const PILLARS = [30, 90, 150, 210, 270, 330].map((a) => (a * Math.PI) / 180).map((a) => [Math.cos(a) * 9.0, Math.sin(a) * 9.0] as const);
  for (const [id, d, mat, edge, away] of [
    ["lowerPlate", LOWER, M.carbon, M.carbonEdge, V(0, 0, 0)],
    ["upperPlate", UPPER, M.carbon, M.carbonEdge, V(0, 9, 0)],
    ["cover", COVER, M.acrylic, M.acrylicEdge, V(0, 17, 0)],
  ] as const) {
    const n = part(id, V(0, d.y, 0), away);
    const g = disc(d.r, d.t, (s) => {
      for (const [x, z] of PILLARS) hole(s, x, z);
      if (id !== "cover") slot(s, -2.2, -1.2, 2.2, 0.0);      // wire pass-through
      if (id === "cover") slot(s, -1.6, -3.2, 1.6, -0.8);      // mast cut-out
      if (id === "upperPlate") slot(s, -1.4, -3.0, 1.4, -1.0);
    });
    const plate = add(n, g, mat, 0, 0, 0);
    if (id === "cover") plate.castShadow = false;
    const edges = new THREE.LineSegments(keep(new THREE.EdgesGeometry(g, 25)), edge); edges.userData.part = id; n.group.add(edges);
  }

  /* ---------- standoffs between the decks and under the cover ---------- */
  {
    const n = part("standoffs", V(0, 0, 0), V(0, 5, 0), 0, PILLARS.map(([x, z]) => V(x, UPPER.y, z)));
    for (const [x, z] of PILLARS) {
      add(n, cyl(0.32, 0.32, UPPER.y - LTOP, 6), M.steel, x, (UPPER.y + LTOP) / 2, z);
      add(n, cyl(0.28, 0.28, COVER.y - UTOP, 6), M.steel, x, (COVER.y + UTOP) / 2, z);
      add(n, cyl(0.32, 0.32, 0.12, 6), M.screw, x, CTOP + 0.06, z);
    }
  }

  /* ---------- suspension brackets (one set, one per corner) ---------- */
  const CORNERS = [["FL", -1, 1], ["FR", 1, 1], ["RL", -1, -1], ["RR", 1, -1]] as const;
  {
    const anchors = CORNERS.map(([, sx, sz]) => V(sx * 7.6, LOWER.y, sz * WHEEL_Z));
    const n = part("brackets", V(0, 0, 0), V(0, -2.5, 0), 0, anchors);
    for (const [, sx, sz] of CORNERS) {
      const x = sx * 7.6, z = sz * WHEEL_Z;
      add(n, box(2.6, 0.25, 3.2), M.darkMetal, x, LOWER.y - 0.12, z);                          // top tab under the plate
      add(n, box(0.25, 2.2, 3.2), M.darkMetal, x + sx * 1.2, LOWER.y - 1.3, z);                 // drop arm
      add(n, cyl(1.55, 1.55, 2.6, 24), M.darkMetal, x + sx * 1.4, AXLE_Y, z).rotation.z = Math.PI / 2; // motor clamp ring
      const spring = add(n, geo("spring", () => new THREE.TorusGeometry(0.42, 0.08, 6, 18)), M.spring, x - sx * 0.6, LOWER.y - 1.0, z + sz * 1.0);
      spring.rotation.x = Math.PI / 2;
      for (let k = 1; k < 4; k++) { const s2 = add(n, geo("spring", () => new THREE.TorusGeometry(0.42, 0.08, 6, 18)), M.spring, x - sx * 0.6, LOWER.y - 1.0 - k * 0.32, z + sz * 1.0); s2.rotation.x = Math.PI / 2; }
      add(n, cyl(0.16, 0.16, 1.8, 8), M.steel, x - sx * 0.6, LOWER.y - 1.5, z + sz * 1.0);
    }
  }

  /* ---------- four metal gear motors ---------- */
  for (const [k, sx, sz] of CORNERS) {
    const id = `motor${k}`;
    const n = part(id, V(sx * 7.0, AXLE_Y, sz * WHEEL_Z), V(sx * 3.5, -1.5, sz * 1.5));
    const can = add(n, cyl(1.25, 1.25, 4.2, 28), M.motorCan, -sx * 1.0, 0, 0); can.rotation.z = Math.PI / 2;
    const gb = add(n, cyl(1.3, 1.3, 2.4, 28), M.gearbox, sx * 2.2, 0, 0); gb.rotation.z = Math.PI / 2;
    const cap = add(n, cyl(1.05, 1.05, 0.3, 24), M.capBlack, -sx * 3.25, 0, 0); cap.rotation.z = Math.PI / 2;
    const sh = add(n, cyl(0.22, 0.22, 2.0, 12), M.steel, sx * 4.2, 0, 0); sh.rotation.z = Math.PI / 2;
    for (const dz of [-0.4, 0.4]) add(n, box(0.08, 0.5, 0.25), M.gold, -sx * 3.45, 0.3, dz);
    term(`mot${k}.a`, id, -sx * 3.5, 0.6, -0.4); term(`mot${k}.b`, id, -sx * 3.5, 0.6, 0.4);
  }

  /* ---------- 85 mm off-road wheels ---------- */
  for (const [k, sx, sz] of CORNERS) {
    const n = part(`wheel${k}`, V(sx * WHEEL_X, AXLE_Y, sz * WHEEL_Z), V(sx * 6, 0, 0));
    const spin = new THREE.Group(); spin.rotation.z = Math.PI / 2; n.group.add(spin);
    const tyre = add(n, geo("agTyre", () => new THREE.TorusGeometry(3.3, 0.95, 20, 64)), M.rubber, 0, 0, 0, spin);
    tyre.rotation.x = Math.PI / 2; tyre.scale.set(1, 1, 1.75);
    // chunky tread blocks, staggered
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      for (const off of [-0.85, 0.85]) {
        const t = add(n, box(0.75, 0.9, 0.55), M.rubber, Math.cos(a + (off > 0 ? 0.12 : 0)) * 4.12, off, Math.sin(a + (off > 0 ? 0.12 : 0)) * 4.12, spin);
        t.rotation.y = -a;
      }
    }
    add(n, cyl(2.45, 2.45, 2.9, 36), M.rim, 0, 0, 0, spin);
    for (let i = 0; i < 6; i++) { const sp = add(n, box(0.45, 3.0, 1.9), M.darkMetal, 0, 0, 0, spin); sp.rotation.y = (i / 6) * Math.PI * 2; sp.translateZ(1.0); }
    add(n, cyl(0.7, 0.7, 3.1, 6), M.steel, 0, 0, 0, spin);
  }

  /* ---------- lower deck: L298N, buck converter, MAX485 ---------- */
  {
    const n = part("driver", V(0, LTOP + 0.6, -1.6), V(0, 5.5, -1.5));
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
    term("drv.12v", "driver", -1.6, 0.6, S / 2 + 0.05); term("drv.gnd", "driver", -1.1, 0.6, S / 2 + 0.05);
    add(n, box(8 * PIN, 0.25, 0.5), M.headerBlack, 1.05, 0.2, S / 2 - 0.35);
    (["ena", "in1", "in2", "in3", "in4", "enb"] as const).forEach((p, i) => {
      const x = 1.05 - 3.5 * PIN + (i + 0.5) * PIN * (7 / 6);
      add(n, box(0.06, 0.62, 0.06), M.gold, x, 0.5, S / 2 - 0.35);
      term(`drv.${p}`, "driver", x, 0.8, S / 2 - 0.35);
    });
    for (const [x, z] of [[-1.85, -1.85], [1.85, -1.85], [-1.85, 1.85], [1.85, 1.85]]) add(n, cyl(0.26, 0.26, 0.6, 6), M.steel, x, -0.38, z);
  }
  {
    const n = part("buck", V(5.9, LTOP + 0.55, 3.0), V(5, 4.5, 3));
    const tex = pcbTexture(4.4, 2.1, "#1d4f9c", (g, W, H) => { g.fillStyle = "#e8eef8"; g.textAlign = "center"; g.font = `bold ${H * 0.2}px sans-serif`; g.fillText("LM2596  5.0V", W / 2, H * 0.9); });
    add(n, box(4.4, 0.14, 2.1), pcbMaterials(tex, 0x123a73), 0, 0, 0);
    add(n, cyl(0.75, 0.75, 0.8, 20), M.coil, -0.6, 0.47, 0);
    add(n, cyl(0.4, 0.4, 1.0, 16), M.capBlack, 1.3, 0.57, 0.4);
    add(n, cyl(0.35, 0.35, 0.9, 16), M.capBlack, -1.8, 0.52, 0.5);
    add(n, box(0.45, 0.55, 0.45), M.trimmer, 1.3, 0.35, -0.5);
    add(n, box(0.12, 0.06, 0.08), M.ledRed, 0.4, 0.1, -0.7);
    for (const [x, ...ts] of [[-1.95, "buck.inp", "buck.ing"], [1.95, "buck.out5", "buck.outg"]] as const) {
      ts.forEach((t, i) => { const z = i ? 0.45 : -0.45; add(n, cyl(0.14, 0.14, 0.12, 10), M.gold, x, 0.12, z); term(t, "buck", x, 0.22, z); });
    }
    for (const [x, z] of [[-1.9, -0.8], [1.9, 0.8]]) add(n, cyl(0.22, 0.22, 0.55, 6), M.steel, x, -0.35, z);
  }
  {
    const n = part("max485", V(-5.9, LTOP + 0.55, 3.0), V(-5, 4.5, 3));
    const tex = pcbTexture(4.4, 1.6, "#1f6aa3", (g, W, H) => { g.fillStyle = "#e8f2fa"; g.textAlign = "center"; g.font = `bold ${H * 0.22}px sans-serif`; g.fillText("MAX485", W / 2, H * 0.85); });
    add(n, box(4.4, 0.14, 1.6), pcbMaterials(tex, 0x144a74), 0, 0, 0);
    add(n, box(1.0, 0.2, 0.6), M.chip, 0.2, 0.17, 0);
    add(n, box(1.1, 0.8, 1.0), M.terminalGreen, -1.6, 0.47, 0);
    for (const [i, t] of (["m485.a", "m485.b"] as const).entries()) { const z = i ? 0.25 : -0.25; add(n, cyl(0.12, 0.12, 0.08, 10), M.screw, -1.6, 0.9, z); term(t, "max485", -2.15, 0.6, z); }
    add(n, box(0.25, 0.3, 6 * PIN), M.headerBlack, 2.05, -0.15, 0);
    (["vcc", "gnd", "ro", "di", "de"] as const).forEach((p, i) => {
      const z = (i - 2) * PIN * 1.15;
      add(n, box(0.06, 0.5, 0.06), M.gold, 2.05, 0.25, z);
      term(`m485.${p}`, "max485", 2.05, 0.45, z);
    });
    for (const [x, z] of [[-1.9, -0.55], [1.6, 0.55]]) add(n, cyl(0.22, 0.22, 0.55, 6), M.steel, x, -0.35, z);
  }

  /* ---------- front bracket with the two HC-SR04s ---------- */
  const sonarTex = pcbTexture(4.5, 2.0, "#1f4fa8", (g, W, H) => {
    g.fillStyle = "#eef3fb"; g.textAlign = "center"; g.font = `bold ${H * 0.13}px sans-serif`;
    g.fillText("HC-SR04", W / 2, H * 0.92);
    g.font = `bold ${H * 0.09}px sans-serif`; g.fillText("VCC  TRIG  ECHO  GND", W / 2, H * 0.12);
  });
  const sonarSide = std({ color: 0x173d84, roughness: 0.6 }), sonarFace = std({ map: sonarTex, roughness: 0.55, metalness: 0.05 });
  const sonarMats = [sonarSide, sonarSide, sonarSide, sonarSide, sonarFace, sonarSide];
  for (const [id, sx] of [["sonarL", -1], ["sonarR", 1]] as const) {
    const rot = sx * 0.22;
    const n = part(id, V(sx * 2.7, LOWER.y - 1.3, LOWER.r + 0.4), V(sx * 2, -0.5, 6), rot);
    add(n, box(4.5, 2.0, 0.16), sonarMats, 0, 0, -0.2);
    add(n, box(4.8, 2.4, 0.2), M.darkMetal, 0, 0, -0.45);                   // its share of the off-road bracket
    add(n, box(4.8, 0.2, 1.5), M.darkMetal, 0, 1.25, -1.1);
    for (const x of [-1.3, 1.3]) {
      const can = add(n, cyl(0.8, 0.8, 1.2, 32), M.sonarCan, x, 0, 0.45); can.rotation.x = Math.PI / 2;
      const mesh = add(n, cyl(0.68, 0.68, 0.04, 28), M.sonarMesh, x, 0, 1.06); mesh.rotation.x = Math.PI / 2;
    }
    add(n, box(4 * PIN + 0.1, 0.26, 0.25), M.headerBlack, 0, -1.12, -0.3);
    (["vcc", "trig", "echo", "gnd"] as const).forEach((pn, i) => {
      const x = (i - 1.5) * PIN;
      add(n, box(0.06, 0.6, 0.06), M.gold, x, -1.35, -0.3);
      term(`${id}.${pn}`, id, x, -1.62, -0.3);
    });
  }

  /* ---------- the probe actuator: rail on the right side, MG996R at the top, N-P-K sensor on the rack ---------- */
  const RAIL = { x: LOWER.r + 0.9, z: 0 };
  {
    const n = part("servo", V(RAIL.x, 14.2, RAIL.z), V(6, 4, 0));
    add(n, box(1.6, 15.0, 1.2), M.rail, 0, -6.6, 0.0);                         // the vertical rail
    add(n, box(1.0, 1.0, 1.8), M.darkMetal, -1.0, -8.4, 0);                    // clamp to the lower plate
    add(n, rbox(2.0, 4.0, 4.2, 0.2), M.servo, 0, 0.6, 0);                       // MG996R
    add(n, box(2.2, 0.25, 5.4), M.servo, 0, 1.6, 0);
    add(n, cyl(0.55, 0.55, 0.5, 18), M.horn, 1.15, 0.4, 0.9).rotation.z = Math.PI / 2;
    add(n, cyl(0.3, 0.3, 0.6, 12), M.gold, 1.25, 0.4, 0.9).rotation.z = Math.PI / 2;
    term("servo.sig", "servo", -1.0, 2.0, -1.4); term("servo.vplus", "servo", -1.0, 2.0, -1.0); term("servo.gnd", "servo", -1.0, 2.0, -0.6);
  }
  {
    const n = part("npk", V(RAIL.x + 1.3, 6.4, RAIL.z), V(7, -1.5, 0)); // raised: prong tips just clear of the ground
    add(n, box(0.5, 9.0, 0.7), M.rail, -0.6, 4.0, 0);                           // the rack it hangs from
    for (let i = 0; i < 18; i++) add(n, box(0.25, 0.18, 0.7), M.rail, -0.9, 0.2 + i * 0.48, 0);
    add(n, cyl(1.2, 1.2, 3.2, 28), M.npk, 0.3, 0, 0);                           // sensor body
    add(n, cyl(1.25, 1.25, 0.4, 28), M.darkMetal, 0.3, -1.7, 0);
    for (const [x, z] of [[0.3, 0.75], [-0.35, -0.4], [0.95, -0.4]]) add(n, cyl(0.12, 0.08, 4.2, 10), M.prong, x, -3.9, z);
    add(n, cyl(0.35, 0.35, 0.8, 12), M.capBlack, 0.3, 1.9, 0);                 // cable gland
    term("npk.vplus", "npk", 0.3, 2.3, -0.24); term("npk.gnd", "npk", 0.3, 2.3, -0.08); term("npk.a", "npk", 0.3, 2.3, 0.08); term("npk.b", "npk", 0.3, 2.3, 0.24);
  }

  /* ---------- upper deck: the Arduino Mega, the Li-Po and the toggle switch ---------- */
  const usbPort = new THREE.Group();
  {
    // long axis along z, USB at the rear; header rows along both long edges
    const n = part("mega", V(0, UTOP + 0.7, 1.6), V(0, 12, 2));
    const L = 10.2, Wm = 5.3;
    const tex = pcbTexture(Wm, L, "#0b6e99", (g, W, H) => {
      g.fillStyle = "#e8f6fb"; g.textAlign = "center";
      g.save(); g.translate(W / 2, H / 2); g.rotate(-Math.PI / 2);
      g.font = `bold ${W * 0.16}px sans-serif`; g.fillText("ARDUINO", 0, -W * 0.05);
      g.font = `bold ${W * 0.12}px sans-serif`; g.fillText("MEGA 2560", 0, W * 0.12);
      g.restore();
    });
    add(n, box(Wm, 0.16, L), pcbMaterials(tex, 0x07506f), 0, 0, 0);
    add(n, box(1.4, 0.18, 1.4), M.chip, 0, 0.17, 0.5);
    const usb = add(n, rbox(1.2, 1.1, 1.6, 0.08), M.usb, -1.2, 0.6, -L / 2 + 0.6);
    usbPort.position.copy(usb.position); n.group.add(usbPort);
    add(n, rbox(0.9, 1.1, 1.4, 0.1), M.capBlack, 1.4, 0.6, -L / 2 + 0.6);      // barrel jack
    add(n, box(0.12, 0.06, 0.08), M.ledGreen, 1.8, 0.1, -2.2);
    for (const sx of [-1, 1]) add(n, box(0.25, 0.85, 8.4), M.headerBlack, sx * (Wm / 2 - 0.25), 0.5, 0.5);
    add(n, box(4.4, 0.85, 0.5), M.headerBlack, 0, 0.5, L / 2 - 0.35);           // the D22–D53 double header
    // right row (front to back): D3–D11 PWM side and the serial pins
    ["d3", "d4", "d5", "d6", "d8", "d9", "d10", "d11", "tx3", "rx3", "tx2", "rx2", "tx1", "rx1"].forEach((p, i) =>
      term(`mega.${p}`, "mega", Wm / 2 - 0.25, 0.95, 4.2 - i * 0.55));
    ["d22", "d23", "d24", "d25"].forEach((p, i) => term(`mega.${p}`, "mega", -1.6 + i * 0.6, 0.95, L / 2 - 0.35));
    term("mega.vin", "mega", -(Wm / 2 - 0.25), 0.95, -1.2);
    term("mega.gnd", "mega", -(Wm / 2 - 0.25), 0.95, -0.7);
    for (const [x, z] of [[-2.2, -4.3], [2.2, -4.3], [-2.2, 4.3], [2.2, 4.3]]) add(n, cyl(0.24, 0.24, 0.6, 6), M.steel, x, -0.4, z);
  }
  {
    const n = part("battery", V(0, UTOP + 1.7, -6.6), V(0, 10, -6));
    add(n, rbox(9.8, 3.3, 3.4, 0.3), M.lipo, 0, 0, 0);
    add(n, box(6.0, 0.05, 2.6), M.lipoLabel, 0.6, 1.68, 0);
    add(n, box(0.6, 3.5, 3.7), M.red, -3.2, 0, 0);                              // the strap
    add(n, rbox(1.4, 0.8, 1.0, 0.1), M.xt60, -5.6, -0.5, 0.8);
    term("bat.pos", "battery", -6.2, -0.4, 0.6);
    term("bat.neg", "battery", -6.2, -0.4, 1.0);
  }
  const toggle = new THREE.Group();
  {
    const n = part("switch", V(8.6, UTOP + 0.6, 0.6), V(6, 9, 0));
    add(n, rbox(1.6, 1.2, 2.2, 0.15), M.switchBody, 0, 0, 0);
    toggle.position.set(0, 0.6, 0); n.group.add(toggle);
    const lever = add(n, cyl(0.15, 0.2, 1.3, 12), M.steel, 0, 0.6, 0, toggle); lever.rotation.x = 0.4;
    add(n, cyl(0.35, 0.35, 0.2, 18), M.red, 0, 0.1, 0, toggle);
    term("sw.in", "switch", -0.8, 0.3, -0.6);
    term("sw.out", "switch", -0.8, 0.3, 0.6);
  }

  /* ---------- the mast: ESP32-CAM facing forward, GPS antenna on top ---------- */
  {
    const n = part("mast", V(0, CTOP, -2.0), V(0, 16, -1));
    add(n, box(2.6, 0.4, 2.6), M.printed, 0, 0.2, 0);
    for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) {
      const leg = add(n, box(0.4, 5.2, 0.4), M.printed, x * 0.75, 2.8, z * 0.75); leg.rotation.z = -x * 0.06; leg.rotation.x = z * 0.06;
    }
    add(n, box(2.2, 0.35, 2.2), M.printed, 0, 5.4, 0);
    add(n, box(3.2, 0.3, 0.6), M.printed, 0, 3.8, 0.9);                         // the camera shelf
  }
  {
    const n = part("cam", V(0, CTOP + 4.6, -0.6), V(0, 20, 5));
    const tex = pcbTexture(2.7, 4.0, "#1b1d21", (g, W, H) => { g.fillStyle = "#cfd3d8"; g.textAlign = "center"; g.font = `bold ${W * 0.11}px sans-serif`; g.fillText("ESP32-CAM", W / 2, H * 0.92); });
    const face = add(n, box(2.7, 4.0, 0.14), [std({ color: 0x0f1012, roughness: 0.6 }), std({ color: 0x0f1012, roughness: 0.6 }), std({ color: 0x0f1012, roughness: 0.6 }), std({ color: 0x0f1012, roughness: 0.6 }), std({ map: tex, roughness: 0.55 }), std({ color: 0x0f1012, roughness: 0.6 })], 0, 0, 0);
    face.castShadow = true;
    add(n, rbox(1.3, 1.3, 0.6, 0.1), M.capBlack, 0, 0.6, 0.35);
    add(n, cyl(0.42, 0.42, 0.5, 24), M.lensRing, 0, 0.6, 0.85).rotation.x = Math.PI / 2;
    add(n, cyl(0.3, 0.3, 0.05, 24), M.lens, 0, 0.6, 1.11).rotation.x = Math.PI / 2;
    add(n, box(0.16, 0.16, 0.1), M.ledRed, 0.9, -0.6, 0.1);
    (["5v", "gnd", "u0t", "u0r"] as const).forEach((p, i) => term(`cam.${p}`, "cam", -0.6 + i * 0.4, -2.0, -0.2));
  }
  {
    const n = part("gps", V(0, CTOP + 5.9, -2.0), V(0, 25, -2));
    add(n, cyl(2.0, 2.2, 1.1, 40), M.gpsPuck, 0, 0.55, 0);
    add(n, cyl(1.5, 1.5, 0.05, 32), M.darkMetal, 0, 1.12, 0);
    const ant = add(n, cyl(0.18, 0.22, 3.6, 12), M.capBlack, 1.9, 2.0, -0.6); ant.rotation.z = -0.15;
    add(n, box(2.2, 0.12, 2.2), M.terminalBlue, 0, -0.1, 0);                    // the NEO-6M board under the puck
    (["vcc", "rx", "tx", "gnd"] as const).forEach((p, i) => term(`gps.${p}`, "gps", -0.6 + i * 0.4, -0.2, 1.1));
  }

  /* ---------- step 13's test patch: soil with crop rows (not a BOM part) ---------- */
  const track = new THREE.Group();
  {
    const fl = new THREE.Mesh(box(90, 0.1, 90), M.soil); fl.position.y = -0.06; fl.receiveShadow = true; track.add(fl);
    for (const x of [-26, 26]) {
      const r = new THREE.Mesh(box(10, 2.2, 80), M.ridge); r.position.set(x, 1.0, 0); r.receiveShadow = true; track.add(r);
      for (let i = 0; i < 9; i++) {
        const p = new THREE.Mesh(geo("leaf", () => new THREE.ConeGeometry(2.4, 6, 7)), M.leaf);
        p.position.set(x + ((i % 2) * 2 - 1), 5.0, -36 + i * 9); p.castShadow = true; track.add(p);
      }
    }
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
  /* assembled routes: anything crossing between the decks goes up through the centre slot */
  const SLOT = V(0, 0, -0.6);
  const crossesDeck = (a: THREE.Vector3, b: THREE.Vector3) => (a.y < UPPER.y) !== (b.y < UPPER.y) && Math.abs(a.x) < LOWER.r && Math.abs(b.x) < LOWER.r;
  function updateWires() {
    root.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    for (const w of wires.values()) {
      terminalWorld(w.conn.from.terminal, tA).applyMatrix4(inv);
      terminalWorld(w.conn.to.terminal, tB).applyMatrix4(inv);
      const up = w.conn.jumper ? 0.5 : 0.25;
      const pts = [tA.clone()];
      if (explodeK < 0.02 && crossesDeck(tA, tB)) {
        // from the lower end, up through the slot, to the upper end (reversed when the wire starts at the top)
        const lo = tA.y < tB.y ? tA : tB, hi = lo === tA ? tB : tA;
        const path = [lo.clone().add(V(0, up, 0)), V(SLOT.x + (lo.x > 0 ? 0.4 : -0.4), LTOP + 0.8, SLOT.z), V(SLOT.x + (hi.x > 0 ? 0.4 : -0.4), UTOP + 0.6, SLOT.z), hi.clone().add(V(0, up, 0))];
        if (lo !== tA) path.reverse();
        pts.push(...path);
      } else {
        const span = tA.distanceTo(tB);
        const lift = Math.max(tA.y, tB.y) + Math.min(2.4, 0.5 + span * 0.12);
        pts.push(tA.clone().add(V(0, up, 0)), tA.clone().lerp(tB, 0.5).setY(lift), tB.clone().add(V(0, up, 0)));
      }
      pts.push(tB.clone());
      const geoW = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5), 64, w.conn.jumper ? 0.055 : 0.08, 8, false);
      w.mesh.geometry.dispose();
      w.mesh.geometry = geoW;
      if (w.plugs.length) { w.plugs[0].position.copy(tA).add(V(0, 0.25, 0)); w.plugs[1].position.copy(tB).add(V(0, 0.25, 0)); }
    }
  }

  /* assembly axes */
  const guideMat = keep(new THREE.LineDashedMaterial({ color: 0x7d838b, dashSize: 0.4, gapSize: 0.3, transparent: true, opacity: 0.8 }));
  const guides: { node: Node; anchor: THREE.Vector3; line: THREE.Line }[] = [];
  const worldAnchored = new Set(["brackets", "standoffs"]);
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
  const ORDER = ["gps", "cam", "mast", "cover", "battery", "switch", "mega", "standoffs", "upperPlate", "servo", "npk", "driver", "buck", "max485", "sonarL", "sonarR", "wires",
    "wheelFL", "wheelFR", "wheelRL", "wheelRR", "motorFL", "motorFR", "motorRL", "motorRR", "brackets", "lowerPlate"];
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
    features: { usb: usbPort, switch: toggle },
    setExplode, terminalWorld,
    setSpread(x: number, y: number, z: number) { spread.set(x, y, z); setExplode(explodeK); },
    dispose() {
      for (const w of wires.values()) w.mesh.geometry.dispose();
      geoCache.forEach((g) => g.dispose());
      disposables.forEach((d) => d.dispose());
    },
  };
}
