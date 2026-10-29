import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CONNECTIONS } from "./droneData";
import type { KitConnection, KitModel, KitPartNode, KitWire } from "./kit";
import { wireHex } from "./wiringStyle";

/* A detailed, procedural Drone Explorer Quad built from the project's actual hardware (src/data/projects.ts):
   carbon-fibre X frame with top plate and standoffs, four brushless motors, a matched CW/CCW propeller set, a 4-in-1
   ESC and a SpeedyBee F405 Mini stacked on silicone grommets, an ELRS receiver, a LiPo on a strap and an XT60 power
   lead with its capacitor. Units are centimetres; +x right, +y up, +z the front of the drone. Motor positions follow
   the pinout notes (M1 front right, M2 rear right, M3 rear left, M4 front left). Every part is its own group
   (installed pose + exploded offset) so it can be selected, isolated, highlighted and exploded; wires are rebuilt
   from named terminals so they stay attached while the parts move. */

type Node = KitPartNode & { anchors: THREE.Vector3[] };   // anchors: where its assembly guide lines start (local)

const MP = 7.8;                                  // motor centre offset on x and z (≈ 220 mm motor-to-motor diagonal)
const MOTORS: { id: string; n: number; sx: number; sz: number; cw: boolean }[] = [
  // propeller directions follow step 12: front-right and rear-left clockwise, front-left and rear-right counter-clockwise
  { id: "m1", n: 1, sx: 1, sz: 1, cw: true },
  { id: "m2", n: 2, sx: 1, sz: -1, cw: false },
  { id: "m3", n: 3, sx: -1, sz: -1, cw: true },
  { id: "m4", n: 4, sx: -1, sz: 1, cw: false },
];

