import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CONNECTIONS, wireHex } from "./lineFollowerData";
import type { Connection, PartId, Terminal } from "./lineFollowerData";

/* A detailed, procedural Line Follower built from the project's actual hardware (src/data/projects.ts):
   Arduino Uno R3, L298N, TCRT5000 dual sensor, 2× TT gear motors, 65 mm wheels, steel ball caster, 2× 18650 holder
   with switch, acrylic chassis, M3 brass standoffs, DuPont jumpers. Units are centimetres; +x right, +y up, +z the
   front of the robot. Every part is its own group (installed pose + exploded pose) so it can be selected, isolated,
   highlighted and exploded; wires are rebuilt from named terminals so they stay attached while parts move. */

export interface PartNode {
  id: PartId;
  group: THREE.Group;
  home: THREE.Vector3;        // installed position
  homeQ: THREE.Quaternion;    // installed orientation
  away: THREE.Vector3;        // offset in the exploded view
  meshes: THREE.Mesh[];
}

export interface LineFollowerModel {
  root: THREE.Group;
  parts: Map<PartId, PartNode>;
  terminals: Map<Terminal, { part: PartId; local: THREE.Vector3 }>;
  wires: Map<string, { conn: Connection; mesh: THREE.Mesh; plugs: THREE.Mesh[]; mat: THREE.MeshStandardMaterial }>;
  track: THREE.Group;
  trimmers: THREE.Object3D[];
  usbPort: THREE.Object3D;
  slideSwitch: THREE.Object3D;
  features: Record<string, THREE.Object3D | undefined>;   // the details the workshop labels by name
  setExplode: (k: number) => void;
  setSpread: (x: number, y: number, z: number) => void;
  updateWires: () => void;
  terminalWorld: (t: Terminal, out: THREE.Vector3) => THREE.Vector3;
  dispose: () => void;
}

const PIN = 0.254; // 0.1" header pitch in cm

