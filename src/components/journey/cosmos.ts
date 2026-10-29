import * as THREE from "three";

/* The deep-space backdrop behind every project page's 3D world: a Milky Way sky, twinkling stars, a slowly
   turning solar system, and a field of star dust that streams past the viewer and stretches into
   hyperspace streaks when the page is scrolled fast. It has its own scene and camera; the stage draws it
   first and its workshop on top. The camera here follows the stage camera's turns only partly, so the sky
   moves with every shot yet the solar system always stays in view. */

export interface CosmosFrame {
  t: number;          // seconds since start
  dt: number;         // seconds since the last frame
  progress: number;   // 0 at the first chapter … 1 at the last
  warp: number;       // 0 at rest … 1 while flying through chapters at speed
  view: THREE.Camera; // the stage camera
  aspect: number;
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ---------- shared GLSL ---------- */
const NOISE = /* glsl */ `
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
`;

/* a soft round glow, white in the middle */
function glowTexture(stops: [number, string][]) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* planet surfaces painted on a small canvas: gas giants get wavy bands, rocky worlds blotches */
function planetTexture(kind: "bands" | "rocky" | "earth", colors: string[], seed: number) {
  const W = 256, H = 128;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = colors[0];
  g.fillRect(0, 0, W, H);
  if (kind === "bands") {
    for (let y = 0; y < H; y += 2 + Math.floor(rnd() * 5)) {
      g.fillStyle = colors[Math.floor(rnd() * colors.length)];
      g.globalAlpha = 0.35 + rnd() * 0.5;
      const h = 2 + rnd() * 9, ph = rnd() * 6, amp = rnd() * 1.6;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x * 0.05 + ph) * amp);
      for (let x = W; x >= 0; x -= 8) g.lineTo(x, y + h + Math.sin(x * 0.04 + ph) * amp);
      g.fill();
    }
    if (colors.length > 3) { // Jupiter's great red spot
      g.globalAlpha = 0.85; g.fillStyle = colors[3];
      g.beginPath(); g.ellipse(W * 0.62, H * 0.64, 14, 7, 0, 0, Math.PI * 2); g.fill();
    }
  } else {
    const blots = kind === "earth" ? 70 : 140;
    for (let i = 0; i < blots; i++) {
      g.fillStyle = colors[1 + Math.floor(rnd() * (colors.length - 1))];
      g.globalAlpha = kind === "earth" ? 0.9 : 0.25 + rnd() * 0.35;
      const x = rnd() * W, y = H * 0.12 + rnd() * H * 0.76, r = kind === "earth" ? 4 + rnd() * 16 : 2 + rnd() * 10;
      g.beginPath(); g.ellipse(x, y, r * (1 + rnd()), r, rnd() * 3, 0, Math.PI * 2); g.fill();
    }
    if (kind === "earth") { // ice caps
      g.globalAlpha = 0.95; g.fillStyle = "#f4f7fb";
      g.fillRect(0, 0, W, 9); g.fillRect(0, H - 9, W, 9);
    }
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

export function createCosmos(renderer: THREE.WebGLRenderer, opts: { mobile: boolean; reduced: boolean }) {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 1500);
  camera.rotation.order = "YXZ";

  /* ---------- the sky: Milky Way and nebulae, painted once into a cube map ---------- */
  const BAND_N = new THREE.Vector3(0.18, 0.93, 0.32).normalize(); // the galactic plane runs diagonally across the view
  const CORE = new THREE.Vector3(0.55, 0.3, -0.78).normalize();    // its bright core sits behind the sun, up and right
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uBandN: { value: BAND_N }, uCore: { value: CORE } },
    vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir; uniform vec3 uBandN, uCore;
      ${NOISE}
      void main() {
        vec3 d = normalize(vDir);
        float b = dot(d, uBandN);
        float n = fbm(d * 3.2);
        float band = exp(-b * b * mix(10.0, 26.0, n));                 // the galaxy's ragged ribbon
        float core = exp(-pow(distance(d, uCore), 2.0) * 2.6);
        float dust = smoothstep(0.42, 0.78, fbm(d * 7.0 + 11.0));       // dark dust lanes through it
        float neb = smoothstep(0.52, 0.9, fbm(d * 2.1 + 3.7));          // faint violet clouds elsewhere
        float neb2 = smoothstep(0.55, 0.92, fbm(d * 2.6 - 5.3));
        vec3 col = vec3(0.010, 0.013, 0.026);
        col += vec3(0.085, 0.11, 0.17) * band * (0.35 + n);
        col += vec3(0.30, 0.20, 0.13) * band * core * (0.5 + n);
        col *= 1.0 - dust * band * 0.75;
        col += vec3(0.07, 0.035, 0.12) * neb + vec3(0.02, 0.05, 0.09) * neb2;
        col += vec3(0.12, 0.07, 0.03) * core * 0.25;
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0); // stored linear; the background pass shows it as drawn
      }`,
  });
  const skyScene = new THREE.Scene();
  const skyGeo = new THREE.SphereGeometry(10, 64, 32);
  skyScene.add(new THREE.Mesh(skyGeo, skyMat));
  const cubeRT = track(new THREE.WebGLCubeRenderTarget(opts.mobile ? 512 : 1024));
  new THREE.CubeCamera(0.1, 100, cubeRT).update(renderer, skyScene);
  skyGeo.dispose(); skyMat.dispose();
  scene.background = cubeRT.texture;

  /* ---------- stars: crowded along the Milky Way, each one twinkling at its own pace ---------- */
  const starCount = opts.mobile ? 2600 : 5200;
  let starMat!: THREE.ShaderMaterial;
  {
    const pos = new Float32Array(starCount * 3), col = new Float32Array(starCount * 3), aux = new Float32Array(starCount * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < starCount; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s2 = Math.sqrt(1 - u * u);
      v.set(Math.cos(a) * s2, u, Math.sin(a) * s2);
      if (Math.random() < 0.45) v.addScaledVector(BAND_N, -v.dot(BAND_N) * (0.75 + Math.random() * 0.25)).normalize();
      v.multiplyScalar(900);
      pos.set([v.x, v.y, v.z], i * 3);
      const k = Math.random();
      col.set(k < 0.12 ? [1, 0.8, 0.62] : k < 0.3 ? [0.72, 0.82, 1] : [1, 1, 1], i * 3);
      const big = Math.random() < 0.04;
      aux.set([big ? 2.6 + Math.random() * 2 : 0.8 + Math.random() * 1.4, Math.random() * 6.28, 0.6 + Math.random() * 2.4], i * 3);
    }
    const g = track(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aux", new THREE.BufferAttribute(aux, 3));
    starMat = track(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
      vertexShader: /* glsl */ `
        attribute vec3 color; attribute vec3 aux; uniform float uTime, uPR; varying vec3 vCol; varying float vTw;
        void main() {
          vCol = color;
          vTw = 0.55 + 0.45 * sin(uTime * aux.z + aux.y);
          gl_PointSize = aux.x * uPR * (0.85 + 0.3 * vTw);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vCol; varying float vTw;
        void main() { float r = length(gl_PointCoord - 0.5); float a = pow(1.0 - smoothstep(0.0, 0.5, r), 1.8); gl_FragColor = vec4(vCol, a * (0.45 + 0.55 * vTw)); }`,
    }));
    const stars = new THREE.Points(g, starMat);
    stars.frustumCulled = false;
    scene.add(stars);
  }

  /* ---------- the solar system ---------- */
  const system = new THREE.Group();     // placed and tilted so its orbits read as ellipses, seen from above
  system.position.set(46, 30, -190);
  system.rotation.set(-0.62, 0, -0.16);
  scene.add(system);
  const spin = new THREE.Group();       // turns slowly with the reader's progress, for depth
  system.add(spin);

  const sunMat = track(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vN, vP, vV; void main() { vN = normalize(normalMatrix * normal); vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vN, vP, vV; uniform float uTime;
      ${NOISE}
      void main() {
        float g = fbm(vP * 0.9 + vec3(uTime * 0.12, -uTime * 0.07, uTime * 0.05));
        float spots = smoothstep(0.62, 0.8, fbm(vP * 0.35 - uTime * 0.03));
        vec3 col = mix(vec3(1.0, 0.55, 0.12), vec3(1.0, 0.93, 0.62), g);
        col *= 1.0 - spots * 0.35;
        float limb = pow(max(dot(vN, vV), 0.0), 0.45);             // darker, redder edge
        col = mix(vec3(0.9, 0.32, 0.05), col, limb);
        gl_FragColor = vec4(col * 1.05, 1.0);
      }`,
  }));
  const SUN_R = 8;
  spin.add(new THREE.Mesh(track(new THREE.SphereGeometry(SUN_R, 64, 32)), sunMat));
  const glowTex = track(glowTexture([[0, "rgba(255,236,190,1)"], [0.18, "rgba(255,190,100,0.75)"], [0.45, "rgba(255,120,40,0.22)"], [1, "rgba(255,90,20,0)"]]));
  const corona: THREE.Sprite[] = [];
  for (const [size, op] of [[34, 0.95], [78, 0.5], [170, 0.15]] as const) {
    const sp = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })));
    sp.scale.setScalar(size);
    sp.userData.base = size;
    corona.push(sp);
    spin.add(sp);
  }
  const sunLight = new THREE.PointLight(0xfff0dd, 3.2, 0, 0);
  spin.add(sunLight);
  scene.add(new THREE.AmbientLight(0x8090b0, 0.06));

  const sphere = track(new THREE.SphereGeometry(1, 48, 24));
  const orbitMat = track(new THREE.LineBasicMaterial({ color: 0x9fb4dc, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
  const atmoMat = (hex: number, power: number) => track(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    uniforms: { uCol: { value: new THREE.Color(hex) }, uPow: { value: power } },
    vertexShader: /* glsl */ `varying vec3 vN, vV; void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `varying vec3 vN, vV; uniform vec3 uCol; uniform float uPow; void main() { float f = pow(1.0 - max(dot(vN, vV), 0.0), uPow); gl_FragColor = vec4(uCol, f * 0.9); }`,
  }));

  interface Planet { pivot: THREE.Group; body: THREE.Object3D; speed: number; turn: number }
  const planets: Planet[] = [];
  const PLANETS: { r: number; size: number; kind: "bands" | "rocky" | "earth"; colors: string[]; atmo?: number; ring?: boolean; tilt?: number }[] = [
    { r: 15, size: 0.9, kind: "rocky", colors: ["#8d8580", "#5f5853", "#b3aaa2"] },                       // Mercury
    { r: 22, size: 1.5, kind: "bands", colors: ["#e6c98f", "#d9b878", "#f1dcab"], atmo: 0xffd9a0 },        // Venus
    { r: 30, size: 1.8, kind: "earth", colors: ["#1d4f9c", "#3f8a3a", "#7a6a3a", "#2f6e2c"], atmo: 0x5fa8ff, tilt: 0.41 }, // Earth
    { r: 38, size: 1.2, kind: "rocky", colors: ["#b5532d", "#8a3b1f", "#d07a4a"], atmo: 0xff9a6a },       // Mars
    { r: 58, size: 5.2, kind: "bands", colors: ["#d8b48a", "#a8754d", "#f0dcc0", "#b4553a"], tilt: 0.05 }, // Jupiter
    { r: 76, size: 4.2, kind: "bands", colors: ["#e3cf9f", "#c9ab72", "#f2e4c0"], ring: true, tilt: 0.47 }, // Saturn
    { r: 92, size: 2.6, kind: "bands", colors: ["#9fe0e6", "#8fd2dc", "#b6eef0"], atmo: 0x9fe8ff, tilt: 1.7 }, // Uranus
    { r: 106, size: 2.5, kind: "bands", colors: ["#3e64d6", "#2f4fb8", "#5b80ea"], atmo: 0x6f9bff, tilt: 0.49 }, // Neptune
  ];
  PLANETS.forEach((p, k) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 256; i++) { const a = (i / 256) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * p.r, 0, Math.sin(a) * p.r)); }
    spin.add(new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(pts)), orbitMat));

    const pivot = new THREE.Group();
    pivot.rotation.y = k * 2.1 + 0.6; // spread around their orbits
    spin.add(pivot);
    const holder = new THREE.Group();
    holder.position.x = p.r;
    holder.rotation.z = p.tilt ?? 0.2;
    pivot.add(holder);
    const map = track(planetTexture(p.kind, p.colors, 1234 + k * 977));
    const body = new THREE.Mesh(sphere, track(new THREE.MeshStandardMaterial({ map, roughness: 0.85, metalness: 0 })));
    body.scale.setScalar(p.size);
    holder.add(body);
    if (p.kind === "earth") {
      const cloudTex = track(planetTexture("rocky", ["rgba(0,0,0,0)", "#ffffff", "#e8eef6"], 77));
      const clouds = new THREE.Mesh(sphere, track(new THREE.MeshStandardMaterial({ map: cloudTex, transparent: true, opacity: 0.55, depthWrite: false })));
      clouds.scale.setScalar(1.025);
      body.add(clouds);
    }
    if (p.atmo) {
      const atmo = new THREE.Mesh(sphere, atmoMat(p.atmo, 2.6));
      atmo.scale.setScalar(p.size * 1.12);
      holder.add(atmo);
    }
    if (p.ring) {
      const c = document.createElement("canvas");
      c.width = 256; c.height = 4;
      const g = c.getContext("2d")!;
      for (let x = 0; x < 256; x++) {
        const gap = (x > 150 && x < 162) || (x > 60 && x < 66);
        g.fillStyle = `rgba(226,206,160,${gap ? 0.05 : 0.25 + 0.55 * Math.abs(Math.sin(x * 0.21) * Math.cos(x * 0.05))})`;
        g.fillRect(x, 0, 1, 4);
      }
      const ringTex = track(new THREE.CanvasTexture(c));
      ringTex.colorSpace = THREE.SRGBColorSpace;
      const inner = 1.35, outer = 2.4;
      const rg = track(new THREE.RingGeometry(inner, outer, 128, 1));
      const uv = rg.attributes.uv, pos = rg.attributes.position;
      for (let i = 0; i < uv.count; i++) {
        const d = Math.hypot(pos.getX(i), pos.getY(i));
        uv.setXY(i, (d - inner) / (outer - inner), 0.5);
      }
      const ring = new THREE.Mesh(rg, track(new THREE.MeshStandardMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9 })));
      ring.rotation.x = -Math.PI / 2;
      ring.scale.setScalar(p.size);
      holder.add(ring);
    }
    planets.push({ pivot, body, speed: 0.9 / Math.pow(p.r, 1.5) * 6, turn: 0.3 + Math.random() * 0.4 });
  });

  /* the asteroid belt between Mars and Jupiter, and a faint dust disc around everything */
  const beltMat = track(new THREE.PointsMaterial({ color: 0xc8bfae, size: 0.5, transparent: true, opacity: 0.7, depthWrite: false, sizeAttenuation: true }));
  const belt = new THREE.Group();
  for (const [n, r0, r1, h] of [[opts.mobile ? 700 : 1400, 44, 50, 0.8], [opts.mobile ? 500 : 1000, 18, 118, 2.2]] as const) {
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = r0 + Math.random() * (r1 - r0);
      p.set([Math.cos(a) * r, (Math.random() - 0.5) * h, Math.sin(a) * r], i * 3);
    }
    const g = track(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, r1 > 100 ? track(new THREE.PointsMaterial({ color: 0x8fa6d8, size: 0.35, transparent: true, opacity: 0.35, depthWrite: false })) : beltMat);
    belt.add(pts);
  }
  spin.add(belt);

  /* ---------- star dust streaming toward the viewer; it becomes hyperspace streaks at speed ---------- */
  const DUST = opts.mobile ? 500 : 1100, L = 320;
  const seeds = new Float32Array(DUST * 4);
  for (let i = 0; i < DUST; i++) {
    const a = Math.random() * Math.PI * 2, r = 6 + Math.pow(Math.random(), 0.7) * 120;
    seeds.set([Math.cos(a) * r, Math.sin(a) * r * 0.75, Math.random() * L, 0.6 + Math.random() * 0.8], i * 4);
  }
  const lineSeeds = new Float32Array(DUST * 8), ends = new Float32Array(DUST * 2);
  for (let i = 0; i < DUST; i++) {
    lineSeeds.set(seeds.subarray(i * 4, i * 4 + 4), i * 8);
    lineSeeds.set(seeds.subarray(i * 4, i * 4 + 4), i * 8 + 4);
    ends[i * 2 + 1] = 1;
  }
  const dustUniforms = { uTravel: { value: 0 }, uWarp: { value: 0 }, uPR: { value: renderer.getPixelRatio() } };
  const dustVert = (line: boolean) => /* glsl */ `
    attribute vec4 seed; ${line ? "attribute float aEnd;" : ""}
    uniform float uTravel, uWarp, uPR; varying float vA;
    void main() {
      float z = -${L.toFixed(1)} + mod(seed.z + uTravel * seed.w, ${L.toFixed(1)});
      ${line ? "z -= aEnd * (0.4 + uWarp * 70.0) * seed.w;" : ""}
      vec4 mv = modelViewMatrix * vec4(seed.xy, z, 1.0);
      vA = smoothstep(-${L.toFixed(1)}, -${(L * 0.55).toFixed(1)}, z) * (1.0 - smoothstep(-30.0, -2.0, z)) ${line ? "* (1.0 - aEnd) * uWarp" : "* (1.0 - uWarp * 0.6)"};
      ${line ? "" : "gl_PointSize = clamp(90.0 / -mv.z, 1.0, 3.5) * uPR;"}
      gl_Position = projectionMatrix * mv;
    }`;
  const warp = new THREE.Group(); // its axis points along the view, so the streaks rush out of the middle
  scene.add(warp);
  {
    const g = track(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(DUST * 6), 3));
    g.setAttribute("seed", new THREE.BufferAttribute(lineSeeds, 4));
    g.setAttribute("aEnd", new THREE.BufferAttribute(ends, 1));
    const m = track(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: dustUniforms,
      vertexShader: dustVert(true),
      fragmentShader: /* glsl */ `varying float vA; void main() { gl_FragColor = vec4(0.78, 0.86, 1.0, vA); }`,
    }));
    const lines = new THREE.LineSegments(g, m);
    lines.frustumCulled = false;
    warp.add(lines);
    const pg = track(new THREE.BufferGeometry());
    pg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(DUST * 3), 3));
    pg.setAttribute("seed", new THREE.BufferAttribute(seeds, 4));
    const pm = track(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: dustUniforms,
      vertexShader: dustVert(false),
      fragmentShader: /* glsl */ `varying float vA; void main() { float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(0.86, 0.9, 1.0, vA * (1.0 - smoothstep(0.1, 0.5, r)) * 0.8); }`,
    }));
    const motes = new THREE.Points(pg, pm);
    motes.frustumCulled = false;
    warp.add(motes);
  }
  // the bright horizon of light at the vanishing point, only while warping
  const flareTex = track(glowTexture([[0, "rgba(230,240,255,1)"], [0.25, "rgba(150,185,235,0.45)"], [1, "rgba(80,120,200,0)"]]));
  const flareMat = track(new THREE.SpriteMaterial({ map: flareTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  const flare = new THREE.Sprite(flareMat);
  flare.position.set(0, 0, -L * 0.9);
  flare.scale.set(420, 22, 1);
  warp.add(flare);

  /* ---------- per frame ---------- */
  const e = new THREE.Euler(0, 0, 0, "YXZ");
  let yaw0: number | null = null, pitch0 = 0, travel = 0;
  return {
    render(f: CosmosFrame) {
      const time = opts.reduced ? 0 : f.t;
      camera.aspect = f.aspect;
      camera.updateProjectionMatrix();
      // the sky turns a quarter as far as the stage camera does, and drifts on its own very slowly
      e.setFromQuaternion(f.view.quaternion, "YXZ");
      if (yaw0 === null) { yaw0 = e.y; pitch0 = e.x; }
      camera.rotation.set(0.02 + (e.x - pitch0) * 0.3, -0.04 + (e.y - yaw0) * 0.25 + Math.sin(time * 0.02) * 0.05, 0);
      // reading on carries the viewer gently closer to the sun
      camera.position.set(0, -f.progress * 6, -f.progress * 55);

      starMat.uniforms.uTime.value = time;
      sunMat.uniforms.uTime.value = time;
      corona.forEach((c, i) => c.scale.setScalar(c.userData.base * (1 + Math.sin(time * (0.6 + i * 0.25)) * 0.03)));
      spin.rotation.y = time * 0.01 + f.progress * 0.9;
      planets.forEach((p) => { p.pivot.rotation.y += f.dt * p.speed * (opts.reduced ? 0 : 1); p.body.rotation.y += f.dt * p.turn * (opts.reduced ? 0 : 1); });
      belt.rotation.y = time * 0.012;

      const w = opts.reduced ? 0 : clamp(f.warp);
      travel += f.dt * (opts.reduced ? 0 : 7 + w * 260);
      dustUniforms.uTravel.value = travel;
      dustUniforms.uWarp.value = w;
      flareMat.opacity = w * 0.75;
      warp.quaternion.copy(camera.quaternion);
      warp.position.copy(camera.position);

      // drawn as painted, without the workshop's film tone curve
      const tm = renderer.toneMapping;
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.render(scene, camera);
      renderer.toneMapping = tm;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