export function buildDroneModel(): KitModel {
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };
  const geoCache = new Map<string, THREE.BufferGeometry>();
  const geo = (k: string, make: () => THREE.BufferGeometry) => { let g = geoCache.get(k); if (!g) { g = make(); geoCache.set(k, g); } return g; };
  const rbox = (w: number, h: number, d: number, r: number) => geo(`rb${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.999));
  const box = (w: number, h: number, d: number) => geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
  const cyl = (rt: number, rb: number, h: number, s = 24) => geo(`c${rt}|${rb}|${h}|${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
  const torus = (r: number, t: number) => geo(`t${r}|${t}`, () => new THREE.TorusGeometry(r, t, 10, 28));

  /* ---------- materials ---------- */
  const std = (p: THREE.MeshStandardMaterialParameters) => keep(new THREE.MeshStandardMaterial(p));
  // carbon fibre: a fine twill weave under a clear coat
  const weave = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#1a1c1f";
    g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const on = (x + y) % 2 === 0;
      const grd = on ? g.createLinearGradient(x * 16, y * 16, x * 16 + 16, y * 16) : g.createLinearGradient(x * 16, y * 16, x * 16, y * 16 + 16);
      grd.addColorStop(0, "#22252a"); grd.addColorStop(0.5, on ? "#3a3e45" : "#30343a"); grd.addColorStop(1, "#22252a");
      g.fillStyle = grd;
      g.fillRect(x * 16 + 1, y * 16 + 1, 14, 14);
    }
    const t = keep(new THREE.CanvasTexture(c));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(0.55, 0.55);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  })();
  const M = {
    carbon: keep(new THREE.MeshPhysicalMaterial({ map: weave, color: 0xffffff, roughness: 0.42, metalness: 0.15, clearcoat: 0.9, clearcoatRoughness: 0.25 })),
    carbonEdge: std({ color: 0x15171a, roughness: 0.6 }),
    standoff: std({ color: 0x2c3036, roughness: 0.3, metalness: 0.9 }),
    accent: std({ color: 0xd2572c, roughness: 0.35, metalness: 0.6 }),       // anodised orange
    bell: std({ color: 0x1f2226, roughness: 0.3, metalness: 0.85 }),
    stator: std({ color: 0x5b6067, roughness: 0.35, metalness: 0.8 }),
    copper: std({ color: 0xb8692e, roughness: 0.3, metalness: 1 }),
    magnet: std({ color: 0x8c9198, roughness: 0.25, metalness: 1 }),
    steel: std({ color: 0xd9dde2, roughness: 0.18, metalness: 1 }),
    screw: std({ color: 0xb8bcc2, roughness: 0.3, metalness: 1 }),
    prop: keep(new THREE.MeshPhysicalMaterial({ color: 0x2a2d32, roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.94, clearcoat: 0.6 })),
    propHub: std({ color: 0x1b1d20, roughness: 0.4 }),
    nylon: std({ color: 0x1b1d21, roughness: 0.55 }),
    grommet: std({ color: 0xe8742f, roughness: 0.7 }),
    chip: std({ color: 0x141619, roughness: 0.45 }),
    mosfet: std({ color: 0x1d2024, roughness: 0.4, metalness: 0.2 }),
    gold: std({ color: 0xe3bd5f, roughness: 0.25, metalness: 1 }),
    jst: std({ color: 0xf1ede4, roughness: 0.5 }),
    usb: std({ color: 0xbfc3c9, roughness: 0.25, metalness: 1 }),
    heatshrink: keep(new THREE.MeshPhysicalMaterial({ color: 0x3f7fd1, roughness: 0.3, transparent: true, opacity: 0.55, clearcoat: 0.8, depthWrite: false })),
    coax: std({ color: 0x1a1b1e, roughness: 0.5 }),
    antennaTip: std({ color: 0xf2f0ea, roughness: 0.5 }),
    xt60: std({ color: 0xf2c230, roughness: 0.45 }),
    capWrap: std({ color: 0x1f2d4a, roughness: 0.4 }),
    capTop: std({ color: 0xb9bdc4, roughness: 0.25, metalness: 1 }),
    strap: std({ color: 0x1c1d20, roughness: 0.85 }),
    ledBlue: std({ color: 0x0f2c5a, emissive: 0x3c8cff, emissiveIntensity: 0.9, roughness: 0.3 }),
    ledGreen: std({ color: 0x0f5a2c, emissive: 0x3ce07a, emissiveIntensity: 0.9, roughness: 0.3 }),
  };

  /* printed circuit boards: the top face carries silkscreen drawn on a canvas */
  function pcbTexture(w: number, h: number, base: string, draw: (g: CanvasRenderingContext2D, W: number, H: number) => void) {
    const W = 1024, H = Math.round((1024 * h) / w);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.14;
    g.strokeStyle = "#ffffff";
    g.lineWidth = 3;
    for (let i = 0; i < 22; i++) {
      g.beginPath();
      const y = (i * 41) % H, x = (i * 97) % W;
      g.moveTo(x, y); g.lineTo(x + 110, y); g.lineTo(x + 160, y + 50); g.lineTo(x + 300, y + 50);
      g.stroke();
    }
    g.globalAlpha = 1;
    draw(g, W, H);
    const t = keep(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  const pcbMaterials = (tex: THREE.Texture, edge: number) => {
    const side = std({ color: edge, roughness: 0.6 });
    const top = std({ map: tex, roughness: 0.55, metalness: 0.05 });
    return [side, side, top, side, side, side];
  };
  const plateGeo = (shape: THREE.Shape, t: number) => {
    const g = keep(new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 16 }));
    g.rotateX(Math.PI / 2);
    g.translate(0, t, 0);
    return g;
  };
  const roundRect = (s: THREE.Shape | THREE.Path, x0: number, z0: number, x1: number, z1: number, r: number) => {
    s.moveTo(x0 + r, z0);
    s.lineTo(x1 - r, z0); s.quadraticCurveTo(x1, z0, x1, z0 + r);
    s.lineTo(x1, z1 - r); s.quadraticCurveTo(x1, z1, x1 - r, z1);
    s.lineTo(x0 + r, z1); s.quadraticCurveTo(x0, z1, x0, z1 - r);
    s.lineTo(x0, z0 + r); s.quadraticCurveTo(x0, z0, x0 + r, z0);
    return s;
  };
  const hole = (s: THREE.Shape, x: number, z: number, r = 0.16) => { const h = new THREE.Path(); h.absarc(x, z, r, 0, Math.PI * 2, true); s.holes.push(h); };
  const slot = (s: THREE.Shape, x0: number, z0: number, x1: number, z1: number, r: number) => s.holes.push(roundRect(new THREE.Path(), x0, z0, x1, z1, r) as THREE.Path);

  const root = new THREE.Group();
  const parts = new Map<string, Node>();
  const terminals = new Map<string, { part: string; local: THREE.Vector3 }>();
  const part = (id: string, home: THREE.Vector3, away: THREE.Vector3, anchors: THREE.Vector3[] = [new THREE.Vector3()]) => {
    const g = new THREE.Group();
    g.name = id;
    g.position.copy(home);
    root.add(g);
    const node: Node = { id, group: g, home: home.clone(), homeQ: g.quaternion.clone(), away, meshes: [], anchors };
    parts.set(id, node);
    return node;
  };
  const add = (node: Node, g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0, parent?: THREE.Object3D) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.part = node.id;
    (parent ?? node.group).add(mesh);
    node.meshes.push(mesh);
    return mesh;
  };
  const term = (t: string, p: string, x: number, y: number, z: number) => terminals.set(t, { part: p, local: new THREE.Vector3(x, y, z) });
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  /* ---------- heights (cm) ---------- */
  const BOT = { y: 0.2, t: 0.2 };            // bottom plate
  const ARM = { y: 0.4, t: 0.5 };            // arms, clamped on the bottom plate
  const PRESS = { y: 0.4, t: 0.53 };         // centre clamp plate over the arm roots (stack sits on it)
  const STACK = 0.93;                        // top of the clamp plate
  const ESC_Y = STACK + 0.3, FC_Y = ESC_Y + 0.16 + 0.75;
  const TOP = { y: 3.6, t: 0.22 };           // top plate
  const TOP_Y = TOP.y + TOP.t;
  const HOLE = 1.525;                        // 30.5 × 30.5 mm stack pattern
  const STANDOFFS: [number, number][] = [[-2.2, 4.4], [2.2, 4.4], [-2.2, -4.4], [2.2, -4.4]];

  /* ---------- carbon frame: bottom plate, four arms, centre clamp plate ---------- */
  {
    const n = part("frame", V(0, 0, 0), V(0, 0, 0));
    const base = roundRect(new THREE.Shape(), -2.9, -6.0, 2.9, 6.0, 1.2) as THREE.Shape;
    for (const [x, z] of STANDOFFS) hole(base, x, z);
    slot(base, -1.6, 3.0, 1.6, 4.0, 0.4); slot(base, -1.6, -4.0, 1.6, -3.0, 0.4);
    slot(base, -0.9, -5.4, 0.9, -4.9, 0.25);               // strap / lead slot at the back
    const bottom = add(n, plateGeo(base, BOT.t), M.carbon, 0, BOT.y, 0);
    bottom.receiveShadow = true;
    // arms: drawn along +x from the centre, then turned onto each diagonal
    const R = MP * Math.SQRT2;
    const armShape = new THREE.Shape();
    armShape.moveTo(0.9, -1.0);
    armShape.lineTo(R - 1.4, -0.82);
    armShape.absarc(R, 0, 1.6, -Math.PI * 0.62, Math.PI * 0.62, false);
    armShape.lineTo(0.9, 1.0);
    armShape.lineTo(0.9, -1.0);
    slot(armShape, 3.2, -0.32, 5.6, 0.32, 0.3);
    slot(armShape, 6.4, -0.28, 8.2, 0.28, 0.26);
    hole(armShape, R, 0, 0.42);                             // motor shaft clearance
    for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i * Math.PI) / 2; hole(armShape, R + Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.14); }
    const armGeo = plateGeo(armShape, ARM.t);
    for (const m of MOTORS) {
      const a = add(n, armGeo, M.carbon, 0, ARM.y, 0);
      a.rotation.y = Math.atan2(-m.sz, m.sx);
    }
    const press = roundRect(new THREE.Shape(), -2.5, -2.5, 2.5, 2.5, 0.9) as THREE.Shape;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) hole(press, sx * HOLE, sz * HOLE);
    hole(press, 0, 0, 0.7);
    add(n, plateGeo(press, PRESS.t), M.carbon, 0, PRESS.y, 0);
  }

  /* ---------- top plate on four standoffs, with the battery strap ---------- */
  const strapBuckle = new THREE.Group();
  {
    const n = part("topPlate", V(0, TOP.y, 0), V(0, 10.5, 0));
    const s = roundRect(new THREE.Shape(), -2.75, -5.75, 2.75, 5.75, 1.1) as THREE.Shape;
    for (const [x, z] of STANDOFFS) hole(s, x, z);
    slot(s, -1.9, 1.2, -1.4, 2.4, 0.2); slot(s, 1.4, 1.2, 1.9, 2.4, 0.2);   // strap slots
    slot(s, -1.0, -3.4, 1.0, -0.6, 0.5); slot(s, -1.0, 2.9, 1.0, 4.6, 0.5);
    add(n, plateGeo(s, TOP.t), M.carbon, 0, 0, 0);
    for (const [x, z] of STANDOFFS) {
      add(n, cyl(0.24, 0.24, TOP.y - BOT.y - BOT.t, 6), M.standoff, x, -(TOP.y - BOT.y - BOT.t) / 2, z);
      add(n, cyl(0.27, 0.27, 0.12, 6), M.accent, x, TOP.t + 0.06, z);         // screw heads on top
    }
    // the battery strap: through the plate's slots, over the battery (3.5 wide × 3.2 tall), buckle on top
    const H = 3.25, W = 1.86;
    for (const sx of [-1, 1]) add(n, box(0.08, H + TOP.t, 1.1), M.strap, sx * W, (H + TOP.t) / 2, 1.8);
    add(n, box(W * 2 + 0.08, 0.08, 1.1), M.strap, 0, TOP.t + H, 1.8);
    add(n, box(W * 2 + 0.08, 0.08, 1.1), M.strap, 0, -0.04, 1.8);
    strapBuckle.position.set(0.6, TOP.t + H + 0.1, 1.8);
    n.group.add(strapBuckle);
    add(n, rbox(1.0, 0.16, 1.2, 0.05), M.accent, 0, 0, 0, strapBuckle);
  }

  /* ---------- brushless motors on the arm tips ---------- */
  for (const m of MOTORS) {
    const out = V(m.sx, 0, m.sz).normalize();
    const n = part(m.id, V(m.sx * MP, ARM.y + ARM.t, m.sz * MP), V(out.x * 3.4, 1.4, out.z * 3.4));
    add(n, cyl(1.4, 1.4, 0.28, 32), M.bell, 0, 0.14, 0);                  // base
    add(n, cyl(1.02, 1.02, 0.5, 28), M.stator, 0, 0.5, 0);                // stator core
    for (let i = 0; i < 12; i++) {                                         // copper windings, visible under the bell
      const a = (i / 12) * Math.PI * 2;
      const w = add(n, rbox(0.34, 0.5, 0.26, 0.08), M.copper, Math.cos(a) * 0.95, 0.52, Math.sin(a) * 0.95);
      w.rotation.y = -a;
    }
    add(n, geo("bell", () => new THREE.CylinderGeometry(1.42, 1.42, 1.05, 40, 1, true)), M.bell, 0, 1.22, 0);
    add(n, cyl(1.42, 1.42, 0.12, 40), M.bell, 0, 1.78, 0);               // bell top
    add(n, geo("bellRing", () => new THREE.CylinderGeometry(1.44, 1.44, 0.16, 40, 1, true)), M.accent, 0, 0.8, 0);
    for (let i = 0; i < 6; i++) {                                          // vents in the bell top
      const a = (i / 6) * Math.PI * 2 + 0.3;
      add(n, cyl(0.22, 0.22, 0.02, 12), M.chip, Math.cos(a) * 0.85, 1.85, Math.sin(a) * 0.85);
    }
    add(n, cyl(0.42, 0.42, 0.22, 20), M.magnet, 0, 1.94, 0);              // shaft collar
    add(n, cyl(0.25, 0.25, 0.9, 16), M.steel, 0, 2.3, 0);                 // threaded shaft (the propeller goes here)
    // the three motor wires leave the base on the inner side, toward the stack
    term(`${m.id}.w`, m.id, -out.x * 1.15, 0.2, -out.z * 1.15);
  }

  /* ---------- propellers: one matched CW/CCW set ---------- */
  {
    const anchors = MOTORS.map((m) => V(m.sx * MP, 0, m.sz * MP));
    const n = part("props", V(0, ARM.y + ARM.t + 2.45, 0), V(0, 6.5, 0), anchors);
    const blade = (() => {
      const s = new THREE.Shape();
      s.moveTo(0.35, -0.42);
      s.bezierCurveTo(2.2, -0.95, 4.6, -0.75, 6.2, -0.22);
      s.quadraticCurveTo(6.45, 0.02, 6.2, 0.2);
      s.bezierCurveTo(4.6, 0.55, 2.2, 0.62, 0.35, 0.36);
      s.lineTo(0.35, -0.42);
      const g = keep(new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 1, curveSegments: 18 }));
      g.rotateX(Math.PI / 2);
      return g;
    })();
    for (const m of MOTORS) {
      const hub = new THREE.Group();
      hub.position.set(m.sx * MP, 0, m.sz * MP);
      hub.rotation.y = m.n * 0.9;
      n.group.add(hub);
      add(n, cyl(0.55, 0.62, 0.42, 24), M.propHub, 0, 0, 0, hub);
      add(n, cyl(0.38, 0.38, 0.28, 6), m.cw ? M.accent : M.screw, 0, 0.34, 0, hub);   // locknut
      for (const side of [0, 1]) {
        const b = add(n, blade, M.prop, 0, 0, 0, hub);
        b.rotation.order = "YXZ";                                          // pitch the blade first, then turn it round the hub
        b.rotation.set((m.cw ? 1 : -1) * 0.2, side * Math.PI, 0);          // pitch mirrored for CW and CCW
      }
    }
  }

  /* ---------- 4-in-1 ESC: black board, MOSFETs per motor, corner pads, power pads, harness socket ---------- */
  const escHome = V(0, ESC_Y, 0);
  {
    const n = part("esc", escHome, V(0, 3.0, 0), [V(0, 0, 0)]);
    const S = 3.8;
    const tex = pcbTexture(S, S, "#16181b", (g, W, Hh) => {
      g.fillStyle = "#e9e6df";
      g.textAlign = "center";
      g.font = `bold ${Hh * 0.075}px sans-serif`;
      g.fillText("4IN1 ESC", W * 0.5, Hh * 0.56);
      // the canvas top is the board's back edge and its left the board's left
      g.font = `bold ${Hh * 0.06}px sans-serif`;
      g.fillText("M3", W * 0.12, Hh * 0.08); g.fillText("M2", W * 0.88, Hh * 0.08);
      g.fillText("M4", W * 0.12, Hh * 0.97); g.fillText("M1", W * 0.88, Hh * 0.97);
      g.fillText("+", W * 0.63, Hh * 0.2); g.fillText("−", W * 0.37, Hh * 0.2);
      g.font = `${Hh * 0.045}px sans-serif`;
      g.save(); g.translate(W * 0.2, Hh * 0.5); g.rotate(-Math.PI / 2); g.fillText("S1 S2 S3 S4 VBAT", 0, 0); g.restore();
    });
    add(n, box(S, 0.16, S), pcbMaterials(tex, 0x0c0d0f), 0, 0.08, 0);
    for (const m of MOTORS) {
      const cx = m.sx * 0.95, cz = m.sz * 0.85;
      for (let i = 0; i < 3; i++) add(n, box(0.42, 0.12, 0.34), M.mosfet, cx, 0.22, cz + (i - 1) * 0.4);
      for (let i = 0; i < 3; i++) add(n, box(0.3, 0.05, 0.22), M.gold, m.sx * 1.62, 0.18, m.sz * (1.05 + i * 0.28));   // three motor pads
      term(`esc.m${m.n}`, "esc", m.sx * 1.62, 0.22, m.sz * 1.33);
    }
    add(n, box(0.7, 0.18, 0.7), M.chip, 0, 0.25, 0);                      // MCU
    for (const sx of [-1, 1]) add(n, box(0.75, 0.05, 0.5), M.gold, sx * 0.5, 0.18, -1.6);   // main power pads
    term("esc.bat+", "esc", 0.5, 0.22, -1.6);
    term("esc.bat-", "esc", -0.5, 0.22, -1.6);
    // harness socket on the left edge: S1–S4 and VBAT (step 6)
    add(n, box(0.42, 0.34, 1.45), M.jst, -1.62, 0.33, 0.2);
    ["esc.s1", "esc.s2", "esc.s3", "esc.s4", "esc.vbat"].forEach((t, i) => term(t, "esc", -1.86, 0.36, -0.3 + i * 0.25));
  }

  /* ---------- SpeedyBee F405 Mini: arrow forward, USB-C on the side, UART pads at the back ---------- */
  const usbPort = new THREE.Group(), arrow = new THREE.Group();
  {
    const n = part("fc", V(0, FC_Y, 0), V(0, 6.2, 0));
    const S = 3.6;
    const tex = pcbTexture(S, S, "#121417", (g, W, Hh) => {
      g.fillStyle = "#f2efe8";
      g.textAlign = "center";
      g.font = `bold ${Hh * 0.075}px sans-serif`;
      // the canvas top is the board's back edge: UART pads there, the forward arrow at the bottom (step 4)
      g.font = `bold ${Hh * 0.05}px sans-serif`;
      [["T1", 0.33], ["R1", 0.44], ["5V", 0.56], ["G", 0.67]].forEach(([t, x]) => g.fillText(String(t), W * Number(x), Hh * 0.17));
      g.font = `bold ${Hh * 0.075}px sans-serif`;
      g.fillText("SpeedyBee", W * 0.5, Hh * 0.42);
      g.font = `bold ${Hh * 0.06}px sans-serif`;
      g.fillText("F405 MINI", W * 0.5, Hh * 0.51);
      g.font = `bold ${Hh * 0.05}px sans-serif`;
      g.fillText("FRONT", W * 0.5, Hh * 0.8);
      g.beginPath(); g.moveTo(W * 0.5, Hh * 0.95); g.lineTo(W * 0.43, Hh * 0.84); g.lineTo(W * 0.57, Hh * 0.84); g.closePath(); g.fill();
    });
    add(n, box(S, 0.16, S), pcbMaterials(tex, 0x0a0b0d), 0, 0.08, 0);
    add(n, box(0.9, 0.14, 0.9), M.chip, 0, 0.23, -0.15);                    // STM32F405
    add(n, box(0.32, 0.1, 0.32), M.chip, -0.85, 0.21, 0.55);               // IMU
    add(n, box(0.12, 0.06, 0.08), M.ledBlue, 0.9, 0.19, 0.95);
    add(n, box(0.12, 0.06, 0.08), M.ledGreen, 1.1, 0.19, 0.95);
    arrow.position.set(0, 0.2, 1.35);
    n.group.add(arrow);
    const usb = add(n, rbox(0.42, 0.26, 0.9, 0.08), M.usb, 1.68, 0.3, 0.15);
    usbPort.position.copy(usb.position);
    n.group.add(usbPort);
    // harness socket underneath on the left edge, over the ESC's
    add(n, box(0.4, 0.3, 1.45), M.jst, -1.45, -0.15, 0.2);
    ["fc.s1", "fc.s2", "fc.s3", "fc.s4", "fc.vbat"].forEach((t, i) => term(t, "fc", -1.7, -0.15, -0.3 + i * 0.25));
    // UART1 / power pads along the back edge (step 7)
    const pads: [string, number][] = [["fc.tx1", -0.6], ["fc.rx1", -0.2], ["fc.5v", 0.2], ["fc.gnd", 0.6]];
    for (const [t, x] of pads) { add(n, box(0.26, 0.04, 0.3), M.gold, x, 0.18, -1.55); term(t, "fc", x, 0.22, -1.55); }
  }

  /* ---------- hardware: stack screws, silicone grommets, nylon spacers and nuts ---------- */
  {
    const anchors = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => V(sx * HOLE, 0, sz * HOLE)));
    const n = part("hardware", V(0, 0, 0), V(0, 9.2, 0), anchors);
    for (const [x, z] of anchors.map((a) => [a.x, a.z])) {
      add(n, cyl(0.14, 0.14, FC_Y + 0.5 - 0.1, 12), M.screw, x, (FC_Y + 0.5 + 0.1) / 2, z);       // M3 screw, up from below
      add(n, cyl(0.28, 0.28, 0.12, 16), M.screw, x, 0.12, z);                                    // its head under the frame
      add(n, cyl(0.24, 0.24, ESC_Y - STACK, 16), M.nylon, x, (STACK + ESC_Y) / 2, z);            // spacer under the ESC
      add(n, torus(0.22, 0.09), M.grommet, x, ESC_Y + 0.08, z).rotation.x = Math.PI / 2;        // grommet in the ESC
      add(n, cyl(0.24, 0.24, FC_Y - ESC_Y - 0.16, 16), M.nylon, x, (ESC_Y + 0.16 + FC_Y) / 2, z); // spacer between boards
      add(n, torus(0.22, 0.09), M.grommet, x, FC_Y + 0.08, z).rotation.x = Math.PI / 2;         // grommet in the FC
      add(n, cyl(0.3, 0.3, 0.22, 6), M.nylon, x, FC_Y + 0.29, z);                                // nylon locknut
    }
  }

  /* ---------- ELRS receiver in heat-shrink, antenna tied to a rear standoff ---------- */
  const antennaTip = new THREE.Group();
  {
    const home = V(-1.1, BOT.y + BOT.t, -3.6);
    const n = part("receiver", home, V(-5.5, 2.2, -6.5));
    add(n, box(0.95, 0.12, 1.7), pcbMaterials(pcbTexture(0.95, 1.7, "#1c3d6b", (g, W, Hh) => { g.fillStyle = "#e8eef8"; g.font = `bold ${W * 0.16}px sans-serif`; g.textAlign = "center"; g.fillText("ELRS", W / 2, Hh * 0.5); }), 0x13294a), 0, 0.12, 0);
    add(n, box(0.45, 0.12, 0.45), M.chip, 0, 0.24, 0.2);
    add(n, box(0.12, 0.06, 0.1), M.ledGreen, 0.3, 0.21, -0.5);
    const shrink = add(n, rbox(1.1, 0.42, 1.95, 0.12), M.heatshrink, 0, 0.18, 0);
    shrink.castShadow = false;
    (["rx.tx", "rx.rx", "rx.5v", "rx.gnd"] as const).forEach((t, i) => term(t, "receiver", -0.33 + i * 0.22, 0.3, 0.92));
    // antenna: coax up the rear-left standoff and out past the back of the frame, then a T of two whiskers angled
    // up and back, clear of the propellers
    const tie = V(-2.2, 2.2, -4.4).sub(home), j = V(-2.2, 3.0, -6.4).sub(home);
    const coax = new THREE.CatmullRomCurve3([V(0, 0.2, -0.9), V(-0.6, 0.5, -1.0), tie.clone().add(V(0.25, 0, 0)), V(-2.1, 3.0, -5.4).sub(home), j]);
    add(n, keep(new THREE.TubeGeometry(coax, 40, 0.07, 8, false)), M.coax);
    const up = V(0, 1, 0);
    for (const sx of [-1, 1]) {
      const end = j.clone().add(V(sx * 1.6, 1.4, -0.9));
      add(n, keep(new THREE.TubeGeometry(new THREE.LineCurve3(j, end), 2, 0.07, 8, false)), M.coax);
      add(n, cyl(0.1, 0.1, 0.5, 10), M.antennaTip, end.x, end.y, end.z).quaternion.setFromUnitVectors(up, end.clone().sub(j).normalize());
    }
    antennaTip.position.copy(j).add(V(0, 0.4, -0.2));
    n.group.add(antennaTip);
    add(n, torus(0.3, 0.05), M.nylon, tie.x, tie.y, tie.z).rotation.x = Math.PI / 2;   // zip-tie on the standoff
  }

  /* ---------- LiPo battery on the top plate ---------- */
  {
    const n = part("battery", V(0, TOP_Y, 0.3), V(0, 7.5, -12));
    const tex = (() => {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 1024;
      const g = c.getContext("2d")!;
      g.fillStyle = "#24272c"; g.fillRect(0, 0, 512, 1024);
      g.fillStyle = "#d2572c"; g.fillRect(0, 380, 512, 150);
      g.fillStyle = "#ffffff"; g.textAlign = "center";
      g.font = "bold 120px sans-serif"; g.fillText("LiPo", 256, 500);
      g.font = "bold 44px sans-serif"; g.fillText("HIGH DISCHARGE", 256, 640);
      g.font = "34px sans-serif"; g.fillText("match cells to ESC & motors", 256, 700);
      const t = keep(new THREE.CanvasTexture(c));
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const side = std({ color: 0x24272c, roughness: 0.45, metalness: 0.1 });
    const top = std({ map: tex, roughness: 0.45 });
    add(n, rbox(3.5, 3.2, 7.4, 0.35), [side, side, top, side, side, side], 0, 1.6, 0);
    // balance lead (white plug) at the back
    add(n, box(0.9, 0.3, 0.35), M.jst, -0.9, 0.6, -3.95);
    term("lipo.lead", "battery", 0.6, 0.6, -3.75);
  }

  /* ---------- power lead: XT60 socket hanging out the back, capacitor across the ESC power pads ---------- */
  const capacitor = new THREE.Group(), xt60 = new THREE.Group();
  {
    const home = V(0.4, 1.9, -7.4);
    const n = part("powerLead", home, V(4.5, 0, -5.5));
    n.group.add(xt60);
    add(n, rbox(1.55, 0.8, 1.6, 0.12), M.xt60, 0, 0, 0, xt60);
    for (const sx of [-1, 1]) add(n, cyl(0.2, 0.2, 0.3, 12), M.gold, sx * 0.35, 0, -0.85, xt60).rotation.x = Math.PI / 2;
    term("lead.pos", "powerLead", 0.35, 0, 0.8);
    term("lead.neg", "powerLead", -0.35, 0, 0.8);
    term("lead.xt", "powerLead", 0, 0, -0.85);
    // the low-ESR capacitor, lying behind the stack with its legs on the + and − pads
    const capAt = V(-0.55, ESC_Y + 0.55, -3.0).sub(home);
    capacitor.position.copy(capAt);
    n.group.add(capacitor);
    add(n, cyl(0.42, 0.42, 1.5, 24), M.capWrap, 0, 0, 0, capacitor).rotation.z = Math.PI / 2;
    add(n, cyl(0.43, 0.43, 0.06, 24), M.capTop, 0.76, 0, 0, capacitor).rotation.z = Math.PI / 2;
    for (const sx of [-1, 1]) {
      const a = capAt.clone().add(V(sx * 0.25, -0.3, 0.2)), b = V(sx * 0.5, ESC_Y + 0.2, -1.6).sub(home);
      add(n, keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, a.clone().add(V(0, -0.15, 0.25)), b]), 12, 0.035, 6, false)), M.capTop);
    }
  }

  /* ---------- wires: rebuilt from the terminals, so they follow the parts in the exploded view ---------- */
  const wires = new Map<string, KitWire>();
  const wiresNode = part("wires", V(0, 0, 0), V(0, 0, 0));
  const plugGeo = box(0.22, 0.3, 0.22);
  const strandsOf = (c: KitConnection) => (c.kind === "Motor" ? [c.color, c.color, c.color] : c.id === "c-batt" ? ["Red", "Black"] : [c.color]);
  for (const conn of CONNECTIONS) {
    const mats = strandsOf(conn).map((col) => std({ color: wireHex(col), roughness: 0.45, emissive: 0x000000 }));
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mats.length > 1 ? mats : mats[0]);
    mesh.castShadow = true;
    mesh.userData.part = conn.jumper ? "wires" : conn.from.part;
    mesh.userData.conn = conn.id;
    wiresNode.group.add(mesh);
    if (conn.jumper) wiresNode.meshes.push(mesh);
    // harness wires end in a socket at both boards; the battery lead ends in the XT60 plug
    const plugs: THREE.Mesh[] = [];
    if (conn.id.startsWith("c-s") || conn.id === "c-vbat") for (let i = 0; i < 2; i++) { const p = new THREE.Mesh(plugGeo, M.jst); p.userData.part = "wires"; p.userData.conn = conn.id; wiresNode.group.add(p); wiresNode.meshes.push(p); plugs.push(p); }
    if (conn.id === "c-batt") { const p = new THREE.Mesh(rbox(1.5, 0.75, 1.0, 0.1), M.xt60); p.userData.part = "battery"; p.userData.conn = conn.id; p.castShadow = true; wiresNode.group.add(p); plugs.push(p); }
    wires.set(conn.id, { conn, mesh, plugs, mat: mats[0] });
  }

  const tA = new THREE.Vector3(), tB = new THREE.Vector3();
  let explodeK = 0;
  function terminalWorld(t: string, out: THREE.Vector3) {
    const d = terminals.get(t)!;
    const g = parts.get(d.part)!.group;
    g.updateWorldMatrix(true, false);
    return out.copy(d.local).applyMatrix4(g.matrixWorld);
  }
  /* assembled routes: motor wires along the top of their arm, harness wires out round the stack's left edge,
     receiver wires up behind the stack, the power lead under the top plate and out the back */
  const via = (c: KitConnection, a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3[] | null => {
    if (c.kind === "Motor") {
      const y = ARM.y + ARM.t + 0.12;
      return [a.clone().lerp(b, 0.25).setY(y), a.clone().lerp(b, 0.65).setY(y), b.clone().add(V(Math.sign(b.x) * 0.5, 0.15, Math.sign(b.z) * 0.5))];
    }
    if (c.id.startsWith("c-s") || c.id === "c-vbat") return [V(-2.25, a.y + 0.05, a.z), V(-2.3, (a.y + b.y) / 2, a.z), V(-2.0, b.y - 0.05, b.z)];
    if (c.from.part === "receiver") return [V(a.x, a.y + 0.2, a.z + 0.5), V(b.x * 0.8, FC_Y - 0.2, -2.3), V(b.x, b.y + 0.35, b.z - 0.3)];
    if (c.from.part === "powerLead") return [V(a.x, a.y + 0.1, a.z + 1.2), V(a.x * 0.8, ESC_Y + 0.5, -4.4), V(b.x, b.y + 0.45, b.z - 0.7)];
    if (c.id === "c-batt") return [V(a.x, a.y - 0.1, a.z - 0.8), V(a.x, TOP_Y + 0.25, -5.9), V(0.4, 2.4, -9.6)];
    return null;
  };

  function updateWires() {
    root.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    for (const w of wires.values()) {
      terminalWorld(w.conn.from.terminal, tA).applyMatrix4(inv);
      terminalWorld(w.conn.to.terminal, tB).applyMatrix4(inv);
      const path = explodeK < 0.02 ? via(w.conn, tA, tB) : null;
      const pts = [tA.clone()];
      if (path) pts.push(...path);
      else {
        const span = tA.distanceTo(tB);
        const lift = Math.max(tA.y, tB.y) + Math.min(2.4, 0.5 + span * 0.15);
        pts.push(tA.clone().add(V(0, 0.4, 0)), tA.clone().lerp(tB, 0.5).setY(lift), tB.clone().add(V(0, 0.4, 0)));
      }
      pts.push(tB.clone());
      const n = strandsOf(w.conn).length;
      const r = w.conn.jumper ? 0.045 : w.conn.kind === "Motor" ? 0.055 : 0.1;
      // several strands side by side, across the run of the wire
      const side = V(tB.z - tA.z, 0, tA.x - tB.x).normalize().multiplyScalar(r * 2.3);
      const geos = Array.from({ length: n }, (_, i) => {
        const o = side.clone().multiplyScalar(i - (n - 1) / 2);
        const curve = new THREE.CatmullRomCurve3(pts.map((p) => p.clone().add(o)), false, "centripetal", 0.5);
        return new THREE.TubeGeometry(curve, 48, r, 7, false);
      });
      w.mesh.geometry.dispose();
      w.mesh.geometry = n > 1 ? mergeGeometries(geos, true)! : geos[0];
      if (n > 1) geos.forEach((g) => g.dispose());
      if (w.conn.id === "c-batt") {
        w.plugs[0].position.copy(tB).add(V(0, 0, -0.5));
      } else if (w.plugs.length) {
        w.plugs[0].position.copy(tA).add(V(-0.1, 0, 0));
        w.plugs[1].position.copy(tB).add(V(-0.1, 0, 0));
      }
    }
  }

  /* assembly axes: dashed lines from each mounting point to where the part sits in the exploded view */
  const guideMat = keep(new THREE.LineDashedMaterial({ color: 0x7d838b, dashSize: 0.32, gapSize: 0.24, transparent: true, opacity: 0.8 }));
  const guides: { node: Node; anchor: THREE.Vector3; line: THREE.Line }[] = [];
  for (const n of parts.values()) {
    if (n.away.length() < 0.1) continue;
    for (const anchor of n.anchors) {
      const p = n.home.clone().add(anchor);
      const line = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints([p, p])), guideMat);
      line.visible = false;
      root.add(line);
      guides.push({ node: n, anchor, line });
    }
  }

  /* exploded ↔ assembled: every part moves out along its own offset and back to its exact installed pose. Parts
     leave one after another (top and outer parts first, the frame last) and return in reverse. */
  const spread = new THREE.Vector3(1, 1, 1);
  const tmpAway = new THREE.Vector3(), pa = new THREE.Vector3(), pb = new THREE.Vector3();
  const ORDER = ["props", "battery", "topPlate", "receiver", "hardware", "fc", "powerLead", "esc", "wires", "m1", "m2", "m3", "m4", "frame"];
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
    root, parts, wires,
    features: { arrow, usb: usbPort, antenna: antennaTip, capacitor, strap: strapBuckle, xt60 },
    setExplode, terminalWorld,
    setSpread(x: number, y: number, z: number) { spread.set(x, y, z); setExplode(explodeK); },
    dispose() {
      for (const w of wires.values()) w.mesh.geometry.dispose();
      geoCache.forEach((g) => g.dispose());
      disposables.forEach((d) => d.dispose());
    },
  };
}