export function buildLineFollowerModel(): LineFollowerModel {
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };
  const geoCache = new Map<string, THREE.BufferGeometry>();
  const geo = (k: string, make: () => THREE.BufferGeometry) => { let g = geoCache.get(k); if (!g) { g = make(); geoCache.set(k, g); } return g; };
  const rbox = (w: number, h: number, d: number, r: number) => geo(`rb${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.999));
  const box = (w: number, h: number, d: number) => geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
  const cyl = (rt: number, rb: number, h: number, s = 24) => geo(`c${rt}|${rb}|${h}|${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));

  /* ---------- materials: real-world surfaces ---------- */
  const std = (p: THREE.MeshStandardMaterialParameters) => keep(new THREE.MeshStandardMaterial(p));
  const M = {
    acrylic: keep(new THREE.MeshPhysicalMaterial({ color: 0xe4f1f6, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.42, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide })),
    acrylicEdge: keep(new THREE.LineBasicMaterial({ color: 0x9fc4d3, transparent: true, opacity: 0.9 })),
    bracket: keep(new THREE.MeshPhysicalMaterial({ color: 0xeaf4f8, roughness: 0.1, transparent: true, opacity: 0.55, clearcoat: 1, depthWrite: false })),
    yellow: std({ color: 0xf2c230, roughness: 0.45 }),
    rimYellow: std({ color: 0xf5c518, roughness: 0.4 }),
    whitePlastic: std({ color: 0xf4f2ec, roughness: 0.5 }),
    motorCan: std({ color: 0xc6c9ce, roughness: 0.28, metalness: 1 }),
    copperTab: std({ color: 0xc98a4b, roughness: 0.35, metalness: 1 }),
    rubber: std({ color: 0x1c1e21, roughness: 0.92 }),
    steel: std({ color: 0xdfe3e8, roughness: 0.12, metalness: 1 }),
    darkMetal: std({ color: 0x3a3f46, roughness: 0.35, metalness: 0.8 }),
    brass: std({ color: 0xc9a043, roughness: 0.3, metalness: 1 }),
    screw: std({ color: 0xb8bcc2, roughness: 0.3, metalness: 1 }),
    headerBlack: std({ color: 0x17191c, roughness: 0.6 }),
    gold: std({ color: 0xe3bd5f, roughness: 0.25, metalness: 1 }),
    chip: std({ color: 0x141619, roughness: 0.45 }),
    heatsink: std({ color: 0x23262b, roughness: 0.4, metalness: 0.7 }),
    terminalGreen: std({ color: 0x2c8c55, roughness: 0.55 }),
    terminalBlue: std({ color: 0x2a5fb0, roughness: 0.55 }),
    capBlack: std({ color: 0x1e2024, roughness: 0.35 }),
    capTop: std({ color: 0xb9bdc4, roughness: 0.25, metalness: 1 }),
    ledRed: std({ color: 0x8a1c14, emissive: 0xff3b2b, emissiveIntensity: 0.9, roughness: 0.3 }),
    ledGreen: std({ color: 0x0f5a2c, emissive: 0x3ce07a, emissiveIntensity: 0.9, roughness: 0.3 }),
    irLed: std({ color: 0x3c4a8c, roughness: 0.2, transparent: true, opacity: 0.85 }),
    irRx: std({ color: 0x0c0d10, roughness: 0.15 }),
    trimmerBlue: std({ color: 0x2f62c9, roughness: 0.45 }),
    trimmerWhite: std({ color: 0xeeeeea, roughness: 0.4 }),
    holder: std({ color: 0x1a1c1f, roughness: 0.65 }),
    cellWrap: std({ color: 0x2b7bb9, roughness: 0.35, metalness: 0.15 }),
    cellTop: std({ color: 0xc9ccd1, roughness: 0.25, metalness: 1 }),
    switchBody: std({ color: 0x232528, roughness: 0.5 }),
    usbMetal: std({ color: 0xbfc3c9, roughness: 0.25, metalness: 1 }),
    jackBlack: std({ color: 0x141518, roughness: 0.5 }),
    tape: std({ color: 0x111214, roughness: 0.7 }),
    card: std({ color: 0xf7f5f0, roughness: 0.95 }),
    plugBlack: std({ color: 0x18191c, roughness: 0.5 }),
  };

  /* printed circuit boards: the top face carries silkscreen drawn on a canvas */
  function pcbTexture(w: number, h: number, base: string, draw: (g: CanvasRenderingContext2D, W: number, H: number) => void) {
    const W = 1024, H = Math.round((1024 * h) / w);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    // copper traces under the solder mask
    g.globalAlpha = 0.16;
    g.strokeStyle = "#ffffff";
    g.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      g.beginPath();
      const y = ((i * 37) % H), x = ((i * 91) % W);
      g.moveTo(x, y); g.lineTo(x + 120, y); g.lineTo(x + 170, y + 50); g.lineTo(x + 320, y + 50);
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

  const root = new THREE.Group();
  const parts = new Map<PartId, PartNode>();
  const terminals = new Map<Terminal, { part: PartId; local: THREE.Vector3 }>();
  const part = (id: PartId, home: THREE.Vector3, away: THREE.Vector3, rotY = 0) => {
    const g = new THREE.Group();
    g.name = id;
    g.position.copy(home);
    g.rotation.y = rotY;
    root.add(g);
    const node: PartNode = { id, group: g, home: home.clone(), homeQ: g.quaternion.clone(), away, meshes: [] };
    parts.set(id, node);
    return node;
  };
  const add = (node: PartNode, g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0, parent?: THREE.Object3D) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.part = node.id;
    (parent ?? node.group).add(mesh);
    node.meshes.push(mesh);
    return mesh;
  };
  const term = (t: Terminal, p: PartId, x: number, y: number, z: number) => terminals.set(t, { part: p, local: new THREE.Vector3(x, y, z) });

  /* ---------- layout (cm) ---------- */
  const PLATE = { w: 13, l: 20, t: 0.3, y: 4.45 };      // plate underside at y=4.45
  const TOP = PLATE.y + PLATE.t;                          // top surface
  const WHEEL_R = 3.25, AXLE_Y = WHEEL_R, AXLE_Z = -3.6;

  /* ---------- acrylic chassis plate, with mounting holes and slots ---------- */
  {
    const n = part("chassis", new THREE.Vector3(0, PLATE.y, 0), new THREE.Vector3(0, 0, 0));
    const s = new THREE.Shape();
    const hw = PLATE.w / 2, hl = PLATE.l / 2, r = 1.6;
    s.moveTo(-hw + r, -hl);
    s.lineTo(hw - r, -hl); s.quadraticCurveTo(hw, -hl, hw, -hl + r);
    s.lineTo(hw, hl - 3.2); s.quadraticCurveTo(hw, hl, hw - 3.4, hl);     // tapered nose
    s.lineTo(-hw + 3.4, hl); s.quadraticCurveTo(-hw, hl, -hw, hl - 3.2);
    s.lineTo(-hw, -hl + r); s.quadraticCurveTo(-hw, -hl, -hw + r, -hl);
    const hole = (x: number, z: number, rr = 0.16) => { const h = new THREE.Path(); h.absarc(x, z, rr, 0, Math.PI * 2, true); s.holes.push(h); };
    const slot = (x: number, z: number, w: number, l: number) => { const h = new THREE.Path(); h.moveTo(x - w / 2, z - l / 2); h.lineTo(x - w / 2, z + l / 2); h.lineTo(x + w / 2, z + l / 2); h.lineTo(x + w / 2, z - l / 2); h.lineTo(x - w / 2, z - l / 2); s.holes.push(h); };
    // Arduino Uno mounting pattern (approximate), driver, caster, sensor and motor bracket holes
    for (const [x, z] of [[-3.0, -0.9], [2.3, -0.9], [-3.0, 3.9], [2.85, 3.6]]) hole(x, z);
    for (const [x, z] of [[-1.85, -7.85], [1.85, -7.85], [-1.85, -4.15], [1.85, -4.15]]) hole(x, z);
    for (const x of [-0.95, 0.95]) hole(x, 7.2);
    for (const x of [-1.3, 1.3]) hole(x, 9.1);
    for (const sx of [-1, 1]) { slot(sx * 4.6, AXLE_Z + 1.2, 0.35, 1.6); slot(sx * 4.6, AXLE_Z - 1.2, 0.35, 1.6); }
    slot(0, -1.9, 3.2, 0.7);       // wiring pass-through (motor and battery leads)
    slot(0, 8.0, 2.2, 0.6);        // front pass-through (sensor wires)
    slot(-4.3, 1.6, 0.6, 2.2); slot(4.3, 1.6, 0.6, 2.2);
    const g = keep(new THREE.ExtrudeGeometry(s, { depth: PLATE.t, bevelEnabled: false, curveSegments: 18 }));
    g.rotateX(Math.PI / 2);
    g.translate(0, PLATE.t, 0);
    const plate = add(n, g, M.acrylic);
    plate.castShadow = false;
    const edges = new THREE.LineSegments(keep(new THREE.EdgesGeometry(g, 25)), M.acrylicEdge);
    edges.userData.part = "chassis";
    n.group.add(edges);
  }

  /* ---------- TT gear motors (yellow 1:48 gearbox + steel motor can) with clear brackets ---------- */
  const motor = (id: "motorL" | "motorR", sx: number) => {
    const n = part(id, new THREE.Vector3(sx * 3.6, AXLE_Y, AXLE_Z), new THREE.Vector3(sx * 4.2, -0.5, 0));
    // gearbox: 3.7 long along x (outer end has the shaft), 2.25 tall, 1.85 deep
    add(n, rbox(3.7, 2.25, 1.85, 0.12), M.yellow, sx * 0.6, 0.15, 0);
    add(n, box(0.5, 0.35, 0.9), M.yellow, sx * 0.6, 1.4, 0);                    // mounting tab
    for (const dz of [-0.6, 0.6]) add(n, cyl(0.18, 0.18, 1.9, 12), M.screw, sx * -0.55, 0.15, dz).rotation.set(Math.PI / 2, 0, 0); // long screws
    // steel motor can and its white end cap, pointing inward (the two motors almost meet at the centre)
    const can = add(n, cyl(1.0, 1.0, 1.9, 28), M.motorCan, sx * -2.2, 0.35, 0);
    can.rotation.z = Math.PI / 2;
    const cap = add(n, cyl(0.85, 0.85, 0.3, 24), M.whitePlastic, sx * -3.28, 0.35, 0);
    cap.rotation.z = Math.PI / 2;
    for (const dz of [-0.35, 0.35]) add(n, box(0.06, 0.45, 0.22), M.copperTab, sx * -3.45, 0.35, dz);
    // shaft: white, double-flat, pointing outward
    const shaft = add(n, cyl(0.27, 0.27, 2.0, 16), M.whitePlastic, sx * 2.9, 0, 0);
    shaft.rotation.z = Math.PI / 2;
    // motor lead terminals (wires leave the rear tabs)
    term(id === "motorL" ? "motL.a" : "motR.a", id, sx * -3.48, 0.6, -0.35);
    term(id === "motorL" ? "motL.b" : "motR.b", id, sx * -3.48, 0.6, 0.35);
  };
  motor("motorL", -1);
  motor("motorR", 1);
  {
    const n = part("brackets", new THREE.Vector3(0, PLATE.y, AXLE_Z), new THREE.Vector3(0, -0.6, 0));
    for (const sx of [-1, 1]) for (const dz of [-1.2, 1.2]) {
      const b = add(n, rbox(0.3, 2.6, 1.9, 0.08), M.bracket, sx * 4.6, -1.3, dz);
      b.castShadow = false;
      add(n, box(0.3, 0.3, 1.6), M.bracket, sx * 4.6, 0.15, dz).castShadow = false;
    }
  }

  /* ---------- 65 mm wheels: yellow spoked rim + treaded rubber tyre ---------- */
  const wheel = (id: "wheelL" | "wheelR", sx: number) => {
    const n = part(id, new THREE.Vector3(sx * 7.45, AXLE_Y, AXLE_Z), new THREE.Vector3(sx * 9.5, 0, 0));
    const spin = new THREE.Group();
    spin.rotation.z = Math.PI / 2;
    n.group.add(spin);
    const tyre = add(n, geo("tyre", () => new THREE.TorusGeometry(2.72, 0.55, 18, 64)), M.rubber, 0, 0, 0, spin);
    tyre.rotation.x = Math.PI / 2;
    tyre.scale.set(1, 1, 2.2);
    for (let i = 0; i < 40; i++) {           // tread blocks
      const a = (i / 40) * Math.PI * 2;
      const t = add(n, box(0.32, 2.3, 0.22), M.rubber, Math.cos(a) * 3.22, 0, Math.sin(a) * 3.22, spin);
      t.rotation.y = -a;
    }
    add(n, cyl(2.3, 2.3, 2.2, 40), M.rimYellow, 0, 0, 0, spin);
    add(n, cyl(0.62, 0.62, 2.4, 20), M.rimYellow, 0, 0, 0, spin);
    for (let i = 0; i < 6; i++) {             // spokes, recessed on the outer face
      const sp = add(n, box(0.34, 0.25, 1.75), M.whitePlastic, 0, sx * 1.05, 0, spin);
      sp.rotation.y = (i / 6) * Math.PI * 2;
      sp.translateZ(1.3);
    }
  };
  wheel("wheelL", -1);
  wheel("wheelR", 1);

  /* ---------- steel ball caster on brass standoffs ---------- */
  {
    const n = part("caster", new THREE.Vector3(0, 0, 7.2), new THREE.Vector3(0, 0, 4.2));
    add(n, sph(0.75), M.steel, 0, 0.75, 0);
    add(n, cyl(0.95, 0.75, 0.9, 28), M.darkMetal, 0, 1.25, 0);
    add(n, rbox(3.2, 0.22, 1.2, 0.1), M.darkMetal, 0, 1.75, 0);
    for (const x of [-0.95, 0.95]) {
      add(n, cyl(0.28, 0.28, 2.6, 6), M.brass, x, 3.15, 0);   // standoffs up to the plate
      add(n, cyl(0.3, 0.3, 0.18, 6), M.screw, x, 1.62, 0);
    }
  }

  /* ---------- TCRT5000 dual IR line sensor at the front nose, eyes down ---------- */
  const trimmers: THREE.Object3D[] = [];
  {
    const n = part("sensors", new THREE.Vector3(0, 1.75, 9.1), new THREE.Vector3(0, 0, 8.2));
    const tex = pcbTexture(4.2, 1.6, "#1f4fa8", (g, W, H) => {
      g.fillStyle = "#f2f4f8";
      g.font = `bold ${H * 0.16}px sans-serif`;
      g.textAlign = "center";
      g.fillText("TCRT5000  DUAL", W / 2, H * 0.24);
      g.font = `bold ${H * 0.13}px sans-serif`;
      ["VCC", "GND", "OUT1", "OUT2"].forEach((s, i) => g.fillText(s, W * (0.31 + i * 0.13), H * 0.92));
      g.fillText("L", W * 0.1, H * 0.6); g.fillText("R", W * 0.9, H * 0.6);
    });
    add(n, box(4.2, 0.16, 1.6), pcbMaterials(tex, 0x173d84), 0, 0, 0);
    for (const sx of [-1, 1]) {
      // sensor housings on the underside: an IR emitter (blue) and a phototransistor (black)
      const x = sx * 1.25;
      add(n, box(1.0, 0.65, 0.58), M.chip, x, -0.42, 0);
      add(n, cyl(0.2, 0.2, 0.2, 16), M.irLed, x - 0.22, -0.82, 0);
      add(n, cyl(0.2, 0.2, 0.2, 16), M.irRx, x + 0.22, -0.82, 0);
      // sensitivity trimmer (step 13) and indicator LEDs on top
      const tr = new THREE.Group();
      tr.position.set(sx * 0.55, 0.22, -0.2);
      n.group.add(tr);
      add(n, box(0.5, 0.3, 0.5), M.trimmerBlue, 0, 0, 0, tr);
      add(n, cyl(0.15, 0.15, 0.08, 12), M.trimmerWhite, 0, 0.18, 0, tr);
      trimmers.push(tr);
      add(n, box(0.16, 0.08, 0.1), M.ledRed, sx * 1.75, 0.12, -0.45);
      add(n, box(0.16, 0.08, 0.1), M.ledGreen, sx * 1.4, 0.12, -0.45);
    }
    // 4-pin header pointing up at the back edge
    add(n, box(4 * PIN + 0.1, 0.25, 0.26), M.headerBlack, 0.12, 0.2, 0.55);
    (["sen.vcc", "sen.gnd", "sen.out1", "sen.out2"] as Terminal[]).forEach((t, i) => {
      const x = 0.12 + (i - 1.5) * PIN;
      add(n, box(0.06, 0.62, 0.06), M.gold, x, 0.5, 0.55);
      term(t, "sensors", x, 0.8, 0.55);
    });
    // mounting standoffs up to the plate
    for (const x of [-1.3, 1.3]) add(n, cyl(0.28, 0.28, 2.55, 6), M.brass, x, 1.4, 0);
  }

  /* ---------- Arduino Uno R3: real header layout, USB-B pointing outward (right) ---------- */
  const usbPort = new THREE.Group();
  {
    const n = part("arduino", new THREE.Vector3(0, TOP + 1.0, 1.5), new THREE.Vector3(0, 4.6, 0.6));
    const L = 6.86, W = 5.34;
    // board x runs from the USB end (+x) to the far end; header pins sit along ±z edges
    const realX = (rx: number) => L / 2 - rx;            // distance from the USB edge → local x
    const tex = pcbTexture(L, W, "#0b6e99", (g, Wp, Hp) => {
      const s = Wp / L;
      g.fillStyle = "#e8f6fb";
      g.textAlign = "center";
      g.font = `bold ${Hp * 0.12}px sans-serif`;
      g.fillText("UNO", Wp * 0.5, Hp * 0.55);
      g.font = `${Hp * 0.055}px sans-serif`;
      g.fillText("ARDUINO", Wp * 0.5, Hp * 0.64);
      g.font = `bold ${Hp * 0.045}px sans-serif`;
      g.fillText("DIGITAL (PWM ~)", (L - 4.0) * s, Hp * 0.13);
      g.fillText("POWER", (L - 3.6) * s, Hp * 0.9);
      g.fillText("ANALOG IN", (L - 5.6) * s, Hp * 0.9);
      // pin names next to the headers that the robot uses
      const lbl = (txt: string, rx: number, top: boolean) => g.fillText(txt, (L - rx) * s, top ? Hp * 0.2 : Hp * 0.82);
      [["2", 5.72], ["~5", 4.96], ["4", 5.21], ["~6", 4.70], ["7", 4.45], ["8", 4.04], ["~9", 3.78], ["~10", 3.53], ["GND", 2.51]].forEach(([t, x]) => lbl(String(t), Number(x), true));
      [["5V", 3.62], ["GND", 3.87], ["VIN", 4.38]].forEach(([t, x]) => lbl(String(t), Number(x), false));
    });
    add(n, box(L, 0.16, W), pcbMaterials(tex, 0x07506f), 0, 0, 0);
    // USB-B socket and DC barrel jack on the +x edge
    const usb = add(n, rbox(1.6, 1.1, 1.2, 0.05), M.usbMetal, L / 2 - 0.45, 0.62, -1.4);
    usbPort.position.copy(usb.position);
    n.group.add(usbPort);
    add(n, box(1.35, 1.05, 0.9), M.jackBlack, L / 2 - 0.55, 0.6, 1.75);
    // ATmega328P DIP chip with legs, crystal, reset button, regulator
    add(n, box(3.55, 0.35, 0.75), M.chip, -0.6, 0.3, 0.6);
    for (let i = 0; i < 14; i++) for (const sz of [-1, 1]) add(n, box(0.05, 0.22, 0.12), M.screw, -0.6 - 1.65 + i * PIN, 0.18, 0.6 + sz * 0.42);
    add(n, rbox(0.9, 0.35, 0.35, 0.12), M.screw, 1.0, 0.25, -0.3);
    add(n, box(0.55, 0.3, 0.55), M.chip, 2.35, 0.24, -2.1);
    add(n, cyl(0.13, 0.13, 0.12, 12), M.ledRed, 2.35, 0.42, -2.1);
    add(n, box(0.6, 0.45, 0.45), M.chip, 1.7, 0.3, 1.5);
    for (const [x, z] of [[2.3, 0.2], [2.3, 0.6]]) add(n, cyl(0.28, 0.28, 0.6, 16), M.capBlack, x, 0.38, z);
    // headers: digital along the back edge (-z), power + analog along the front edge (+z)
    const header = (fromRx: number, count: number, z: number) => add(n, box(count * PIN, 0.85, 0.25), M.headerBlack, realX(fromRx + ((count - 1) * PIN) / 2), 0.5, z);
    header(1.75, 10, -W / 2 + 0.25);
    header(4.45, 8, -W / 2 + 0.25);
    header(2.6, 8, W / 2 - 0.25);
    header(4.9, 6, W / 2 - 0.25);
    const pinTerm = (t: Terminal, rx: number, z: number) => term(t, "arduino", realX(rx), 0.93, z);
    const back = -W / 2 + 0.25, front = W / 2 - 0.25;
    pinTerm("uno.d2", 5.72, back); pinTerm("uno.d4", 5.21, back); pinTerm("uno.d5", 4.96, back); pinTerm("uno.d6", 4.70, back);
    pinTerm("uno.d7", 4.45, back); pinTerm("uno.d8", 4.04, back); pinTerm("uno.d9", 3.78, back); pinTerm("uno.d10", 3.53, back);
    pinTerm("uno.gnd2", 2.51, back);
    pinTerm("uno.5v", 3.62, front); pinTerm("uno.gnd", 3.87, front);
  }

  /* ---------- L298N: red board, finned heatsink, screw terminals, logic header ---------- */
  {
    const n = part("driver", new THREE.Vector3(0, TOP + 0.6, -6.0), new THREE.Vector3(0, 4.2, -4.2));
    const S = 4.3;
    const tex = pcbTexture(S, S, "#b3241f", (g, Wp, Hp) => {
      g.fillStyle = "#fbeeee";
      g.textAlign = "center";
      g.font = `bold ${Hp * 0.075}px sans-serif`;
      g.fillText("L298N", Wp * 0.5, Hp * 0.14);
      g.font = `bold ${Hp * 0.055}px sans-serif`;
      g.fillText("OUT1 OUT2", Wp * 0.1, Hp * 0.5);
      g.fillText("OUT3 OUT4", Wp * 0.9, Hp * 0.5);
      g.fillText("+12V GND +5V", Wp * 0.3, Hp * 0.94);
      g.fillText("ENA IN1 IN2 IN3 IN4 ENB", Wp * 0.7, Hp * 0.8);
    });
    add(n, box(S, 0.16, S), pcbMaterials(tex, 0x7e1714), 0, 0, 0);
    // heatsink with fins over the L298 chip
    add(n, box(2.3, 0.35, 1.5), M.heatsink, 0, 0.3, -0.75);
    for (let i = 0; i < 9; i++) add(n, box(0.1, 2.0, 1.5), M.heatsink, -1.1 + i * 0.275, 1.45, -0.75);
    add(n, box(1.6, 1.1, 0.35), M.chip, 0, 0.85, 0.05);
    // electrolytic capacitors and regulator
    for (const x of [-1.6, 1.6]) { add(n, cyl(0.35, 0.35, 0.95, 18), M.capBlack, x, 0.55, 0.5); add(n, cyl(0.36, 0.36, 0.06, 18), M.capTop, x, 1.04, 0.5); }
    add(n, box(0.6, 0.6, 0.3), M.chip, -1.5, 0.4, 1.55);
    // screw terminals: OUT1/OUT2 on the left edge, OUT3/OUT4 on the right, +12V GND +5V at the front
    const screwTerminal = (count: number, x: number, z: number, alongZ: boolean) => {
      const body = add(n, box(alongZ ? 0.8 : count * 0.5, 0.95, alongZ ? count * 0.5 : 0.8), M.terminalBlue, x, 0.55, z);
      for (let i = 0; i < count; i++) {
        const o = (i - (count - 1) / 2) * 0.5;
        add(n, cyl(0.15, 0.15, 0.08, 12), M.screw, alongZ ? x : x + o, 1.06, alongZ ? z + o : z);
      }
      return body;
    };
    screwTerminal(2, -S / 2 + 0.4, -0.6, true);
    screwTerminal(2, S / 2 - 0.4, -0.6, true);
    screwTerminal(3, -1.1, S / 2 - 0.4, false);
    term("drv.out1", "driver", -S / 2 + 0.05, 0.6, -0.85);
    term("drv.out2", "driver", -S / 2 + 0.05, 0.6, -0.35);
    term("drv.out3", "driver", S / 2 - 0.05, 0.6, -0.85);
    term("drv.out4", "driver", S / 2 - 0.05, 0.6, -0.35);
    term("drv.12v", "driver", -1.6, 0.6, S / 2 + 0.05);
    term("drv.gnd", "driver", -1.1, 0.6, S / 2 + 0.05);
    // logic header: ENA IN1 IN2 IN3 IN4 ENB (ENA/ENB jumper caps removed for speed control, step 8)
    add(n, box(8 * PIN, 0.25, 0.5), M.headerBlack, 1.05, 0.2, S / 2 - 0.35);
    const pins: [Terminal, number][] = [["drv.ena", 0], ["drv.in1", 1.5], ["drv.in2", 2.5], ["drv.in3", 3.5], ["drv.in4", 4.5], ["drv.enb", 6]];
    for (const [t, i] of pins) {
      const x = 1.05 - 3.5 * PIN + i * PIN;
      add(n, box(0.06, 0.62, 0.06), M.gold, x, 0.5, S / 2 - 0.35);
      term(t, "driver", x, 0.8, S / 2 - 0.35);
    }
    for (const [x] of [[0], [7]]) add(n, box(0.06, 0.62, 0.06), M.gold, 1.05 - 3.5 * PIN + x * PIN, 0.5, S / 2 - 0.2); // the 5V pins beside ENA/ENB
    // standoffs to the plate
    for (const [x, z] of [[-1.85, -1.85], [1.85, -1.85], [-1.85, 1.85], [1.85, 1.85]]) add(n, cyl(0.28, 0.28, 0.6, 6), M.brass, x, -0.38, z);
  }

  /* ---------- 2× 18650 holder with slide switch, under the plate between the motors ---------- */
  const slideSwitch = new THREE.Group();
  {
    const n = part("holder", new THREE.Vector3(0, PLATE.y - 1.12, 1.4), new THREE.Vector3(-11, -2.15, 6.5));
    const Lh = 7.8, Wh = 4.1, Hh = 2.1;
    add(n, rbox(Lh, 0.3, Wh, 0.1), M.holder, 0, -Hh / 2 + 0.15, 0);
    for (const sz of [-1, 1]) add(n, box(Lh, Hh * 0.75, 0.22), M.holder, 0, -0.1, sz * (Wh / 2 - 0.11));
    add(n, box(0.4, Hh * 0.8, 0.25), M.holder, 0, -0.1, 0);
    for (const sx of [-1, 1]) add(n, box(0.35, Hh, Wh), M.holder, sx * (Lh / 2 - 0.17), 0, 0);
    // switch on the end, with its lever (step 2 / 11)
    slideSwitch.position.set(Lh / 2 + 0.25, 0.25, 0.9);
    n.group.add(slideSwitch);
    add(n, box(0.4, 0.7, 1.3), M.switchBody, 0, 0, 0, slideSwitch);
    add(n, box(0.25, 0.3, 0.35), M.whitePlastic, 0.28, 0.1, -0.25, slideSwitch);
    term("bat.pos", "holder", Lh / 2 + 0.2, 0.6, -0.6);
    term("bat.neg", "holder", Lh / 2 + 0.2, 0.6, -1.2);
  }
  {
    // the two cells sit inside the holder
    const n = part("cells", new THREE.Vector3(0, PLATE.y - 1.12, 1.4), new THREE.Vector3(-11, -2.3, 11.2));
    for (const sz of [-1, 1]) {
      const c = add(n, cyl(0.9, 0.9, 6.5, 32), M.cellWrap, 0, 0.05, sz * 0.95);
      c.rotation.z = Math.PI / 2;
      const t = add(n, cyl(0.35, 0.35, 0.12, 16), M.cellTop, 3.3, 0.05, sz * 0.95);
      t.rotation.z = Math.PI / 2;
    }
  }

  /* ---------- M3 hardware: brass standoffs under the Arduino, screws, nuts ---------- */
  {
    const n = part("hardware", new THREE.Vector3(0, TOP, 1.5), new THREE.Vector3(0, 2.1, 0.3));
    for (const [x, z] of [[-3.0, -2.4], [2.3, -2.4], [-3.0, 2.4], [2.85, 2.1]]) {
      add(n, cyl(0.28, 0.28, 1.0, 6), M.brass, x, 0.5, z);
      add(n, cyl(0.29, 0.29, 0.12, 6), M.screw, x, 1.06 + 0.16, z);           // screw head on top of the board
      add(n, cyl(0.32, 0.32, 0.18, 6), M.screw, x, -PLATE.t - 0.09, z);        // nut under the plate
    }
  }

  /* ---------- the black-tape test track for step 14 ---------- */
  const track = new THREE.Group();
  {
    const cardMesh = new THREE.Mesh(box(60, 0.05, 44), M.card);
    cardMesh.position.y = -0.03;
    cardMesh.receiveShadow = true;
    track.add(cardMesh);
    const curve = new THREE.EllipseCurve(0, 0, 22, 14, 0, Math.PI * 2, false, 0);
    const pts = curve.getPoints(160);
    const tapeShape = new THREE.Shape();
    pts.forEach((p, i) => (i ? tapeShape.lineTo(p.x * 1.06, p.y * 1.09) : tapeShape.moveTo(p.x * 1.06, p.y * 1.09)));
    const inner = new THREE.Path();
    pts.slice().reverse().forEach((p, i) => (i ? inner.lineTo(p.x * 0.94, p.y * 0.91) : inner.moveTo(p.x * 0.94, p.y * 0.91)));
    tapeShape.holes.push(inner);
    const tapeGeo = keep(new THREE.ShapeGeometry(tapeShape, 64));
    tapeGeo.rotateX(-Math.PI / 2);
    const tape = new THREE.Mesh(tapeGeo, M.tape);
    tape.position.set(-22, 0.01, 0);
    tape.receiveShadow = true;
    track.add(tape);
    track.visible = false;
    root.add(track);
  }

  /* ---------- wires: rebuilt from the terminals, so they follow the parts in the exploded view ---------- */
  const wires = new Map<string, { conn: Connection; mesh: THREE.Mesh; plugs: THREE.Mesh[]; mat: THREE.MeshStandardMaterial }>();
  const wiresNode = part("wires", new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0));
  const plugGeo = box(0.26, 1.4, 0.26);
  for (const conn of CONNECTIONS) {
    const mat = std({ color: wireHex(conn.color), roughness: 0.45, emissive: 0x000000 });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    mesh.castShadow = true;
    mesh.userData.part = conn.jumper ? "wires" : conn.from.part;
    mesh.userData.conn = conn.id;
    wiresNode.group.add(mesh);
    if (conn.jumper) wiresNode.meshes.push(mesh);
    const plugs = conn.jumper ? [0, 1].map(() => { const p = new THREE.Mesh(plugGeo, M.plugBlack); p.userData.part = "wires"; p.userData.conn = conn.id; p.castShadow = true; wiresNode.group.add(p); wiresNode.meshes.push(p); return p; }) : [];
    wires.set(conn.id, { conn, mesh, plugs, mat });
  }

  const tA = new THREE.Vector3(), tB = new THREE.Vector3();
  let explodeK = 0;
  function terminalWorld(t: Terminal, out: THREE.Vector3) {
    const d = terminals.get(t)!;
    const g = parts.get(d.part)!.group;
    g.updateWorldMatrix(true, false);
    return out.copy(d.local).applyMatrix4(g.matrixWorld);
  }
  /* wires that start under the plate are threaded through its pass-through slots (plate coordinates, so they stay
     put while the boards move out in the exploded view); jumpers between boards on top arc over the gap */
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const via = (c: Connection, a: THREE.Vector3): THREE.Vector3[] | null => {
    if (c.from.part === "sensors") {                       // up through the front slot, then back over the plate
      const x = THREE.MathUtils.clamp(a.x, -0.9, 0.9);
      return [V(x, 3.7, 8.0), V(x, TOP + 0.6, 8.0), V(x * 0.7, TOP + 2.4, 6.0)];
    }
    if (c.from.part === "motorL" || c.from.part === "motorR") { // up the centre slot, out along the driver's side
      const sx = c.from.part === "motorL" ? -1 : 1, o = c.id.endsWith("2") ? 0.18 : 0;
      return [V(sx * (0.7 + o), PLATE.y - 0.5, -1.9), V(sx * (0.7 + o), TOP + 0.6, -1.9), V(sx * (2.9 + o), TOP + 1.6, -3.4), V(sx * (2.9 + o), TOP + 1.5, -6.0)];
    }
    if (c.from.part === "holder") {                        // along the holder's end, up the centre slot, to the power terminal
      const o = c.id === "c-bat-" ? 0.2 : 0;
      return [V(4.1, PLATE.y - 0.45, -1.5 - o), V(1.25 + o, PLATE.y - 0.45, -1.9), V(1.25 + o, TOP + 0.6, -1.9), V(-0.4 + o, TOP + 1.7, -3.2)];
    }
    return null;
  };

  // route each wire: out of its terminal, along its path, into the other terminal
  function updateWires() {
    root.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    for (const w of wires.values()) {
      terminalWorld(w.conn.from.terminal, tA).applyMatrix4(inv);
      terminalWorld(w.conn.to.terminal, tB).applyMatrix4(inv);
      const up = w.conn.jumper ? 0.7 : 0.25;
      const a1 = tA.clone().add(V(0, up, 0)), b1 = tB.clone().add(V(0, up, 0));
      const pts = [tA.clone(), a1];
      const path = explodeK < 0.02 ? via(w.conn, tA) : null;
      if (path) pts.push(...path);
      else {
        const span = tA.distanceTo(tB);
        const lift = Math.max(a1.y, b1.y) + Math.min(2.6, 0.6 + span * 0.18);
        pts.push(tA.clone().lerp(tB, 0.25).setY(lift - 0.25), tA.clone().lerp(tB, 0.5).setY(lift), tA.clone().lerp(tB, 0.75).setY(lift - 0.25));
      }
      pts.push(b1, tB.clone());
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
      w.mesh.geometry.dispose();
      w.mesh.geometry = new THREE.TubeGeometry(curve, 64, w.conn.jumper ? 0.065 : 0.075, 8, false);
      // DuPont housings on both ends
      if (w.plugs.length) {
        w.plugs[0].position.copy(tA).add(new THREE.Vector3(0, 0.25, 0));
        w.plugs[1].position.copy(tB).add(new THREE.Vector3(0, 0.25, 0));
      }
    }
  }

  /* assembly axes: a dashed line from each part's mounting point to where it sits in the exploded view */
  const guideMat = keep(new THREE.LineDashedMaterial({ color: 0x7d838b, dashSize: 0.32, gapSize: 0.24, transparent: true, opacity: 0.8 }));
  const guides = new Map<PartId, THREE.Line>();
  for (const n of parts.values()) {
    if (n.away.length() < 0.1) continue;
    const line = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints([n.home, n.home])), guideMat);
    line.visible = false;
    root.add(line);
    guides.set(n.id, line);
  }

  /* exploded ↔ assembled: every part moves out along its own offset, then back to its exact installed pose.
     Parts leave one after another (top and outer parts first, the chassis last) and return in reverse; each
     position is computed from the home pose and k alone, so the transition never drifts. */
  const spread = new THREE.Vector3(1, 1, 1); // per-axis scale of the exploded offsets (the full-window intro spreads wider)
  const tmpAway = new THREE.Vector3();
  const ORDER: PartId[] = ["cells", "holder", "arduino", "driver", "hardware", "wires", "sensors", "caster", "wheelL", "wheelR", "motorL", "motorR", "brackets", "chassis", "usb"];
  function setExplode(k: number) {
    explodeK = k;
    for (const n of parts.values()) {
      const d = (Math.max(0, ORDER.indexOf(n.id)) / ORDER.length) * 0.42;
      const t = Math.min(1, Math.max(0, (k - d) / 0.58));
      const ki = t * t * (3 - 2 * t);
      // the vertical spread only lifts parts further up; parts that drop stay above the floor
      tmpAway.set(n.away.x * spread.x, n.away.y > 0 ? n.away.y * spread.y : n.away.y, n.away.z * spread.z);
      n.group.position.copy(n.home).addScaledVector(tmpAway, ki);
      n.group.quaternion.copy(n.homeQ);
      const g = guides.get(n.id);
      if (g) {
        g.visible = ki > 0.02;
        if (g.visible) { g.geometry.setFromPoints([n.home, n.group.position]); g.computeLineDistances(); }
      }
    }
    updateWires();
  }
  setExplode(0);

  return {
    root, parts, terminals, wires, track, trimmers, usbPort, slideSwitch,
    features: { switch: slideSwitch, usb: usbPort, plug: wires.get("c-in1")?.plugs[1], trim0: trimmers[0], trim1: trimmers[1] },
    setExplode, updateWires, terminalWorld,
    setSpread(x: number, y: number, z: number) { spread.set(x, y, z); setExplode(explodeK); },
    dispose() {
      for (const w of wires.values()) w.mesh.geometry.dispose();
      geoCache.forEach((g) => g.dispose());
      disposables.forEach((d) => d.dispose());
      void explodeK;
    },
  };

  function sph(r: number) { return geo(`s${r}`, () => new THREE.SphereGeometry(r, 32, 20)); }
}
