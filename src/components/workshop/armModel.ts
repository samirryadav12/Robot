import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CONNECTIONS } from "./armData";
import type { KitConnection, KitModel, KitPartNode, KitWire } from "./kit";
import { wireHex } from "./wiringStyle";

/* A detailed, procedural Robotic Arm 4-DOF built from the project's actual hardware (src/data/projects.ts): a base
   and column, a turntable with the shoulder bracket, upper arm and forearm links, a geared claw, four standard servos
   with their horns, an Arduino Uno and the external 5 V supply. Units are centimetres; +x right, +y up, +z the
   direction the arm reaches. It stands in a reaching pose: upper arm 25° forward of vertical, forearm 20° below
   horizontal. Every part is its own group (installed pose + exploded offset) so it can be selected, isolated,
   highlighted and exploded; wires are rebuilt from named terminals so they stay attached while the parts move. */

type Node = KitPartNode & { anchors: THREE.Vector3[] };

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const qx = (a: number) => new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), a);
const deg = THREE.MathUtils.degToRad;

/* the pose (world, cm) */
const COL = V(0, 0, 2);                       // the column's axis on the base plate
const BASE_SHAFT = V(0, 6.0, 2);              // base servo shaft top, under the turntable
const SHOULDER = V(0, 9.6, 2);
const L1 = 10.5, L2 = 11;
const UP_Q = qx(deg(25));                     // upper arm: local +y, tipped 25° forward
const FORE_Q = qx(deg(20));                   // forearm: local +z, dipped 20°
const ELBOW = SHOULDER.clone().add(V(0, L1, 0).applyQuaternion(UP_Q));
const WRIST = ELBOW.clone().add(V(0, 0, L2).applyQuaternion(FORE_Q));

