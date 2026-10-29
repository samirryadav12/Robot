import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/* Nesto, the curious RoboNest robot (front = +z). Geometry, materials and idle animation are ported
   one-to-one from the RoboNest homepage so the guide looks and moves exactly like the original. */

export interface Nesto {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  eyes: THREE.Mesh[];
  mouth: THREE.Mesh;
  tip: THREE.Mesh;
  armL: { shoulder: THREE.Group; elbow: THREE.Group };
  armR: { shoulder: THREE.Group; elbow: THREE.Group };
  legs: THREE.Group[];
  flames: THREE.Mesh[];
  materials: Record<string, THREE.Material>;
  dispose: () => void;
}

const rbox = (w: number, h: number, d: number, r = 0.04) => new RoundedBoxGeometry(w, h, d, 4, r);
const cyl = (r: number, h: number, s = 20) => new THREE.CylinderGeometry(r, r, h, s);
const sph = (r: number) => new THREE.SphereGeometry(r, 28, 20);
const caps = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 8, 18);

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function haloTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.22, "rgba(255,255,255,.42)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildNesto(haloTex: THREE.Texture): Nesto {
  const NM = {
    plastic: new THREE.MeshPhysicalMaterial({ color: 0xfbf7f1, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.18 }),
    visor: new THREE.MeshPhysicalMaterial({ color: 0x0c1016, roughness: 0.06, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.03 }),
    accent: new THREE.MeshPhysicalMaterial({ color: 0xc8592e, roughness: 0.35, clearcoat: 0.6 }),
    joint: new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.45, metalness: 0.4 }),
    pack: new THREE.MeshStandardMaterial({ color: 0xddd6cb, roughness: 0.5 }),
    face: new THREE.MeshStandardMaterial({ color: 0x331408, emissive: 0xff8a3d, emissiveIntensity: 2.6, roughness: 0.4 }),
    ledGreen: new THREE.MeshStandardMaterial({ color: 0x0a2a12, emissive: 0x3ccb8a, emissiveIntensity: 1.4, roughness: 0.4 }),
    halo: new THREE.SpriteMaterial({ map: haloTex, color: 0xff8a3d, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
    flame: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.55, 0.2), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }),
  };
  const halo = (size: number, x = 0, y = 0, z = 0) => {
    const h = new THREE.Sprite(NM.halo);
    h.scale.setScalar(size);
    h.position.set(x, y, z);
    return h;
  };

  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  body.add(mesh(rbox(1.0, 1.05, 0.8, 0.32), NM.plastic));
  body.add(mesh(rbox(0.56, 0.42, 0.08, 0.06), NM.visor, 0, 0.06, 0.39));
  body.add(mesh(new THREE.TorusGeometry(0.11, 0.026, 12, 48), NM.face, 0, 0.08, 0.44));
  body.add(halo(0.6, 0, 0.08, 0.5));
  body.add(mesh(sph(0.025), NM.ledGreen, -0.18, -0.08, 0.44), mesh(sph(0.025), NM.face, 0.18, -0.08, 0.44));
  body.add(mesh(new THREE.TorusGeometry(0.42, 0.05, 12, 48), NM.joint, 0, -0.45, 0).rotateX(Math.PI / 2));
  body.add(mesh(cyl(0.18, 0.16, 18), NM.joint, 0, 0.6, 0));

  const head = new THREE.Group();
  head.position.y = 1.02;
  body.add(head);
  head.add(mesh(rbox(1.22, 0.94, 0.98, 0.4), NM.plastic));
  head.add(mesh(rbox(1.0, 0.62, 0.14, 0.24), NM.visor, 0, -0.02, 0.44));
  const eyes = [-0.21, 0.21].map((x) => {
    const e = mesh(caps(0.065, 0.12), NM.face, x, 0.02, 0.52);
    head.add(e);
    return e;
  });
  const mouth = mesh(new THREE.TorusGeometry(0.07, 0.017, 8, 20, Math.PI), NM.face, 0, -0.15, 0.515);
  mouth.rotation.z = Math.PI;
  head.add(mouth);
  for (const s of [-1, 1]) {
    const ear = mesh(cyl(0.16, 0.12, 28), NM.accent, s * 0.63, 0, 0);
    ear.rotation.z = Math.PI / 2;
    head.add(ear);
    const ring = mesh(new THREE.TorusGeometry(0.09, 0.02, 8, 28), NM.face, s * 0.695, 0, 0);
    ring.rotation.y = Math.PI / 2;
    head.add(ring);
  }
  head.add(halo(0.9, 0, 0.02, 0.6));
  head.add(mesh(cyl(0.022, 0.34, 8), NM.joint, 0.22, 0.6, -0.1));
  const tip = mesh(sph(0.07), NM.face, 0.22, 0.8, -0.1);
  head.add(tip);
  tip.add(halo(0.5));

  const arm = (s: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.62, 0.28, 0);
    body.add(shoulder);
    shoulder.add(mesh(sph(0.17), NM.accent));
    shoulder.add(mesh(caps(0.12, 0.28), NM.plastic, 0, -0.28, 0));
    const elbow = new THREE.Group();
    elbow.position.y = -0.5;
    shoulder.add(elbow);
    elbow.add(mesh(sph(0.1), NM.joint));
    elbow.add(mesh(caps(0.11, 0.22), NM.plastic, 0, -0.2, 0));
    elbow.add(mesh(rbox(0.24, 0.26, 0.22, 0.1), NM.accent, 0, -0.46, 0));
    return { shoulder, elbow };
  };
  const armL = arm(-1), armR = arm(1);

  const legs = [-1, 1].map((s) => {
    const hip = new THREE.Group();
    hip.position.set(s * 0.27, -0.55, 0);
    body.add(hip);
    hip.add(mesh(caps(0.13, 0.18), NM.plastic, 0, -0.2, 0));
    hip.add(mesh(rbox(0.32, 0.24, 0.44, 0.1), NM.accent, 0, -0.48, 0.05));
    return hip;
  });

  body.add(mesh(rbox(0.8, 0.84, 0.38, 0.14), NM.pack, 0, 0.06, -0.55));
  body.add(mesh(rbox(0.5, 0.12, 0.05, 0.03), NM.accent, 0, 0.28, -0.75));
  const flames = [-0.2, 0.2].map((x) => {
    body.add(mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.2, 20), NM.joint, x, -0.44, -0.58));
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 18, 1, true), NM.flame);
    f.position.set(x, -0.82, -0.58);
    f.rotation.x = Math.PI;
    body.add(f, halo(0.7, x, -0.75, -0.58));
    return f;
  });

  const dispose = () => {
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose();
    });
    Object.values(NM).forEach((m) => m.dispose());
  };

  return { root, body, head, eyes, mouth, tip, armL, armR, legs, flames, materials: NM, dispose };
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export interface NestoPose {
  t: number;          // seconds
  dt: number;
  look: THREE.Vector3; // world point the head turns to
  happy: boolean;      // squinting smile, as when the homepage visitor hovers him
  pointing: boolean;   // right arm points out, as when he guides to a learning path
  waving: boolean;
  speed: number;       // travel speed, feeds the jets
  landed: number;      // 0 hovering … 1 standing on the ground (jets off, legs still)
  reduced: boolean;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => { const x = clamp((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
// neck range for the head look, in radians: ~57° either side, ~29° up, ~31° down
const NECK = { yaw: 1.0, up: 0.5, down: 0.55 };
// pace of idle motion relative to real time, matching the homepage's AMBIENT
const AMBIENT = 0.8;

/* The homepage's face / arms / legs / jets animation, unchanged in character. */
export function createNestoAnimator(n: Nesto) {
  const qAim = new THREE.Quaternion(), qBody = new THREE.Quaternion(), headPos = new THREE.Vector3(), dir = new THREE.Vector3();
  const eAim = new THREE.Euler(0, 0, 0, "YXZ");
  let nextBlink = 2, blinkUntil = 0;
  const face = n.materials.face as THREE.MeshStandardMaterial;
  return (p: NestoPose) => {
    const { t, dt, reduced } = p;
    if (t > nextBlink) { blinkUntil = t + 0.12; nextBlink = t + 2.2 + Math.random() * 2.8; }
    const eyeY = t < blinkUntil && !reduced ? 0.1 : p.happy ? 0.45 : 1;
    n.eyes.forEach((e) => { e.scale.y = lerp(e.scale.y, eyeY, 1 - Math.exp(-dt * 20)); });
    n.mouth.scale.setScalar(lerp(n.mouth.scale.x, p.happy ? 1.5 : 1, 1 - Math.exp(-dt * 10)));
    face.emissiveIntensity = 2.4 + Math.sin(t * 3) * 0.3 + (p.happy ? 1 : 0);
    n.tip.scale.setScalar(Math.sin(t * 4) > 0.6 ? 1.25 : 1);

    // the look is solved in the torso's own frame (head faces +z, torso +y is up) rather than with a world-space
    // lookAt, so it stays correct however the body is turned or tilted in flight. Yaw fades out for targets behind
    // him, so the neck never swivels round or flips side to side; both axes are limited to a believable range.
    n.head.getWorldPosition(headPos);
    n.body.getWorldQuaternion(qBody).invert();
    dir.subVectors(p.look, headPos).applyQuaternion(qBody);
    const len = dir.length();
    let yaw = 0, pitch = 0;
    if (len > 1e-6) {
      dir.divideScalar(len);
      yaw = clamp(Math.atan2(dir.x, dir.z), -NECK.yaw, NECK.yaw) * smooth(-0.6, -0.05, dir.z);
      pitch = clamp(-Math.asin(clamp(dir.y, -1, 1)), -NECK.up, NECK.down);
    }
    qAim.setFromEuler(eAim.set(pitch, yaw, 0));
    n.head.quaternion.slerp(qAim, 1 - Math.exp(-dt * 4));

    // same pacing as the homepage: idle motion at AMBIENT of real time, calmer wave and arm moves
    const T = reduced ? 0 : t * AMBIENT;
    const wv = reduced ? 0 : Math.sin(t * 9.6);
    n.armR.shoulder.rotation.z = lerp(n.armR.shoulder.rotation.z, p.waving ? 2.6 + wv * 0.25 : p.pointing ? 1.45 : 0.3 + Math.sin(T * 1.1) * 0.08, 1 - Math.exp(-dt * 6.5));
    n.armR.elbow.rotation.z = lerp(n.armR.elbow.rotation.z, p.waving ? 0.5 + wv * 0.35 : 0.15, 1 - Math.exp(-dt * 6.5));
    n.armL.shoulder.rotation.z = -0.3 - Math.sin(T * 1.1 + 1) * 0.08;
    n.armL.elbow.rotation.z = -0.2;
    const swing = 1 - p.landed;
    n.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(T * 1.4 + i * 1.7) * 0.15 * swing; });
    n.flames.forEach((fl, i) => {
      const sc = (reduced ? 1 : 0.8 + Math.sin(t * 40 + i * 2) * 0.12 + Math.random() * 0.12 + Math.min(p.speed * 0.35, 0.8)) * swing;
      fl.visible = sc > 0.02;
      fl.scale.set(1, Math.max(sc, 0.001), 1);
      fl.position.y = -0.56 - 0.275 * sc;
    });
  };
}
