import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CONNECTIONS } from "./soccerData";
import type { KitConnection, KitModel, KitPartNode, KitWire } from "./kit";
import { wireHex } from "./wiringStyle";

/* A detailed, procedural RoboSoccer Bot built from the project's actual hardware (src/data/projects.ts): a round
   two-deck 2WD chassis (carbon base plate, clear top plate on standoffs, ball casters), two metal gear motors on
   brackets with their wheels, an L298N and a battery pack on the base plate, an Arduino Uno, an HC-05 Bluetooth
   module and a power switch on the top plate, and a lightweight ball for the last test. Units are centimetres; +x
   right, +y up, +z the front of the robot. Every part is its own group (installed pose + exploded offset) so it can
   be selected, isolated, highlighted and exploded; wires are rebuilt from named terminals so they stay attached
   while the parts move. */

type Node = KitPartNode & { anchors: THREE.Vector3[] };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const PIN = 0.254;

const R = 8.6;                                  // deck radius
const BASE = { y: 4.7, t: 0.3 };                // carbon base plate
const TOP = { y: 9.4, t: 0.3 };                 // clear top plate
const BASE_TOP = BASE.y + BASE.t, TOP_TOP = TOP.y + TOP.t;
const WHEEL_R = 3.3, AXLE_Y = WHEEL_R, WHEEL_X = 9.6;
const STANDOFFS: [number, number][] = [[-5.4, 5.0], [5.4, 5.0], [-5.4, -5.0], [5.4, -5.0]];

