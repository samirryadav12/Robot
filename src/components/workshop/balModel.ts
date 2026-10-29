import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CONNECTIONS } from "./balData";
import type { KitModel, KitPartNode, KitWire } from "./kit";
import { wireHex } from "./wiringStyle";

/* A detailed, procedural BalanceBot Pro built from the project's hardware (src/data/projects.ts): a tower of four
   round carbon-fibre decks on brass standoffs, two JGB37-520 encoder gear motors in brackets under the base with
   85 mm rubber wheels on 6 mm couplings, the Li-Po on the base deck, the TB6612FNG and buck converter on the
   intermediate deck, the Arduino Uno, MPU6050 and toggle switch on the middle deck, and the HC-05 and ESP32-CAM on
   the top plate. Units are centimetres; +x right, +y up, +z the front. Every part is its own group (installed pose +
   exploded offset); wires are rebuilt from named terminals so they stay attached while the parts move. Step 13's
   foam tuning mat is shown on its own. */

type Node = KitPartNode & { anchors: THREE.Vector3[] };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const PIN = 0.254;

const WHEEL_R = 4.25, AXLE_Y = WHEEL_R, WHEEL_X = 10.4;
const R = 8, T = 0.3;
const DECK = { base: 6.4, mid: 11.4, brain: 16.4, top: 21.4 };
const top = (y: number) => y + T;