export function buildArmModel(): KitModel {
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
    orange: keep(new THREE.MeshPhysicalMaterial({ color: 0xe0782c, roughness: 0.38, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.3 })),
    grey: keep(new THREE.MeshPhysicalMaterial({ color: 0xc9ccd0, roughness: 0.4, metalness: 0.35, clearcoat: 0.4 })),
    darkGrey: std({ color: 0x4a4f56, roughness: 0.45, metalness: 0.6 }),
    alu: std({ color: 0xb7bcc2, roughness: 0.3, metalness: 0.9 }),
    servo: std({ color: 0x1d2a44, roughness: 0.5 }),
    servoCap: std({ color: 0x15181d, roughness: 0.45 }),
    label: std({ color: 0xe7e3d8, roughness: 0.6 }),
    spline: std({ color: 0xd9b45a, roughness: 0.3, metalness: 1 }),
    horn: std({ color: 0xf2f0ea, roughness: 0.45 }),
    screw: std({ color: 0xb8bcc2, roughness: 0.3, metalness: 1 }),
    rubber: std({ color: 0x1c1e21, roughness: 0.9 }),
    gear: std({ color: 0xd8dbe0, roughness: 0.3, metalness: 0.85 }),
    pad: std({ color: 0x23262b, roughness: 0.85 }),
    headerBlack: std({ color: 0x17191c, roughness: 0.6 }),
    gold: std({ color: 0xe3bd5f, roughness: 0.25, metalness: 1 }),
    chip: std({ color: 0x141619, roughness: 0.45 }),
    usb: std({ color: 0xbfc3c9, roughness: 0.25, metalness: 1 }),
    jack: std({ color: 0x141518, roughness: 0.5 }),
    psu: std({ color: 0x222428, roughness: 0.55 }),
    terminal: std({ color: 0x2c8c55, roughness: 0.55 }),
    ledGreen: std({ color: 0x0f5a2c, emissive: 0x3ce07a, emissiveIntensity: 0.9, roughness: 0.3 }),
    plug: std({ color: 0x18191c, roughness: 0.5 }),
  };

  function pcbTexture(w: number, h: number, base: string, draw: (g: CanvasRenderingContext2D, W: number, H: number) => void) {
    const W = 1024, H = Math.round((1024 * h) / w);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.16;
    g.strokeStyle = "#ffffff";
    g.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      g.beginPath();
      const y = (i * 37) % H, x = (i * 91) % W;
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
  // a link side plate: a stadium of the given length along +y (or +z), with bearing bosses at both ends
  const stadium = (len: number, w: number, t: number, along: "y" | "z") => geo(`st${len}|${w}|${t}|${along}`, () => {
    const s = new THREE.Shape(), r = w / 2;
    s.moveTo(-r, 0);
    s.absarc(0, 0, r, Math.PI, Math.PI * 2, false);
    s.lineTo(r, len);
    s.absarc(0, len, r, 0, Math.PI, false);
    s.lineTo(-r, 0);
    const slot = new THREE.Path();
    slot.moveTo(-r * 0.38, len * 0.28); slot.lineTo(r * 0.38, len * 0.28); slot.lineTo(r * 0.38, len * 0.72); slot.lineTo(-r * 0.38, len * 0.72); slot.lineTo(-r * 0.38, len * 0.28);
    s.holes.push(slot);
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 20 });
    g.translate(0, 0, -t / 2);
    g.rotateY(Math.PI / 2);                     // thickness along x, shape in the y–z plane (length along +y)
    if (along === "z") g.rotateX(Math.PI / 2);  // length along +z
    return g;
  });

  const root = new THREE.Group();
  const parts = new Map<string, Node>();
  const terminals = new Map<string, { part: string; local: THREE.Vector3 }>();
  const part = (id: string, home: THREE.Vector3, away: THREE.Vector3, q = new THREE.Quaternion(), anchors: THREE.Vector3[] = [V(0, 0, 0)]) => {
    const g = new THREE.Group();
    g.name = id;
    g.position.copy(home);
    g.quaternion.copy(q);
    root.add(g);
    const node: Node = { id, group: g, home: home.clone(), homeQ: q.clone(), away, meshes: [], anchors };
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
  const term = (t: string, p: string, x: number, y: number, z: number) => terminals.set(t, { part: p, local: V(x, y, z) });

  /* ---------- a standard servo: output shaft on local +y at the origin, body below, cable out of the -x end ---------- */
  const servoLabel = (() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#1d2a44"; g.fillRect(0, 0, 512, 256);
    g.fillStyle = "#e7e3d8"; g.fillRect(30, 60, 452, 136);
    g.fillStyle = "#1d2a44"; g.textAlign = "center";
    g.font = "bold 64px sans-serif"; g.fillText("SERVO", 256, 140);
    g.font = "bold 30px sans-serif"; g.fillText("5 V · STANDARD", 256, 182);
    const t = keep(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const servoSide = std({ map: servoLabel, roughness: 0.5 });
  function buildServo(n: Node) {
    // body 4.0 long (x) × 3.8 tall × 2.0 deep, shaft 1.0 from one end
    const body = add(n, rbox(4.0, 3.8, 2.0, 0.15), [M.servo, M.servo, M.servo, M.servo, servoSide, servoSide], -1.0, -2.3, 0);
    void body;
    add(n, box(5.4, 0.25, 2.0), M.servo, -1.0, -0.95, 0);                    // mounting flange
    for (const sx of [-1, 1]) for (const dz of [-0.5, 0.5]) add(n, cyl(0.12, 0.12, 0.4, 8), M.screw, -1.0 + sx * 2.4, -0.85, dz);
    add(n, cyl(0.85, 0.85, 0.35, 24), M.servoCap, 0, -0.25, 0);             // gear hump
    add(n, cyl(0.6, 0.65, 0.2, 20), M.servoCap, -1.2, -0.35, 0);
    add(n, cyl(0.28, 0.28, 0.45, 16), M.spline, 0, 0.15, 0);                // splined output shaft
    add(n, rbox(0.5, 0.45, 0.8, 0.1), M.servoCap, -3.1, -3.6, 0);           // cable gland
    term(`${n.id}.lead`, n.id, -3.45, -3.6, 0);
  }

  /* ---------- base plate and column ---------- */
  {
    const n = part("base", V(0, 0, 0), V(0, 0, 0));
    add(n, rbox(13, 0.6, 19, 0.4), M.grey, 0, 0.3, -2.5);
    for (const [x, z] of [[-5.6, -11], [5.6, -11], [-5.6, 6], [5.6, 6]]) add(n, cyl(0.6, 0.7, 0.25, 20), M.rubber, x, -0.02, z);
    // the column: a flanged foot, four pillars round the base servo, and a bearing ring under the turntable
    add(n, cyl(3.6, 3.9, 0.5, 40), M.darkGrey, COL.x, 0.85, COL.z);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      add(n, rbox(0.9, 4.0, 0.9, 0.2), M.grey, COL.x + Math.cos(a) * 2.75, 3.05, COL.z + Math.sin(a) * 2.75);
    }
    add(n, geo("ring", () => new THREE.TorusGeometry(3.2, 0.14, 10, 48)), M.alu, COL.x, 5.5, COL.z).rotation.x = Math.PI / 2;
  }

  /* ---------- base servo inside the column, shaft up ---------- */
  const shaftAt: Record<string, THREE.Vector3> = {};
  {
    const n = part("sBase", BASE_SHAFT.clone(), V(-8, 0.5, 0));
    buildServo(n);
    shaftAt.sBase = BASE_SHAFT.clone().add(V(0, 0.4, 0));
  }

  /* ---------- turntable and shoulder bracket (orange) ---------- */
  {
    const n = part("turret", V(0, 6.4, 2), V(0, 5, 0));
    add(n, cyl(3.7, 3.7, 0.6, 48), M.orange, 0, 0.3, 0);
    add(n, cyl(1.2, 1.2, 0.15, 24), M.alu, 0, 0.68, 0);
    for (const sx of [-1, 1]) {
      // yoke cheeks up to the shoulder axle
      const cheek = add(n, rbox(0.55, 3.9, 3.6, 0.3), M.orange, sx * 2.45, 2.55, 0);
      void cheek;
      add(n, cyl(1.0, 1.0, 0.7, 28), M.darkGrey, sx * 2.45, SHOULDER.y - 6.4, 0).rotation.z = Math.PI / 2;   // bearing boss
    }
  }

  /* ---------- shoulder servo on the left cheek, shaft pointing inward along +x, cable out of the bottom ---------- */
  const sideQ = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(1, 0, 0)).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI));
  {
    const at = SHOULDER.clone().add(V(-3.25, 0, 0));
    const n = part("sShoulder", at, V(-6, 5, 0), sideQ);
    buildServo(n);
    shaftAt.sShoulder = at.clone().add(V(0.4, 0, 0));
  }

  /* ---------- upper arm: two grey side plates between the shoulder and elbow axles ---------- */
  {
    const n = part("upperArm", SHOULDER.clone(), V(0, 6, 1), UP_Q);
    for (const sx of [-1, 1]) add(n, stadium(L1, 3.0, 0.4, "y"), M.grey, sx * 1.95, 0, 0);
    for (const y of [L1 * 0.3, L1 * 0.7]) add(n, cyl(0.35, 0.35, 3.5, 16), M.alu, 0, y, 0).rotation.z = Math.PI / 2;
    for (const y of [0, L1]) add(n, cyl(0.25, 0.25, 4.6, 16), M.screw, 0, y, 0).rotation.z = Math.PI / 2;  // axles
  }

  /* ---------- elbow servo, same side, driving the forearm ---------- */
  {
    const at = ELBOW.clone().add(V(-3.05, 0, 0));
    const n = part("sElbow", at, V(-6, 6, 1), sideQ);
    buildServo(n);
    shaftAt.sElbow = at.clone().add(V(0.4, 0, 0));
  }

  /* ---------- forearm: orange side plates from the elbow to the wrist plate ---------- */
  {
    const n = part("forearm", ELBOW.clone(), V(0, 8, 3), FORE_Q);
    for (const sx of [-1, 1]) add(n, stadium(L2, 2.6, 0.4, "z"), M.orange, sx * 1.6, 0, 0);
    add(n, cyl(1.15, 1.15, 3.8, 28), M.darkGrey, 0, 0, 0).rotation.z = Math.PI / 2;     // elbow hub
    add(n, rbox(3.6, 2.6, 0.4, 0.15), M.grey, 0, 0, L2);                                  // wrist plate
    add(n, cyl(0.35, 0.35, 3.0, 16), M.alu, 0, 0, L2 * 0.5).rotation.z = Math.PI / 2;
  }

  /* ---------- gripper: base plate, two meshing gears, two jaws with pads ---------- */
  const claw = new THREE.Group();
  const GRIP_AT = WRIST.clone().add(V(0, 0, 0.25).applyQuaternion(FORE_Q));
  {
    const n = part("gripper", GRIP_AT, V(0, 8, 7), FORE_Q);
    add(n, rbox(4.6, 0.35, 3.4, 0.15), M.grey, 0, -0.6, 1.7);
    add(n, rbox(3.4, 2.4, 0.35, 0.15), M.grey, 0, 0, 0.15);
    for (const sx of [-1, 1]) {
      const gear = add(n, geo("gear", () => {
        const s = new THREE.Shape();
        const teeth = 14;
        for (let i = 0; i <= teeth * 2; i++) {
          const a = (i / (teeth * 2)) * Math.PI * 2, r = i % 2 ? 0.78 : 0.92;
          if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        const g = new THREE.ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: false });
        g.rotateX(-Math.PI / 2);
        return g;
      }), M.gear, sx * 0.85, -0.42, 1.6);
      void gear;
      // jaw: an arm from the gear forward, then the finger with a rubber pad on the inside
      const jaw = add(n, rbox(0.45, 0.5, 4.2, 0.15), M.orange, sx * 1.15, -0.4, 4.4);
      jaw.rotation.y = sx * -0.12;
      add(n, rbox(0.35, 0.7, 2.0, 0.12), M.darkGrey, sx * 0.65, -0.4, 7.0);
      add(n, box(0.12, 0.6, 1.8), M.pad, sx * 0.43, -0.4, 7.0);
    }
    claw.position.set(0, -0.4, 7.2);
    n.group.add(claw);
  }

  /* ---------- gripper servo on top of the claw plate, shaft down into the gear ---------- */
  {
    const gq = FORE_Q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI));
    const at = GRIP_AT.clone().add(V(-0.85, 0.4, 1.6).applyQuaternion(FORE_Q));
    const n = part("sGrip", at, V(0, 11.5, 7), gq);
    buildServo(n);
    shaftAt.sGrip = at.clone();
  }

  /* ---------- servo horns: one on each shaft ---------- */
  const hornShoulder = new THREE.Group();
  {
    const anchors = (["sBase", "sShoulder", "sElbow", "sGrip"] as const).map((k) => shaftAt[k].clone());
    const n = part("horns", V(0, 0, 0), V(3, 2.5, 0), new THREE.Quaternion(), anchors);
    const hornGeo = geo("horn", () => {
      const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.5, 0.5, 0.22, 20)];
      for (let i = 0; i < 4; i++) { const b = new THREE.BoxGeometry(0.42, 0.18, 1.9); b.translate(0, 0, 0.95); b.rotateY((i * Math.PI) / 2); parts.push(b); }
      const merged = mergeGeometries(parts.map((p) => p.index ? p.toNonIndexed() : p))!;
      parts.forEach((p) => p.dispose());
      return merged;
    });
    const place = (at: THREE.Vector3, axis: THREE.Vector3, obj?: THREE.Object3D) => {
      const h = add(n, hornGeo, M.horn, at.x, at.y, at.z);
      h.quaternion.setFromUnitVectors(V(0, 1, 0), axis);
      if (obj) { obj.position.copy(at); n.group.add(obj); }
    };
    place(shaftAt.sBase, V(0, 1, 0));
    place(shaftAt.sShoulder, V(1, 0, 0), hornShoulder);
    place(shaftAt.sElbow, V(1, 0, 0));
    place(shaftAt.sGrip, V(0, -1, 0).applyQuaternion(FORE_Q));
  }

  /* ---------- Arduino Uno on the base plate, behind the column ---------- */
  const usbPort = new THREE.Group();
  {
    const n = part("arduino", V(0, 1.4, -8.0), V(0, 5, -4));
    const L = 6.86, W = 5.34;
    const tex = pcbTexture(L, W, "#0b6e99", (g, Wp, Hp) => {
      g.fillStyle = "#e8f6fb"; g.textAlign = "center";
      g.font = `bold ${Hp * 0.12}px sans-serif`; g.fillText("UNO", Wp * 0.5, Hp * 0.55);
      g.font = `${Hp * 0.055}px sans-serif`; g.fillText("ARDUINO", Wp * 0.5, Hp * 0.64);
      g.font = `bold ${Hp * 0.05}px sans-serif`;
      // the digital header runs along the board's front edge (the canvas bottom): pins 3, 5, 6, 9 and GND
      [["~3", 0.205], ["~5", 0.28], ["~6", 0.315], ["~9", 0.45], ["GND", 0.635]].forEach(([t, x]) => g.fillText(String(t), Wp * Number(x), Hp * 0.86));
    });
    add(n, box(L, 0.16, W), pcbMaterials(tex, 0x07506f), 0, 0, 0);
    for (const [x, z] of [[-2.9, -2.2], [2.9, -2.2], [-2.9, 2.2], [2.9, 2.2]]) add(n, cyl(0.25, 0.25, 0.9, 6), M.gold, x, -0.5, z);
    const usb = add(n, rbox(1.6, 1.1, 1.2, 0.05), M.usb, -L / 2 + 0.45, 0.62, -1.4);
    usbPort.position.copy(usb.position);
    n.group.add(usbPort);
    add(n, box(1.35, 1.05, 0.9), M.jack, -L / 2 + 0.55, 0.6, 1.75);
    add(n, box(3.55, 0.35, 0.75), M.chip, 0.6, 0.3, -0.6);
    add(n, box(18 * 0.254, 0.85, 0.25), M.headerBlack, 0.5, 0.5, W / 2 - 0.25);
    // header pins used by the arm: D3, D5, D6, D9 and GND along the front edge
    const pins: [string, number][] = [["uno.d3", -1.95], ["uno.d5", -1.45], ["uno.d6", -1.2], ["uno.d9", -0.25], ["uno.gnd", 0.95]];
    for (const [t, x] of pins) { add(n, box(0.06, 0.62, 0.06), M.gold, x, 0.95, W / 2 - 0.25); term(t, "arduino", x, 1.0, W / 2 - 0.25); }
  }

  /* ---------- external 5 V supply beside the base: a brick with a screw-terminal output ---------- */
  const psuTerm = new THREE.Group();
  {
    const n = part("psu", V(-10.5, 0, -7.0), V(-6, 0, -3));
    add(n, rbox(4.2, 3.0, 7.0, 0.35), M.psu, 0, 1.5, 0);
    const lbl = (() => {
      const c = document.createElement("canvas"); c.width = 256; c.height = 512;
      const g = c.getContext("2d")!;
      g.fillStyle = "#222428"; g.fillRect(0, 0, 256, 512);
      g.fillStyle = "#e0782c"; g.fillRect(0, 200, 256, 90);
      g.fillStyle = "#ffffff"; g.textAlign = "center"; g.font = "bold 64px sans-serif"; g.fillText("5V", 128, 268);
      g.font = "bold 26px sans-serif"; g.fillText("REGULATED", 128, 340);
      const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    add(n, box(4.0, 0.02, 6.6), std({ map: lbl, roughness: 0.6 }), 0, 3.01, 0);
    add(n, box(0.12, 0.08, 0.12), M.ledGreen, 1.4, 3.05, 2.9);
    // output terminal block on the end facing the arm: + and −
    add(n, box(2.0, 1.0, 0.9), M.terminal, -0.6, 0.9, 3.9);
    for (const x of [-1.1, -0.1]) add(n, cyl(0.2, 0.2, 0.1, 12), M.screw, x, 1.45, 3.9);
    psuTerm.position.set(-0.6, 1.45, 3.9);
    n.group.add(psuTerm);
    term("psu.out", "psu", -1.1, 1.0, 4.4);
    term("psu.gnd", "psu", -0.1, 1.0, 4.4);
  }

  /* ---------- hardware: column bolts and base-plate screws ---------- */
  {
    const anchors = [V(-2.2, 0, 4.2), V(2.2, 0, -0.2)];
    const n = part("hardware", V(0, 0, 0), V(-4, 3, 4), new THREE.Quaternion(), anchors);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add(n, cyl(0.2, 0.2, 0.18, 6), M.screw, COL.x + Math.cos(a) * 3.3, 1.18, COL.z + Math.sin(a) * 3.3);
    }
    for (const [x, z] of [[-5.6, -11], [5.6, -11], [-5.6, 6], [5.6, 6]]) add(n, cyl(0.25, 0.25, 0.12, 12), M.screw, x, 0.66, z);
  }

  /* ---------- wires: rebuilt from the terminals, so they follow the parts in the exploded view ---------- */
  const wires = new Map<string, KitWire>();
  const wiresNode = part("wires", V(0, 0, 0), V(0, 0, 0));
  const plugGeo = box(0.26, 0.9, 0.26);
  const strandsOf = (c: KitConnection) => (c.id.startsWith("c-pwr") ? ["Red", "Black"] : [c.color]);
  for (const conn of CONNECTIONS) {
    const mats = strandsOf(conn).map((col) => std({ color: wireHex(col), roughness: 0.45, emissive: 0x000000 }));
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mats.length > 1 ? mats : mats[0]);
    mesh.castShadow = true;
    mesh.userData.part = "wires";
    mesh.userData.conn = conn.id;
    wiresNode.group.add(mesh);
    wiresNode.meshes.push(mesh);
    const plugs = conn.to.part === "arduino" ? [(() => { const p = new THREE.Mesh(plugGeo, M.plug); p.userData.part = "wires"; p.userData.conn = conn.id; wiresNode.group.add(p); wiresNode.meshes.push(p); return p; })()] : [];
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
  /* assembled routes: each servo cable runs down the right side of the arm, joint by joint, to the column, then
     back along the base plate to the Arduino (signals) or out to the supply (power) */
  const down: Record<string, THREE.Vector3[]> = {
    sGrip: [WRIST.clone().add(V(-2.4, 1.2, -2.5)), ELBOW.clone().add(V(-2.4, -0.8, 1.6))],
    sElbow: [],
    sShoulder: [],
    sBase: [],
  };
  const elbowDown = [ELBOW.clone().lerp(SHOULDER, 0.35).add(V(-2.6, 0, 0)), ELBOW.clone().lerp(SHOULDER, 0.75).add(V(-2.6, 0, 0))];
  const shoulderDown = [V(-3.9, 7.4, 2.6), V(-3.9, 1.0, 1.0)];
  down.sGrip.push(...elbowDown, ...shoulderDown);
  down.sElbow.push(...elbowDown, ...shoulderDown);
  down.sShoulder.push(...shoulderDown);
  down.sBase.push(V(-3.9, 2.4, 1.0), V(-3.4, 1.0, -1.0));
  const via = (c: KitConnection): THREE.Vector3[] | null => {
    const servo = c.from.part;
    if (!down[servo]) return c.id === "c-gnd" ? [V(-8, 1.2, -3.8), V(-1, 1.3, -3.6)] : null;
    const toPsu = c.to.part === "psu";
    const o = toPsu ? V(-0.3, 0, 0) : V(0, 0, 0);
    const pts = down[servo].map((p) => p.clone().add(o));
    pts.push(toPsu ? V(-7.5, 1.0, -2.6) : V(servo === "sBase" ? -2.2 : -1.2, 1.15, -3.6));
    return pts;
  };

  function updateWires() {
    root.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    for (const w of wires.values()) {
      terminalWorld(w.conn.from.terminal, tA).applyMatrix4(inv);
      terminalWorld(w.conn.to.terminal, tB).applyMatrix4(inv);
      const path = explodeK < 0.02 ? via(w.conn) : null;
      const pts = [tA.clone()];
      if (path) pts.push(...path);
      else {
        const span = tA.distanceTo(tB);
        const lift = Math.max(tA.y, tB.y) + Math.min(3, 0.6 + span * 0.12);
        pts.push(tA.clone().add(V(0, 0.5, 0)), tA.clone().lerp(tB, 0.5).setY(lift), tB.clone().add(V(0, 0.7, 0)));
      }
      if (w.conn.to.part === "arduino") pts.push(tB.clone().add(V(0, 0.9, 0)));
      pts.push(tB.clone());
      const n = strandsOf(w.conn).length;
      const r = 0.06;
      const side = V(tB.z - tA.z, 0, tA.x - tB.x).normalize().multiplyScalar(r * 2.3);
      const geos = Array.from({ length: n }, (_, i) => {
        const off = side.clone().multiplyScalar(i - (n - 1) / 2);
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => p.clone().add(off)), false, "centripetal", 0.5), 64, r, 7, false);
      });
      w.mesh.geometry.dispose();
      w.mesh.geometry = n > 1 ? mergeGeometries(geos, true)! : geos[0];
      if (n > 1) geos.forEach((g) => g.dispose());
      if (w.plugs.length) w.plugs[0].position.copy(tB).add(V(0, 0.5, 0));
    }
  }

  /* assembly axes: dashed lines from each mounting point to where the part sits in the exploded view */
  const guideMat = keep(new THREE.LineDashedMaterial({ color: 0x7d838b, dashSize: 0.4, gapSize: 0.3, transparent: true, opacity: 0.8 }));
  const guides: { node: Node; anchor: THREE.Vector3; line: THREE.Line }[] = [];
  for (const n of parts.values()) {
    if (n.away.length() < 0.1) continue;
    for (const anchor of n.anchors) {
      // anchors are world points for parts built in world space (horns, hardware), local offsets otherwise
      const worldAnchor = n.id === "horns" || n.id === "hardware";
      const a = worldAnchor ? anchor.clone().sub(n.home) : anchor.clone();
      const p = n.home.clone().add(a);
      const line = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints([p, p])), guideMat);
      line.visible = false;
      root.add(line);
      guides.push({ node: n, anchor: a, line });
    }
  }

  /* exploded ↔ assembled: every part moves out along its own offset and back to its exact installed pose. Parts
     leave one after another (the gripper end first, the base last) and return in reverse. */
  const spread = new THREE.Vector3(1, 1, 1);
  const tmpAway = new THREE.Vector3(), pa = new THREE.Vector3(), pb = new THREE.Vector3();
  const ORDER = ["sGrip", "gripper", "forearm", "sElbow", "upperArm", "horns", "sShoulder", "turret", "psu", "arduino", "wires", "hardware", "sBase", "base"];
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
    features: { usb: usbPort, psu: psuTerm, horn: hornShoulder, claw },
    setExplode, terminalWorld,
    setSpread(x: number, y: number, z: number) { spread.set(x, y, z); setExplode(explodeK); },
    dispose() {
      for (const w of wires.values()) w.mesh.geometry.dispose();
      geoCache.forEach((g) => g.dispose());
      disposables.forEach((d) => d.dispose());
    },
  };
}