export function buildSoccerModel(): KitModel {
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };
  const geoCache = new Map<string, THREE.BufferGeometry>();
  const geo = (k: string, make: () => THREE.BufferGeometry) => { let g = geoCache.get(k); if (!g) { g = make(); geoCache.set(k, g); } return g; };
  const rbox = (w: number, h: number, d: number, r: number) => geo(`rb${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.999));
  const box = (w: number, h: number, d: number) => geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
  const cyl = (rt: number, rb: number, h: number, s = 24) => geo(`c${rt}|${rb}|${h}|${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));

  /* ---------- materials ---------- */
  const std = (p: THREE.MeshStandardMaterialParameters) => keep(new THREE.MeshStandardMaterial(p));
  const weave = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#1a1c1f"; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const on = (x + y) % 2 === 0;
      const grd = on ? g.createLinearGradient(x * 16, y * 16, x * 16 + 16, y * 16) : g.createLinearGradient(x * 16, y * 16, x * 16, y * 16 + 16);
      grd.addColorStop(0, "#22252a"); grd.addColorStop(0.5, on ? "#3a3e45" : "#30343a"); grd.addColorStop(1, "#22252a");
      g.fillStyle = grd; g.fillRect(x * 16 + 1, y * 16 + 1, 14, 14);
    }
    const t = keep(new THREE.CanvasTexture(c));
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.5, 0.5); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  })();
  const M = {
    carbon: keep(new THREE.MeshPhysicalMaterial({ map: weave, roughness: 0.42, metalness: 0.15, clearcoat: 0.9, clearcoatRoughness: 0.25 })),
    acrylic: keep(new THREE.MeshPhysicalMaterial({ color: 0xe4f1f6, roughness: 0.06, transparent: true, opacity: 0.38, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide })),
    acrylicEdge: keep(new THREE.LineBasicMaterial({ color: 0x9fc4d3, transparent: true, opacity: 0.9 })),
    standoff: std({ color: 0x2c3036, roughness: 0.3, metalness: 0.9 }),
    brass: std({ color: 0xc9a043, roughness: 0.3, metalness: 1 }),
    bracket: std({ color: 0x23262b, roughness: 0.5, metalness: 0.4 }),
    motorCan: std({ color: 0xc6c9ce, roughness: 0.25, metalness: 1 }),
    gearbox: std({ color: 0x9aa0a8, roughness: 0.3, metalness: 1 }),
    copperTab: std({ color: 0xc98a4b, roughness: 0.35, metalness: 1 }),
    rubber: std({ color: 0x1c1e21, roughness: 0.92 }),
    hub: std({ color: 0xa9aeb5, roughness: 0.25, metalness: 0.95 }),
    steel: std({ color: 0xdfe3e8, roughness: 0.12, metalness: 1 }),
    screw: std({ color: 0xb8bcc2, roughness: 0.3, metalness: 1 }),
    headerBlack: std({ color: 0x17191c, roughness: 0.6 }),
    gold: std({ color: 0xe3bd5f, roughness: 0.25, metalness: 1 }),
    chip: std({ color: 0x141619, roughness: 0.45 }),
    heatsink: std({ color: 0x23262b, roughness: 0.4, metalness: 0.7 }),
    terminalBlue: std({ color: 0x2a5fb0, roughness: 0.55 }),
    capBlack: std({ color: 0x1e2024, roughness: 0.35 }),
    usb: std({ color: 0xbfc3c9, roughness: 0.25, metalness: 1 }),
    jack: std({ color: 0x141518, roughness: 0.5 }),
    switchBody: std({ color: 0x1b1c1f, roughness: 0.5 }),
    rocker: std({ color: 0xd8322a, roughness: 0.4 }),
    plug: std({ color: 0x18191c, roughness: 0.5 }),
    ledRed: std({ color: 0x8a1c14, emissive: 0xff3b2b, emissiveIntensity: 0.9, roughness: 0.3 }),
    ledBlue: std({ color: 0x0f2c5a, emissive: 0x3c8cff, emissiveIntensity: 0.9, roughness: 0.3 }),
    ball: keep(new THREE.MeshPhysicalMaterial({ color: 0xf06a26, roughness: 0.55, clearcoat: 0.3 })),
  };

  function pcbTexture(w: number, h: number, base: string, draw: (g: CanvasRenderingContext2D, W: number, H: number) => void) {
    const W = 1024, H = Math.round((1024 * h) / w);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.16; g.strokeStyle = "#ffffff"; g.lineWidth = 3;
    for (let i = 0; i < 26; i++) { g.beginPath(); const y = (i * 37) % H, x = (i * 91) % W; g.moveTo(x, y); g.lineTo(x + 120, y); g.lineTo(x + 170, y + 50); g.lineTo(x + 320, y + 50); g.stroke(); }
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
  const plateGeo = (shape: THREE.Shape, t: number) => {
    const g = keep(new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 40 }));
    g.rotateX(Math.PI / 2);
    g.translate(0, t, 0);
    return g;
  };
  // a round deck with notches for the wheels: the circle, cut flat where |x| > wx for |z| < wz
  const deckShape = (r: number, wx: number, wz: number) => {
    const s = new THREE.Shape();
    // walk round the circle anticlockwise (shape y = world z), stepping in to x = ±wx across each wheel's notch
    const pts: [number, number][] = [];
    const arc = (from: number, to: number) => { for (let i = 0; i <= 48; i++) { const a = from + ((to - from) * i) / 48; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } };
    const e = Math.asin(wz / r);
    arc(e, Math.PI - e);                        // front half
    pts.push([-wx, wz], [-wx, -wz]);            // left notch
    arc(Math.PI + e, Math.PI * 2 - e);          // rear half
    pts.push([wx, -wz], [wx, wz]);              // right notch
    pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    return s;
  };
  const hole = (s: THREE.Shape, x: number, z: number, r = 0.18) => { const h = new THREE.Path(); h.absarc(x, z, r, 0, Math.PI * 2, true); s.holes.push(h); };
  const slot = (s: THREE.Shape, x0: number, z0: number, x1: number, z1: number) => { const h = new THREE.Path(); h.moveTo(x0, z0); h.lineTo(x0, z1); h.lineTo(x1, z1); h.lineTo(x1, z0); h.lineTo(x0, z0); s.holes.push(h); };

  const root = new THREE.Group();
  const parts = new Map<string, Node>();
  const terminals = new Map<string, { part: string; local: THREE.Vector3 }>();
  const part = (id: string, home: THREE.Vector3, away: THREE.Vector3, anchors: THREE.Vector3[] = [V(0, 0, 0)]) => {
    const g = new THREE.Group();
    g.name = id; g.position.copy(home); root.add(g);
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

  /* ---------- base plate (carbon) with motor brackets and two ball casters ---------- */
  {
    const n = part("chassis", V(0, 0, 0), V(0, 0, 0));
    const s = deckShape(R, 7.4, 3.9);
    for (const [x, z] of STANDOFFS) hole(s, x, z);
    slot(s, -3.6, -1.4, -2.6, 0.2); slot(s, 2.6, -1.4, 3.6, 0.2);   // motor-wire pass-throughs
    slot(s, -1.6, 6.6, 1.6, 7.2);
    add(n, plateGeo(s, BASE.t), M.carbon, 0, BASE.y, 0);
    // motor brackets: an L under the plate on each side
    for (const sx of [-1, 1]) {
      add(n, rbox(0.3, 2.6, 2.4, 0.06), M.bracket, sx * 2.1, BASE.y - 1.3, 0);
      add(n, rbox(1.4, 0.3, 2.4, 0.06), M.bracket, sx * 2.65, BASE.y - 0.15, 0);
    }
    // ball casters front and rear, on brass standoffs down to the floor
    for (const z of [6.6, -6.6]) {
      add(n, geo("ballC", () => new THREE.SphereGeometry(0.75, 28, 16)), M.steel, 0, 0.75, z);
      add(n, cyl(0.95, 0.75, 0.9, 24), M.bracket, 0, 1.25, z);
      add(n, rbox(3.0, 0.22, 1.2, 0.1), M.bracket, 0, 1.75, z);
      for (const x of [-0.95, 0.95]) add(n, cyl(0.26, 0.26, BASE.y - 1.86, 6), M.brass, x, (BASE.y + 1.86) / 2, z);
    }
  }

  /* ---------- top plate (clear) on four standoffs ---------- */
  {
    const n = part("topPlate", V(0, TOP.y, 0), V(0, 9, 0));
    const s = deckShape(R, 7.4, 3.9);
    for (const [x, z] of STANDOFFS) hole(s, x, z);
    slot(s, -2.6, -0.5, 2.6, 0.35);                                 // wire pass-through between the decks
    slot(s, -3.2, -7.2, 3.2, -6.2);
    const g = plateGeo(s, TOP.t);
    const plate = add(n, g, M.acrylic, 0, 0, 0);
    plate.castShadow = false;
    const edges = new THREE.LineSegments(keep(new THREE.EdgesGeometry(g, 25)), M.acrylicEdge);
    edges.userData.part = "topPlate";
    n.group.add(edges);
    for (const [x, z] of STANDOFFS) {
      add(n, cyl(0.26, 0.26, TOP.y - BASE_TOP, 6), M.standoff, x, -(TOP.y - BASE_TOP) / 2, z);
      add(n, cyl(0.29, 0.29, 0.14, 6), M.screw, x, TOP.t + 0.07, z);
    }
  }

  /* ---------- metal gear motors under the plate, shafts outward ---------- */
  for (const [id, sx] of [["motorL", -1], ["motorR", 1]] as const) {
    const n = part(id, V(sx * 4.4, AXLE_Y, 0), V(sx * 4.5, -0.4, 0));
    const can = add(n, cyl(1.25, 1.25, 3.2, 32), M.motorCan, -sx * 1.0, 0, 0); can.rotation.z = Math.PI / 2;
    const gb = add(n, cyl(1.25, 1.25, 2.0, 32), M.gearbox, sx * 1.6, 0, 0); gb.rotation.z = Math.PI / 2;
    const cap = add(n, cyl(1.1, 1.1, 0.25, 28), M.capBlack, -sx * 2.72, 0, 0); cap.rotation.z = Math.PI / 2;
    for (const dz of [-0.4, 0.4]) add(n, box(0.06, 0.4, 0.2), M.copperTab, -sx * 2.88, 0.3, dz);
    const sh = add(n, cyl(0.2, 0.2, 1.8, 16), M.steel, sx * 3.4, 0, 0); sh.rotation.z = Math.PI / 2;
    term(`mot${id === "motorL" ? "L" : "R"}.a`, id, -sx * 2.9, 0.55, -0.4);
    term(`mot${id === "motorL" ? "L" : "R"}.b`, id, -sx * 2.9, 0.55, 0.4);
  }

  /* ---------- wheels: alloy hub with a treaded tyre ---------- */
  for (const [id, sx] of [["wheelL", -1], ["wheelR", 1]] as const) {
    const n = part(id, V(sx * WHEEL_X, AXLE_Y, 0), V(sx * 6, 0, 0));
    const spin = new THREE.Group(); spin.rotation.z = Math.PI / 2; n.group.add(spin);
    const tyre = add(n, geo("tyre", () => new THREE.TorusGeometry(2.78, 0.55, 18, 64)), M.rubber, 0, 0, 0, spin);
    tyre.rotation.x = Math.PI / 2; tyre.scale.set(1, 1, 2.0);
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; const t = add(n, box(0.34, 2.1, 0.22), M.rubber, Math.cos(a) * 3.26, 0, Math.sin(a) * 3.26, spin); t.rotation.y = -a; }
    add(n, cyl(2.3, 2.3, 1.9, 40), M.hub, 0, 0, 0, spin);
    add(n, cyl(0.7, 0.7, 2.2, 20), M.screw, 0, 0, 0, spin);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(n, cyl(0.42, 0.42, 2.0, 16), M.capBlack, Math.cos(a) * 1.35, sx * 0.05, Math.sin(a) * 1.35, spin); }
  }

  /* ---------- L298N on the base plate, behind the battery ---------- */
  {
    const n = part("driver", V(0, BASE_TOP + 0.6, -3.6), V(0, 4.5, -4));
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
    const pins: [string, number][] = [["drv.ena", 0], ["drv.in1", 1.5], ["drv.in2", 2.5], ["drv.in3", 3.5], ["drv.in4", 4.5], ["drv.enb", 6]];
    for (const [t, i] of pins) { const x = 1.05 - 3.5 * PIN + i * PIN; add(n, box(0.06, 0.62, 0.06), M.gold, x, 0.5, S / 2 - 0.35); term(t, "driver", x, 0.8, S / 2 - 0.35); }
    for (const [x, z] of [[-1.85, -1.85], [1.85, -1.85], [-1.85, 1.85], [1.85, 1.85]]) add(n, cyl(0.26, 0.26, 0.6, 6), M.brass, x, -0.38, z);
  }

  /* ---------- battery pack on the base plate, at the front ---------- */
  {
    const n = part("battery", V(0, BASE_TOP, 2.9), V(0, 3.5, 8));
    const tex = (() => {
      const c = document.createElement("canvas"); c.width = 512; c.height = 256;
      const g = c.getContext("2d")!;
      g.fillStyle = "#25282d"; g.fillRect(0, 0, 512, 256);
      g.fillStyle = "#e0782c"; g.fillRect(0, 90, 512, 76);
      g.fillStyle = "#ffffff"; g.textAlign = "center"; g.font = "bold 54px sans-serif"; g.fillText("BATTERY", 256, 146);
      const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const side = std({ color: 0x25282d, roughness: 0.45 }), top = std({ map: tex, roughness: 0.45 });
    add(n, rbox(6.2, 2.4, 3.0, 0.3), [side, side, top, side, side, side], 0, 1.2, 0);
    term("bat.pos", "battery", -1.2, 1.4, -1.55);
    term("bat.neg", "battery", -0.6, 1.4, -1.55);
  }

  /* ---------- Arduino Uno on the top plate ---------- */
  const usbPort = new THREE.Group();
  {
    const n = part("arduino", V(-0.6, TOP_TOP + 0.7, -3.5), V(0, 14, -3));
    const L = 6.86, W = 5.34;
    // the digital header runs along the board's front edge (+z), the power header along its back edge
    const tex = pcbTexture(L, W, "#0b6e99", (g, Wp, Hp) => {
      g.fillStyle = "#e8f6fb"; g.textAlign = "center";
      g.font = `bold ${Hp * 0.12}px sans-serif`; g.fillText("UNO", Wp * 0.5, Hp * 0.5);
      g.font = `${Hp * 0.055}px sans-serif`; g.fillText("ARDUINO", Wp * 0.5, Hp * 0.59);
      g.font = `bold ${Hp * 0.045}px sans-serif`;
      g.fillText("POWER", Wp * 0.42, Hp * 0.12); g.fillText("DIGITAL (PWM ~)", Wp * 0.55, Hp * 0.92);
    });
    add(n, box(L, 0.16, W), pcbMaterials(tex, 0x07506f), 0, 0, 0);
    for (const [x, z] of [[-2.9, -2.2], [2.9, -2.2], [-2.9, 2.2], [2.9, 2.2]]) add(n, cyl(0.25, 0.25, 0.6, 6), M.brass, x, -0.38, z);
    const usb = add(n, rbox(1.6, 1.1, 1.2, 0.05), M.usb, -L / 2 + 0.45, 0.62, 1.2);
    usbPort.position.copy(usb.position); n.group.add(usbPort);
    add(n, box(1.35, 1.05, 0.9), M.jack, -L / 2 + 0.55, 0.6, -1.75);
    add(n, box(3.55, 0.35, 0.75), M.chip, 0.6, 0.3, 0.6);
    add(n, box(18 * PIN, 0.85, 0.25), M.headerBlack, 0.7, 0.5, W / 2 - 0.25);
    add(n, box(14 * PIN, 0.85, 0.25), M.headerBlack, 0.4, 0.5, -W / 2 + 0.25);
    const front = W / 2 - 0.25, back = -W / 2 + 0.25;
    const dig: [string, number][] = [["uno.d2", 2.6], ["uno.d3", 2.35], ["uno.d5", 1.85], ["uno.d6", 1.6], ["uno.d7", 1.35], ["uno.d8", 0.85], ["uno.d9", 0.6], ["uno.d10", 0.35], ["uno.gnd2", -0.65]];
    for (const [t, x] of dig) { add(n, box(0.06, 0.6, 0.06), M.gold, x, 0.95, front); term(t, "arduino", x, 1.0, front); }
    for (const [t, x] of [["uno.5v", -0.2], ["uno.gnd", 0.05]] as [string, number][]) { add(n, box(0.06, 0.6, 0.06), M.gold, x, 0.95, back); term(t, "arduino", x, 1.0, back); }
  }

  /* ---------- HC-05 on the top plate, at the front ---------- */
  {
    const n = part("bt", V(3.4, TOP_TOP + 0.45, 3.6), V(4, 13, 5));
    const tex = pcbTexture(1.6, 3.7, "#1f4fa8", (g, W, H) => {
      g.fillStyle = "#eef3fb"; g.textAlign = "center";
      g.font = `bold ${W * 0.16}px sans-serif`; g.fillText("HC-05", W / 2, H * 0.5);
      g.font = `bold ${W * 0.09}px sans-serif`; g.fillText("VCC GND TXD RXD", W / 2, H * 0.08);
    });
    add(n, box(1.6, 0.16, 3.7), pcbMaterials(tex, 0x173d84), 0, 0, 0);
    add(n, box(1.25, 0.2, 2.6), M.chip, 0, 0.17, 0.4);                         // the radio board
    add(n, box(0.14, 0.06, 0.1), M.ledRed, 0.55, 0.13, -1.1);
    add(n, box(6 * PIN, 0.25, 0.25), M.headerBlack, 0, 0.12, -1.95);
    (["bt.vcc", "bt.gnd", "bt.txd", "bt.rxd"] as const).forEach((t, i) => { const x = (i - 1.5) * PIN; add(n, box(0.06, 0.06, 0.6), M.gold, x, 0.12, -2.25); term(t, "bt", x, 0.12, -2.55); });
    for (const [x, z] of [[-0.6, 1.4], [0.6, 1.4]]) add(n, cyl(0.2, 0.2, 0.45, 6), M.brass, x, -0.3, z);
  }

  /* ---------- power switch: rocker on the top plate's edge, terminals underneath ---------- */
  const rocker = new THREE.Group();
  {
    const n = part("switch", V(5.6, TOP.y, -2.2), V(6, 10, -2));
    add(n, rbox(1.6, 1.4, 1.0, 0.1), M.switchBody, 0, -0.55, 0);
    add(n, rbox(1.75, 0.18, 1.15, 0.06), M.switchBody, 0, TOP.t + 0.09, 0);
    const r = add(n, rbox(1.2, 0.3, 0.8, 0.08), M.rocker, 0, TOP.t + 0.28, 0); r.rotation.z = 0.15;
    rocker.position.set(0, TOP.t + 0.4, 0); n.group.add(rocker);
    for (const dx of [-0.35, 0.35]) add(n, box(0.12, 0.5, 0.35), M.copperTab, dx, -1.45, 0);
    term("sw.in", "switch", -0.35, -1.7, 0);
    term("sw.out", "switch", 0.35, -1.7, 0);
  }

  /* ---------- hardware: deck screws, board screws ---------- */
  {
    const anchors = STANDOFFS.map(([x, z]) => V(x, 0, z));
    const n = part("hardware", V(0, 0, 0), V(0, 3, 0), anchors);
    for (const [x, z] of STANDOFFS) add(n, cyl(0.32, 0.32, 0.14, 6), M.screw, x, BASE.y - 0.08, z);
    for (const sx of [-1, 1]) for (const dz of [-0.8, 0.8]) add(n, cyl(0.2, 0.2, 0.14, 12), M.screw, sx * 2.65, BASE_TOP + 0.07, dz);
  }

  /* ---------- the lightweight ball for the last test (not a BOM part: shown in step 12 only) ---------- */
  const track = new THREE.Group();
  {
    const ball = new THREE.Mesh(geo("ball", () => new THREE.SphereGeometry(2.1, 40, 28)), M.ball);
    ball.position.set(0, 2.1, 13.5);
    ball.castShadow = true;
    track.add(ball);
    track.visible = false;
    root.add(track);
  }

  /* ---------- wires ---------- */
  const wires = new Map<string, KitWire>();
  const wiresNode = part("wires", V(0, 0, 0), V(0, 0, 0));
  const plugGeo = box(0.26, 1.2, 0.26);
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
  /* assembled routes: motor leads up through the base-plate slots to the driver's side terminals; driver jumpers up
     through the top plate's middle slot to the Arduino; the battery's leads to the switch underneath the top plate */
  const via = (c: KitConnection, a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3[] | null => {
    if (c.kind === "Motor") { const sx = Math.sign(a.x), o = c.id.endsWith("2") ? 0.18 : 0; return [V(sx * (3.1 + o), BASE.y - 0.5, -0.6), V(sx * (3.1 + o), BASE_TOP + 0.6, -0.6), V(b.x + sx * 0.6, b.y + 0.4, b.z + 0.3)]; }
    if (c.from.part === "driver") { const x = THREE.MathUtils.clamp(a.x, -2.2, 2.2); return [V(a.x, a.y + 1.0, a.z + 0.2), V(x, TOP.y - 0.6, -0.1), V(x, TOP_TOP + 0.6, -0.1)]; }
    if (c.id === "c-bat+") return [V(a.x, a.y + 0.6, a.z - 0.3), V(3.5, TOP.y - 0.8, -1.5)];
    if (c.id === "c-sw") return [V(b.x + 2.5, TOP.y - 1.2, -2.3), V(b.x, b.y + 0.9, b.z + 0.5)];
    if (c.id === "c-bat-") return [V(a.x, a.y + 0.5, a.z - 0.4), V(b.x, b.y + 0.7, b.z + 0.4)];
    return null;
  };
  function updateWires() {
    root.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    for (const w of wires.values()) {
      terminalWorld(w.conn.from.terminal, tA).applyMatrix4(inv);
      terminalWorld(w.conn.to.terminal, tB).applyMatrix4(inv);
      const up = w.conn.jumper ? 0.6 : 0.25;
      const pts = [tA.clone()];
      const path = explodeK < 0.02 ? via(w.conn, tA, tB) : null;
      if (path) pts.push(...path);
      else {
        const span = tA.distanceTo(tB);
        const lift = Math.max(tA.y, tB.y) + Math.min(2.6, 0.6 + span * 0.16);
        pts.push(tA.clone().add(V(0, up, 0)), tA.clone().lerp(tB, 0.5).setY(lift), tB.clone().add(V(0, up, 0)));
      }
      pts.push(tB.clone());
      const geoW = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5), 64, w.conn.jumper ? 0.065 : 0.08, 8, false);
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
      const a = n.id === "hardware" ? anchor.clone().sub(n.home) : anchor.clone();
      const p = n.home.clone().add(a);
      const line = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints([p, p])), guideMat);
      line.visible = false; root.add(line);
      guides.push({ node: n, anchor: a, line });
    }
  }

  const spread = new THREE.Vector3(1, 1, 1);
  const tmpAway = new THREE.Vector3(), pa = new THREE.Vector3(), pb = new THREE.Vector3();
  const ORDER = ["arduino", "bt", "switch", "topPlate", "hardware", "battery", "driver", "wires", "wheelL", "wheelR", "motorL", "motorR", "chassis"];
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
    features: { usb: usbPort, switch: rocker },
    setExplode, terminalWorld,
    setSpread(x: number, y: number, z: number) { spread.set(x, y, z); setExplode(explodeK); },
    dispose() {
      for (const w of wires.values()) w.mesh.geometry.dispose();
      geoCache.forEach((g) => g.dispose());
      disposables.forEach((d) => d.dispose());
    },
  };
}