export function buildBalModel(): KitModel {
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
    brass: std({ color: 0xc9a043, roughness: 0.3, metalness: 1 }),
    steel: std({ color: 0xc9ced4, roughness: 0.22, metalness: 1 }),
    darkMetal: std({ color: 0x3a3f46, roughness: 0.35, metalness: 0.8 }),
    motorCan: std({ color: 0xb9bec5, roughness: 0.25, metalness: 1 }),
    gearbox: std({ color: 0x9aa0a8, roughness: 0.3, metalness: 0.9 }),
    encoder: std({ color: 0x1f6a3c, roughness: 0.55 }),
    magnet: std({ color: 0x2a2d32, roughness: 0.6 }),
    rubber: std({ color: 0x1b1d20, roughness: 0.92 }),
    hub: std({ color: 0x9ea4ab, roughness: 0.3, metalness: 0.9 }),
    screw: std({ color: 0xb8bcc2, roughness: 0.3, metalness: 1 }),
    headerBlack: std({ color: 0x17191c, roughness: 0.6 }),
    gold: std({ color: 0xe3bd5f, roughness: 0.25, metalness: 1 }),
    chip: std({ color: 0x141619, roughness: 0.45 }),
    capBlack: std({ color: 0x1e2024, roughness: 0.35 }),
    coil: std({ color: 0x3b3f45, roughness: 0.5, metalness: 0.4 }),
    trimmer: std({ color: 0x2f6fd6, roughness: 0.5 }),
    lipo: std({ color: 0x9aa3ad, roughness: 0.35, metalness: 0.5 }),
    lipoLabel: std({ color: 0x8fd14f, roughness: 0.5, emissive: 0x2a4a10, emissiveIntensity: 0.4 }),
    strap: std({ color: 0x2a2d33, roughness: 0.8 }),
    xt60: std({ color: 0xf2c230, roughness: 0.5 }),
    red: std({ color: 0xc7372a, roughness: 0.5 }),
    switchBody: std({ color: 0x232528, roughness: 0.5 }),
    usb: std({ color: 0xbfc3c9, roughness: 0.25, metalness: 1 }),
    plug: std({ color: 0x18191c, roughness: 0.5 }),
    printed: std({ color: 0x9aa0a8, roughness: 0.7 }),
    lens: std({ color: 0x0c0d10, roughness: 0.05, metalness: 0.6 }),
    lensRing: std({ color: 0x8e949b, roughness: 0.25, metalness: 1 }),
    mat: std({ color: 0x3d434b, roughness: 0.95 }),
    matLine: std({ color: 0x59606a, roughness: 0.95 }),
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
    const topM = std({ map: tex, roughness: 0.55, metalness: 0.05 });
    return [side, side, topM, side, side, side];
  };
  const label = (text: string, sub = "") => (g: CanvasRenderingContext2D, W: number, H: number) => {
    g.fillStyle = "#eef3fb"; g.textAlign = "center";
    g.font = `bold ${Math.min(H * 0.22, W * 0.1)}px sans-serif`; g.fillText(text, W / 2, H * (sub ? 0.55 : 0.6));
    if (sub) { g.font = `bold ${Math.min(H * 0.12, W * 0.06)}px sans-serif`; g.fillText(sub, W / 2, H * 0.8); }
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

  /* ---------- the four round decks ---------- */
  const PILLARS = [30, 90, 150, 210, 270, 330].map((a) => (a * Math.PI) / 180).map((a) => [Math.cos(a) * 6.9, Math.sin(a) * 6.9] as const);
  const disc = (cut: (s: THREE.Shape) => void) => {
    const s = new THREE.Shape();
    s.absarc(0, 0, R, 0, Math.PI * 2, false);
    for (const [x, z] of PILLARS) { const h = new THREE.Path(); h.absarc(x, z, 0.18, 0, Math.PI * 2, true); s.holes.push(h); }
    cut(s);
    const g = keep(new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 64 }));
    g.rotateX(Math.PI / 2); g.translate(0, T, 0);
    return g;
  };
  const slot = (s: THREE.Shape, x0: number, z0: number, x1: number, z1: number) => { const h = new THREE.Path(); h.moveTo(x0, z0); h.lineTo(x0, z1); h.lineTo(x1, z1); h.lineTo(x1, z0); h.lineTo(x0, z0); s.holes.push(h); };
  for (const [id, y, away, cut] of [
    ["basePlate", DECK.base, V(0, 0, 0), (s: THREE.Shape) => { slot(s, -5.0, -0.8, -3.6, 0.8); slot(s, 3.6, -0.8, 5.0, 0.8); }],
    ["midPlate", DECK.mid, V(0, 6, 0), (s: THREE.Shape) => slot(s, -1.8, -4.6, 1.8, -3.4)],
    ["brainPlate", DECK.brain, V(0, 12, 0), (s: THREE.Shape) => slot(s, -1.8, -5.6, 1.8, -4.4)],
    ["topPlate", DECK.top, V(0, 18, 0), (s: THREE.Shape) => slot(s, -1.6, -5.4, 1.6, -4.2)],
  ] as const) {
    const n = part(id, V(0, y, 0), away);
    const g = disc(cut);
    add(n, g, M.carbon, 0, 0, 0);
    const edges = new THREE.LineSegments(keep(new THREE.EdgesGeometry(g, 25)), M.carbonEdge); edges.userData.part = id; n.group.add(edges);
  }

  /* ---------- brass standoffs between each pair of decks ---------- */
  {
    const n = part("standoffs", V(0, 0, 0), V(0, 4, 0), 0, PILLARS.map(([x, z]) => V(x, DECK.mid, z)));
    for (const [x, z] of PILLARS) for (const [a, b] of [[top(DECK.base), DECK.mid], [top(DECK.mid), DECK.brain], [top(DECK.brain), DECK.top]]) {
      add(n, cyl(0.3, 0.3, b - a, 6), M.brass, x, (a + b) / 2, z);
    }
    for (const [x, z] of PILLARS) add(n, cyl(0.3, 0.3, 0.12, 6), M.screw, x, top(DECK.top) + 0.06, z);
  }

  /* ---------- 37 mm motor brackets under the base ---------- */
  {
    const anchors = [V(-7.4, DECK.base, 0), V(7.4, DECK.base, 0)];
    const n = part("brackets", V(0, 0, 0), V(0, -2, 0), 0, anchors);
    for (const sx of [-1, 1]) {
      add(n, box(2.4, 0.25, 4.0), M.darkMetal, sx * 6.3, DECK.base - 0.13, 0);        // tab under the plate
      add(n, box(0.3, 4.4, 4.0), M.darkMetal, sx * 7.4, DECK.base - 2.3, 0);          // the face the motor bolts to
      for (const dz of [-1.2, 1.2]) add(n, cyl(0.16, 0.16, 0.5, 8), M.screw, sx * 7.65, AXLE_Y, dz).rotation.z = Math.PI / 2;
    }
  }

  /* ---------- JGB37-520 encoder gear motors ---------- */
  for (const [id, sx] of [["motorL", -1], ["motorR", 1]] as const) {
    const k = id === "motorL" ? "L" : "R";
    const n = part(id, V(sx * 4.6, AXLE_Y, 0), V(sx * 3, -1.5, 0));
    const gb = add(n, cyl(1.85, 1.85, 2.4, 32), M.gearbox, sx * 1.6, 0, 0); gb.rotation.z = Math.PI / 2;
    const can = add(n, cyl(1.7, 1.7, 3.4, 32), M.motorCan, -sx * 1.3, 0, 0); can.rotation.z = Math.PI / 2;
    const disk = add(n, cyl(1.5, 1.5, 0.15, 28), M.encoder, -sx * 3.1, 0, 0); disk.rotation.z = Math.PI / 2;     // encoder board
    const mag = add(n, cyl(0.6, 0.6, 0.35, 20), M.magnet, -sx * 3.3, 0, 0); mag.rotation.z = Math.PI / 2;
    add(n, box(0.2, 0.5, 1.4), M.headerBlack, -sx * 3.25, 1.2, 0);
    const sh = add(n, cyl(0.3, 0.3, 2.4, 14), M.steel, sx * 4.0, 0, 0); sh.rotation.z = Math.PI / 2;
    term(`mot${k}.m1`, id, -sx * 3.3, 1.5, -0.55); term(`mot${k}.m2`, id, -sx * 3.3, 1.5, -0.33);
    term(`mot${k}.vcc`, id, -sx * 3.3, 1.5, -0.11); term(`mot${k}.gnd`, id, -sx * 3.3, 1.5, 0.11);
    term(`mot${k}.a`, id, -sx * 3.3, 1.5, 0.33); term(`mot${k}.b`, id, -sx * 3.3, 1.5, 0.55);
  }

  /* ---------- 85 mm rubber wheels on 6 mm couplings ---------- */
  for (const [id, sx] of [["wheelL", -1], ["wheelR", 1]] as const) {
    const n = part(id, V(sx * WHEEL_X, AXLE_Y, 0), V(sx * 6, 0, 0));
    const spin = new THREE.Group(); spin.rotation.z = Math.PI / 2; n.group.add(spin);
    const tyre = add(n, geo("bbTyre", () => new THREE.TorusGeometry(3.35, 0.9, 20, 64)), M.rubber, 0, 0, 0, spin);
    tyre.rotation.x = Math.PI / 2; tyre.scale.set(1, 1, 1.75);
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; const t = add(n, box(0.28, 3.0, 0.2), M.rubber, Math.cos(a) * 4.18, 0, Math.sin(a) * 4.18, spin); t.rotation.y = -a; }
    add(n, cyl(2.5, 2.5, 2.8, 40), M.hub, 0, 0, 0, spin);
    for (let i = 0; i < 6; i++) { const h = add(n, cyl(0.35, 0.35, 2.9, 12), M.darkMetal, Math.cos((i / 6) * Math.PI * 2) * 1.5, 0, Math.sin((i / 6) * Math.PI * 2) * 1.5, spin); h.userData.part = id; }
    add(n, cyl(0.75, 0.75, 3.4, 6), M.steel, 0, -sx * 0.4, 0, spin);                // the coupling
  }

  /* ---------- base deck: the Li-Po ---------- */
  {
    const n = part("battery", V(0, top(DECK.base) + 1.25, 0.4), V(0, 4, 6));
    add(n, rbox(7.4, 2.4, 3.5, 0.25), M.lipo, 0, 0, 0);
    add(n, box(4.6, 0.05, 2.6), M.lipoLabel, 0.6, 1.23, 0);
    add(n, box(0.5, 2.6, 3.8), M.strap, -1.8, 0, 0);
    add(n, rbox(1.4, 0.8, 1.0, 0.1), M.xt60, -4.6, -0.6, 1.1);
    term("bat.pos", "battery", -5.2, -0.5, 0.9);
    term("bat.neg", "battery", -5.2, -0.5, 1.3);
  }

  /* ---------- intermediate deck: TB6612FNG and the buck converter ---------- */
  {
    const n = part("driver", V(0, top(DECK.mid) + 0.55, 0.5), V(0, 5, 2));
    const tex = pcbTexture(2.4, 2.1, "#b3241f", label("TB6612FNG"));
    add(n, box(2.4, 0.14, 2.1), pcbMaterials(tex, 0x7e1714), 0, 0, 0);
    add(n, box(0.8, 0.12, 0.6), M.chip, 0, 0.13, 0);
    for (const sx of [-1, 1]) add(n, box(0.25, 0.3, 8 * PIN), M.headerBlack, sx * 1.05, 0.22, 0);
    // left row: control pins; right row: power and motor outputs
    (["pwma", "ain2", "ain1", "stby", "bin1", "bin2", "pwmb", "lgnd"] as const).forEach((p, i) => {
      const z = (i - 3.5) * PIN;
      add(n, box(0.06, 0.5, 0.06), M.gold, -1.05, 0.5, z);
      if (p !== "lgnd") term(`drv.${p}`, "driver", -1.05, 0.72, z);
    });
    (["vm", "vcc", "gnd", "a01", "a02", "b02", "b01", "rgnd"] as const).forEach((p, i) => {
      const z = (i - 3.5) * PIN;
      add(n, box(0.06, 0.5, 0.06), M.gold, 1.05, 0.5, z);
      if (p !== "rgnd") term(`drv.${p}`, "driver", 1.05, 0.72, z);
    });
    for (const [x, z] of [[-0.9, -0.85], [0.9, 0.85]]) add(n, cyl(0.2, 0.2, 0.55, 6), M.brass, x, -0.35, z);
  }
  {
    const n = part("buck", V(4.6, top(DECK.mid) + 0.55, 1.2), V(5, 4.5, 2), Math.PI / 2);
    const tex = pcbTexture(4.4, 2.1, "#1d4f9c", label("LM2596", "5.0V"));
    add(n, box(4.4, 0.14, 2.1), pcbMaterials(tex, 0x123a73), 0, 0, 0);
    add(n, cyl(0.75, 0.75, 0.8, 20), M.coil, -0.6, 0.47, 0);
    add(n, cyl(0.4, 0.4, 1.0, 16), M.capBlack, 1.3, 0.57, 0.4);
    add(n, cyl(0.35, 0.35, 0.9, 16), M.capBlack, -1.8, 0.52, 0.5);
    add(n, box(0.45, 0.55, 0.45), M.trimmer, 1.3, 0.35, -0.5);
    add(n, box(0.12, 0.06, 0.08), M.ledRed, 0.4, 0.1, -0.7);
    for (const [x, ...ts] of [[-1.95, "buck.inp", "buck.ing"], [1.95, "buck.out5", "buck.outg"]] as const) {
      ts.forEach((t, i) => { const z = i ? 0.45 : -0.45; add(n, cyl(0.14, 0.14, 0.12, 10), M.gold, x, 0.12, z); term(t, "buck", x, 0.22, z); });
    }
    for (const [x, z] of [[-1.9, -0.8], [1.9, 0.8]]) add(n, cyl(0.22, 0.22, 0.55, 6), M.brass, x, -0.35, z);
  }

  /* ---------- middle deck: the Uno, the MPU6050 and the toggle switch ---------- */
  const usbPort = new THREE.Group();
  {
    // long axis along z, USB at the rear; digital header on the right edge, analog and power on the left
    const n = part("uno", V(-0.6, top(DECK.brain) + 0.7, -0.6), V(0, 9, -2));
    const L = 6.9, Wb = 5.3;
    const tex = pcbTexture(Wb, L, "#0b6e99", (g, W, H) => {
      g.fillStyle = "#e8f6fb"; g.textAlign = "center";
      g.save(); g.translate(W / 2, H / 2); g.rotate(-Math.PI / 2);
      g.font = `bold ${W * 0.16}px sans-serif`; g.fillText("ARDUINO", 0, -W * 0.03);
      g.font = `bold ${W * 0.13}px sans-serif`; g.fillText("UNO", 0, W * 0.15);
      g.restore();
    });
    add(n, box(Wb, 0.16, L), pcbMaterials(tex, 0x07506f), 0, 0, 0);
    add(n, box(0.9, 0.3, 3.4), M.chip, 0.3, 0.22, 0.6);
    const usb = add(n, rbox(1.2, 1.1, 1.6, 0.08), M.usb, -1.4, 0.6, -L / 2 + 0.5);
    usbPort.position.copy(usb.position); n.group.add(usbPort);
    add(n, rbox(0.9, 1.1, 1.4, 0.1), M.capBlack, 1.5, 0.6, -L / 2 + 0.6);
    add(n, box(0.12, 0.06, 0.08), M.ledGreen, 1.9, 0.1, -1.4);
    add(n, box(0.25, 0.85, 5.0), M.headerBlack, Wb / 2 - 0.3, 0.5, 0.6);
    add(n, box(0.25, 0.85, 4.2), M.headerBlack, -(Wb / 2 - 0.3), 0.5, 1.0);
    ["d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "d10", "d11"].forEach((p, i) => term(`uno.${p}`, "uno", Wb / 2 - 0.3, 0.95, -1.5 + i * 0.42));
    ["5v", "gnd", "vin", "a0", "a1", "a2", "a3", "a4", "a5"].forEach((p, i) => term(`uno.${p}`, "uno", -(Wb / 2 - 0.3), 0.95, -0.9 + i * 0.42));
    for (const [x, z] of [[-2.2, -3.0], [2.2, -3.0], [-2.2, 3.0], [2.2, 3.0]]) add(n, cyl(0.22, 0.22, 0.6, 6), M.brass, x, -0.4, z);
  }
  {
    const n = part("imu", V(3.8, top(DECK.brain) + 0.45, 3.4), V(4, 8, 4));
    const tex = pcbTexture(2.1, 1.6, "#2a5fb0", label("MPU-6050", "GY-521"));
    add(n, box(2.1, 0.12, 1.6), pcbMaterials(tex, 0x173d84), 0, 0, 0);
    add(n, box(0.45, 0.1, 0.45), M.chip, 0.1, 0.1, -0.15);
    add(n, box(4 * PIN + 0.1, 0.25, 0.25), M.headerBlack, 0, 0.18, 0.62);
    (["vcc", "gnd", "scl", "sda"] as const).forEach((p, i) => { const x = (i - 1.5) * PIN; add(n, box(0.06, 0.45, 0.06), M.gold, x, 0.35, 0.62); term(`imu.${p}`, "imu", x, 0.55, 0.62); });
    for (const [x, z] of [[-0.85, -0.6], [0.85, -0.6]]) add(n, cyl(0.15, 0.15, 0.4, 6), M.brass, x, -0.25, z);
  }
  const toggle = new THREE.Group();
  {
    const n = part("switch", V(6.4, top(DECK.brain) + 0.6, -1.6), V(5, 7, 0));
    add(n, rbox(1.6, 1.2, 2.2, 0.15), M.switchBody, 0, 0, 0);
    toggle.position.set(0, 0.6, 0); n.group.add(toggle);
    const lever = add(n, cyl(0.15, 0.2, 1.3, 12), M.steel, 0, 0.6, 0, toggle); lever.rotation.x = 0.4;
    add(n, cyl(0.35, 0.35, 0.2, 18), M.red, 0, 0.1, 0, toggle);
    term("sw.in", "switch", -0.8, 0.3, -0.6);
    term("sw.out", "switch", -0.8, 0.3, 0.6);
  }

  /* ---------- top plate: the HC-05 and the ESP32-CAM on its mount ---------- */
  {
    const n = part("bt", V(-3.6, top(DECK.top) + 0.45, -1.4), V(-4, 6, -2));
    const tex = pcbTexture(4.3, 1.6, "#2a7fd0", label("HC-05"));
    add(n, box(4.3, 0.12, 1.6), pcbMaterials(tex, 0x1a5a96), 0, 0, 0);
    add(n, box(2.7, 0.18, 1.3), M.encoder, 0.5, 0.15, 0);
    add(n, box(0.25, 0.3, 6 * PIN), M.headerBlack, -2.0, 0.2, 0);
    (["vcc", "gnd", "tx", "rx"] as const).forEach((p, i) => { const z = (i - 1.5) * PIN; add(n, box(0.06, 0.45, 0.06), M.gold, -2.0, 0.35, z); term(`bt.${p}`, "bt", -2.0, 0.55, z); });
    add(n, box(0.12, 0.06, 0.08), M.ledRed, 1.6, 0.1, 0.5);
    for (const [x, z] of [[-1.6, -0.55], [1.6, 0.55]]) add(n, cyl(0.15, 0.15, 0.4, 6), M.brass, x, -0.25, z);
  }
  {
    const n = part("cam", V(1.6, top(DECK.top), 2.6), V(2, 8, 4));
    add(n, box(3.2, 0.3, 2.2), M.printed, 0, 0.15, 0);                              // the printed mount
    add(n, box(3.0, 3.2, 0.4), M.printed, 0, 1.9, -0.6);
    const tex = pcbTexture(2.7, 4.0, "#1b1d21", (g, W, H) => { g.fillStyle = "#cfd3d8"; g.textAlign = "center"; g.font = `bold ${W * 0.11}px sans-serif`; g.fillText("ESP32-CAM", W / 2, H * 0.92); });
    const dark = std({ color: 0x0f1012, roughness: 0.6 });
    add(n, box(2.7, 4.0, 0.14), [dark, dark, dark, dark, std({ map: tex, roughness: 0.55 }), dark], 0, 2.3, -0.3);
    add(n, rbox(1.3, 1.3, 0.6, 0.1), M.capBlack, 0, 2.9, 0.05);
    add(n, cyl(0.42, 0.42, 0.5, 24), M.lensRing, 0, 2.9, 0.55).rotation.x = Math.PI / 2;
    add(n, cyl(0.3, 0.3, 0.05, 24), M.lens, 0, 2.9, 0.81).rotation.x = Math.PI / 2;
    term("cam.5v", "cam", -0.5, 0.35, -0.8); term("cam.gnd", "cam", -0.1, 0.35, -0.8);
  }

  /* ---------- step 13's foam tuning mat (not a BOM part) ---------- */
  const track = new THREE.Group();
  {
    const fl = new THREE.Mesh(box(70, 1.2, 70), M.mat); fl.position.y = -0.62; fl.receiveShadow = true; track.add(fl);
    for (let i = -3; i <= 3; i++) for (const rot of [0, Math.PI / 2]) {
      const l = new THREE.Mesh(box(70, 0.04, 0.25), M.matLine); l.position.set(0, 0.0, i * 10); l.rotation.y = rot; track.add(l);
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
  /* assembled routes: wires between decks climb through the rear slots of the plates in between */
  const DECK_Y = [DECK.mid, DECK.brain, DECK.top];
  const SLOT_Z = [-4.0, -5.0, -4.8];
  function updateWires() {
    root.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    for (const w of wires.values()) {
      terminalWorld(w.conn.from.terminal, tA).applyMatrix4(inv);
      terminalWorld(w.conn.to.terminal, tB).applyMatrix4(inv);
      const up = w.conn.jumper ? 0.5 : 0.25;
      const lo = tA.y < tB.y ? tA : tB, hi = lo === tA ? tB : tA;
      const crossed = DECK_Y.map((y, i) => [y, SLOT_Z[i]] as const).filter(([y]) => lo.y < y && hi.y > y + T);
      let path: THREE.Vector3[];
      if (explodeK < 0.02 && crossed.length) {
        const off = (lo.x > 0 ? 0.35 : -0.35);
        path = [lo.clone().add(V(0, up, 0)), ...crossed.flatMap(([y, z]) => [V(off, y - 0.6, z), V(off, y + T + 0.6, z)]), hi.clone().add(V(0, up, 0))];
      } else {
        const span = tA.distanceTo(tB);
        const lift = Math.max(tA.y, tB.y) + Math.min(2.2, 0.5 + span * 0.12);
        path = [lo.clone().add(V(0, up, 0)), lo.clone().lerp(hi, 0.5).setY(lift), hi.clone().add(V(0, up, 0))];
      }
      if (lo !== tA) path.reverse();
      const pts = [tA.clone(), ...path, tB.clone()];
      const geoW = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5), 64, w.conn.jumper ? 0.05 : 0.075, 8, false);
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
  const ORDER = ["cam", "bt", "topPlate", "imu", "uno", "switch", "brainPlate", "driver", "buck", "midPlate", "standoffs", "battery", "wires",
    "wheelL", "wheelR", "motorL", "motorR", "brackets", "basePlate"];
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
