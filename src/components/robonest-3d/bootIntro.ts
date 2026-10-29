import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

export interface IntroApi {
  covering: boolean;
  reveal: Promise<void>;
  dispose: () => void;
}

export function initBootIntro(introEl: HTMLElement, canvasEl: HTMLCanvasElement): IntroApi {
  let resolveReveal: () => void = () => {};
  const revealPromise = new Promise<void>((r) => { resolveReveal = r; });
  const api: IntroApi = {
    covering: true,
    reveal: revealPromise,
    dispose: () => {},
  };

  (window as unknown as { rnIntro: IntroApi }).rnIntro = api;
  introEl.dataset.alive = '1';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a: number, b: number, v: number) => { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); };
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const TL = reduced
    ? { grid: [0, 0.01], lines: 0, band: [0, 0.01], eyesIn: [0, 0.01], visorGrid: [0, 0.01], wake: [0, 0.01], reveal: 0.9, end: 1.5 }
    : { grid: [0.45, 1.5], lines: 1, band: [2.75, 3.95], eyesIn: [1.55, 1.8], visorGrid: [3.55, 4.15], wake: [5.70, 6.12], reveal: 6.25, end: 7.55 };

  let finished = false;
  let animId = 0;
  let renderer: THREE.WebGLRenderer | null = null;

  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
  } catch (e) {
    console.warn('Intro skipped: WebGL unavailable.', e);
    finish();
    return api;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x07090c, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const BG_DARK = new THREE.Color(0x07090c), BG_CREAM = new THREE.Color('#F7F3EC'), curBg = new THREE.Color(0x07090c);
  const LINE_DARK = new THREE.Color(0xc9ccd1), LINE_CREAM = new THREE.Color(0x232931), curLineCol = new THREE.Color(0xc9ccd1);
  const tmpCol = new THREE.Color();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 100);
  let camZ = 10;
  function fit() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camZ = Math.max(10, 3.1 / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * camera.aspect));
    camera.updateProjectionMatrix();
  }
  fit();

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const keyLight = new THREE.DirectionalLight(0xffffff, 0);
  keyLight.position.set(2.5, 3, 6);
  scene.add(keyLight);

  const head = new THREE.Group();
  scene.add(head);

  const lineMats: LineMaterial[] = [];
  const lines: { l: Line2; geo: LineGeometry; n: number; window: [number, number] }[] = [];

  function addLine(points: THREE.Vector2[], z: number, win: [number, number], { color = 0xc9ccd1, width = 1.25, closed = true } = {}) {
    const pts = closed ? [...points, points[0]] : points;
    const geo = new LineGeometry();
    geo.setPositions(pts.flatMap((p) => [p.x, p.y, z]));
    const mat = new LineMaterial({ color, linewidth: width, transparent: true, opacity: 0.9, depthWrite: false });
    mat.resolution.set(window.innerWidth, window.innerHeight);
    lineMats.push(mat);
    const l = new Line2(geo, mat);
    l.computeLineDistances();
    geo.instanceCount = 0;
    head.add(l);
    lines.push({ l, geo, n: pts.length - 1, window: win });
    return l;
  }

  const V2 = (x: number, y: number) => new THREE.Vector2(x, y);
  function roundedRect(w: number, h: number, r: number, cx = 0, cy = 0, seg = 8) {
    const out: THREE.Vector2[] = [], hw = w / 2 - r, hh = h / 2 - r;
    const corners: [number, number, number][] = [[hw, hh, 0], [hw, -hh, -Math.PI / 2], [-hw, -hh, Math.PI], [-hw, hh, Math.PI / 2]];
    out.push(V2(cx, cy + h / 2));
    for (const [x, y, a0] of corners) {
      for (let i = 0; i <= seg; i++) {
        const a = a0 + Math.PI / 2 - (i / seg) * (Math.PI / 2);
        out.push(V2(cx + x + Math.cos(a) * r, cy + y + Math.sin(a) * r));
      }
    }
    return out;
  }

  function chamfer(w: number, h: number, c: number, r = 0.04) {
    const hw = w / 2, hh = h / 2, raw = [V2(-hw + c, hh), V2(hw - c, hh), V2(hw, hh - c), V2(hw, -hh + c), V2(hw - c, -hh), V2(-hw + c, -hh), V2(-hw, -hh + c), V2(-hw, hh - c)];
    const shape = new THREE.Shape();
    raw.forEach((p, i) => {
      const prev = raw[(i + raw.length - 1) % raw.length], next = raw[(i + 1) % raw.length];
      const a = p.clone().add(prev.clone().sub(p).setLength(r)), b = p.clone().add(next.clone().sub(p).setLength(r));
      if (i) shape.lineTo(a.x, a.y); else shape.moveTo(a.x, a.y);
      shape.quadraticCurveTo(p.x, p.y, b.x, b.y);
    });
    shape.closePath();
    return shape;
  }

  const FRAME = { w: 2.0, h: 1.84, c: 0.34 }, HOLE = { w: 1.5, h: 1.3, r: 0.18 }, VISOR = { w: 1.3, h: 1.1, r: 0.14 };
  const frameShape = chamfer(FRAME.w, FRAME.h, FRAME.c);
  const framePts = frameShape.getPoints(6);
  const startTop = framePts.reduce((best, p, i) => (Math.abs(p.x) + (p.y < 0 ? 9 : 0) < Math.abs(framePts[best].x) + (framePts[best].y < 0 ? 9 : 0) ? i : best), 0);
  const frameLoop = [...framePts.slice(startTop), ...framePts.slice(0, startTop)];

  const L = TL.lines;
  addLine(frameLoop, 0.1, [1.0 * L, 2.0 * L]);
  addLine(roundedRect(VISOR.w, VISOR.h, VISOR.r), 0.02, [1.25 * L, 2.15 * L]);
  addLine(roundedRect(HOLE.w, HOLE.h, HOLE.r), 0.1, [1.5 * L, 2.3 * L], { width: 1 });
  addLine(roundedRect(2.55, 2.4, 0.42, 0, 0.12), -0.22, [2.0 * L, 3.2 * L]);
  const brow: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) { const a = Math.PI * (0.18 + 0.64 * (i / 24)); brow.push(V2(Math.cos(a) * 1.05, 0.55 + Math.sin(a) * 0.52)); }
  addLine(brow.reverse(), -0.12, [2.35 * L, 3.1 * L], { closed: false });
  for (const s of [-1, 1]) {
    addLine(roundedRect(0.26, 0.72, 0.11, s * 1.42, 0.02), -0.32, [2.55 * L, 3.3 * L]);
    addLine(roundedRect(0.1, 0.36, 0.05, s * 1.42, 0.02), -0.3, [2.75 * L, 3.4 * L], { width: 1 });
  }
  addLine([V2(0.45, 1.32), V2(0.45, 1.72)], -0.2, [2.9 * L, 3.3 * L], { closed: false });
  const tip: THREE.Vector2[] = [];
  for (let i = 0; i <= 20; i++) { const a = Math.PI / 2 - (i / 20) * Math.PI * 2; tip.push(V2(0.45 + Math.cos(a) * 0.075, 1.8 + Math.sin(a) * 0.075)); }
  addLine(tip, -0.2, [3.2 * L, 3.5 * L], { closed: false });
  addLine(roundedRect(0.95, 0.18, 0.08, 0, -1.33), -0.25, [3.0 * L, 3.6 * L]);

  const gridPts: number[] = [];
  for (let i = 1; i < 5; i++) {
    const x = -VISOR.w / 2 + (VISOR.w * i) / 5, y = -VISOR.h / 2 + (VISOR.h * i) / 5;
    gridPts.push(x, -VISOR.h / 2 + 0.06, 0.03, x, VISOR.h / 2 - 0.06, 0.03, -VISOR.w / 2 + 0.06, y, 0.03, VISOR.w / 2 - 0.06, y, 0.03);
  }
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3));
  const gridMat = new THREE.LineBasicMaterial({ color: 0xc9ccd1, transparent: true, opacity: 0 });
  head.add(new THREE.LineSegments(gridGeo, gridMat));

  const bandShape = frameShape.clone();
  const hole = new THREE.Path(roundedRect(HOLE.w, HOLE.h, HOLE.r).reverse());
  bandShape.holes.push(hole);
  const bandGeo = new THREE.ExtrudeGeometry(bandShape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.018, bevelSegments: 3, curveSegments: 10 });
  bandGeo.translate(0, 0, -0.04);
  const bandMat = new THREE.ShaderMaterial({
    uniforms: { uProg: { value: 0 }, uGlow: { value: 0 }, uCream: { value: 0 } },
    vertexShader: `
      varying vec3 vN; varying vec2 vP;
      void main(){ vN = normalize(normalMatrix * normal); vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uProg, uGlow, uCream; varying vec3 vN; varying vec2 vP;
      vec3 ramp(float t){
        vec3 c0 = vec3(0.09, 0.66, 0.62), c1 = vec3(0.12, 0.60, 0.74), c2 = vec3(0.26, 0.34, 0.86), c3 = vec3(0.42, 0.29, 0.80);
        vec3 c4 = vec3(0.94, 0.32, 0.35), c5 = vec3(0.94, 0.32, 0.35), c6 = vec3(0.79, 0.64, 0.20), c7 = vec3(0.42, 0.66, 0.29);
        if (t < 0.15) return mix(c0, c1, t / 0.15);
        if (t < 0.30) return mix(c1, c2, (t - 0.15) / 0.15);
        if (t < 0.40) return mix(c2, c3, (t - 0.30) / 0.10);
        if (t < 0.50) return mix(c3, c4, (t - 0.40) / 0.10);
        if (t < 0.65) return mix(c4, c5, (t - 0.50) / 0.15);
        if (t < 0.78) return mix(c5, c6, (t - 0.65) / 0.13);
        if (t < 0.90) return mix(c6, c7, (t - 0.78) / 0.12);
        return mix(c7, c0, (t - 0.90) / 0.10);
      }
      void main(){
        float t = fract((3.14159265 - atan(vP.y, vP.x)) / 6.28318531);
        if (t > uProg) discard;
        vec3 n = normalize(vN);
        float diff = 0.55 + 0.45 * max(dot(n, normalize(vec3(0.35, 0.55, 1.0))), 0.0);
        float edge = smoothstep(uProg - 0.04, uProg, t);
        vec3 col = ramp(t) * diff * mix(0.85 + uGlow * 0.35, 0.88 + uGlow * 0.20, uCream) + edge * vec3(1.0, 0.95, 0.9) * 0.6 * step(uProg, 0.999);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const band = new THREE.Mesh(bandGeo, bandMat);
  head.add(band);

  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    if (!g) return new THREE.Texture();
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  const EYE_IDLE = new THREE.Color(0xb3b6ba), EYE_AWAKE = new THREE.Color(0xfff3e2), EYE_AWAKE_CREAM = new THREE.Color(0xffeedb);
  const eyes = [-0.21, 0.21].map((x) => {
    const g = new THREE.Group(); g.position.set(x, -0.05, 0.08);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.085, 32, 20), new THREE.MeshStandardMaterial({ color: EYE_IDLE.clone(), emissive: EYE_IDLE.clone(), emissiveIntensity: 0.35, roughness: 0.35 }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xf05259, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(0.7);
    g.add(m, glow); head.add(g);
    return { g, m, glow, x };
  });

  const EYE_SCALE = 1.1;
  const EYE_LOOK = { x: 0.082, y: 0.106 };
  const EYE_BEATS = [
    { at: 2.68, hold: 0.12, from: 0, to: 0 },
    { at: 3.90, hold: 0.06, from: 0, to: 1 },
    { at: 5.10, hold: 0.06, from: 1, to: 0 },
  ];
  const BLINK_CLOSE = 0.06, BLINK_OPEN = 0.08;
  const backOut = (x: number) => { if (x <= 0) return 0; const u = clamp(x) - 1; return 1 + 2.2 * u * u * u + 1.2 * u * u; };
  const outCubic = (x: number) => 1 - Math.pow(1 - clamp(x), 3);

  function eyeRig(t: number) {
    const pop = backOut((t - TL.eyesIn[0]) / (TL.eyesIn[1] - TL.eyesIn[0]));
    let b: typeof EYE_BEATS[0] | null = null;
    for (const n of EYE_BEATS) if (t >= n.at) b = n;
    if (!b) return { pop, open: 1, look: 0 };
    const tc = b.at + BLINK_CLOSE, tr = tc + b.hold;
    const open = t < tc ? 1 - smooth(b.at, tc, t) : t < tr ? 0 : backOut((t - tr) / BLINK_OPEN);
    const look = t < tc + b.hold / 2 ? b.from : b.from + (b.to - b.from) * (0.85 + 0.15 * outCubic((t - tr) / 0.14));
    return { pop, open, look };
  }

  const backGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x2a8f9a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  backGlow.scale.setScalar(7); backGlow.position.z = -1.2;
  head.add(backGlow);

  const gridEls = [...introEl.querySelectorAll<HTMLElement>('.ig')];
  const labelEls = [...introEl.querySelectorAll<HTMLElement>('.il')];

  let t0 = performance.now(), skipTo = 0;
  function skip() {
    const t = (performance.now() - t0) / 1000;
    if (t < TL.reveal - 0.3) skipTo = TL.reveal - 0.3 - t;
  }
  function onKey(e: KeyboardEvent) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip(); }
  window.addEventListener('keydown', onKey);
  introEl.addEventListener('click', skip);

  function onResize() {
    if (!renderer) return;
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    lineMats.forEach((m) => m.resolution.set(window.innerWidth, window.innerHeight));
    fit();
  }
  window.addEventListener('resize', onResize);

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(animId);
    resolveReveal();
    api.covering = false;
    introEl.dataset.done = '1';
    introEl.style.display = 'none';
    document.documentElement.classList.remove('intro-lock');
    window.removeEventListener('resize', onResize);
    window.removeEventListener('keydown', onKey);
    introEl.removeEventListener('click', skip);
    if (renderer) {
      scene.traverse((o) => {
        if ('geometry' in o && o.geometry instanceof THREE.BufferGeometry) o.geometry.dispose();
        if ('material' in o) {
          const m = o.material;
          if (Array.isArray(m)) m.forEach((mat) => mat.dispose());
          else if (m && typeof (m as THREE.Material).dispose === 'function') (m as THREE.Material).dispose();
        }
      });
      renderer.dispose();
      renderer = null;
    }
  }

  api.dispose = finish;

  const tmp = new THREE.Vector3();
  let revealed = false;

  function frame(now: number) {
    if (finished || !renderer) return;
    animId = requestAnimationFrame(frame);
    if (skipTo) { t0 -= skipTo * 1000; skipTo = 0; }
    const t = (now - t0) / 1000;
    const creamK = 0;
    const wake = smooth(TL.wake[0], TL.wake[1], t);

    curBg.copy(BG_DARK).lerp(BG_CREAM, creamK);
    renderer.setClearColor(curBg, 1);
    introEl.style.backgroundColor = '#' + curBg.getHexString();

    const gridK = smooth(TL.grid[0], TL.grid[1], t) * (1 - smooth(TL.reveal - 0.1, TL.reveal + 0.35, t));
    const gridR = Math.round(lerp(201, 21, creamK));
    const gridG = Math.round(lerp(204, 27, creamK));
    const gridB = Math.round(lerp(209, 34, creamK));
    const gridA = lerp(0.09, 0.07, creamK);
    gridEls.forEach((el, i) => {
      el.style.backgroundColor = `rgba(${gridR},${gridG},${gridB},${gridA.toFixed(3)})`;
      el.style.opacity = (gridK * (i === 1 ? 0.6 : 1)).toFixed(3);
    });
    const lblR = Math.round(lerp(201, 92, creamK));
    const lblG = Math.round(lerp(204, 101, creamK));
    const lblB = Math.round(lerp(209, 112, creamK));
    labelEls.forEach((el) => {
      el.style.color = `rgba(${lblR},${lblG},${lblB},0.78)`;
      el.style.opacity = (smooth(TL.grid[0] + 0.3, TL.grid[1] + 0.4, t) * (1 - smooth(TL.reveal - 0.2, TL.reveal + 0.15, t))).toFixed(3);
    });

    for (const ln of lines) {
      const p = reduced ? 1 : ease(clamp((t - ln.window[0]) / (ln.window[1] - ln.window[0])));
      ln.geo.instanceCount = Math.round(p * ln.n);
    }

    curLineCol.copy(LINE_DARK).lerp(LINE_CREAM, creamK);
    const lineBright = 0.75 + 0.25 * wake;
    lineMats.forEach((m) => {
      m.color.copy(curLineCol);
      m.opacity = lerp(0.9 * lineBright, 0.94, creamK);
    });
    gridMat.color.copy(curLineCol);
    gridMat.opacity = lerp(0.32, 0.22, creamK) * smooth(TL.visorGrid[0], TL.visorGrid[1], t);

    bandMat.uniforms.uProg.value = ease(smooth(TL.band[0], TL.band[1], t));
    bandMat.uniforms.uGlow.value = wake;
    bandMat.uniforms.uCream.value = creamK;
    backGlow.material.opacity = 0.12 * smooth(1.2, 3.8, t) * (1 - smooth(TL.reveal, TL.reveal + 0.6, t)) * (1 - creamK);
    keyLight.intensity = 1.6 * smooth(1.4, 3.6, t) * (1 - creamK * 0.15);

    const { pop, open, look } = eyeRig(t);
    const curAwake = tmpCol.copy(EYE_AWAKE).lerp(EYE_AWAKE_CREAM, creamK);
    eyes.forEach((e) => {
      const kVal = Math.max(0.001, EYE_SCALE * pop);
      const sq = Math.max(0.001, kVal * open);
      e.m.scale.set(sq, sq, sq);
      e.g.position.x = e.x + look * EYE_LOOK.x;
      e.g.position.y = -0.05 + look * EYE_LOOK.y;
      e.m.material.color.copy(EYE_IDLE).lerp(curAwake, wake);
      e.m.material.emissive.copy(EYE_IDLE).lerp(curAwake, wake);
      e.m.material.emissiveIntensity = lerp(0.35, 0.45, creamK) + wake * lerp(1.6, 1.45, creamK);
      e.glow.material.opacity = wake * lerp(0.55, 0.42, creamK) * Math.min(open, 1) * (1 - smooth(TL.reveal + 0.3, TL.reveal + 0.9, t));
    });

    head.rotation.y = reduced ? 0 : Math.sin(t * 0.6) * 0.02;
    head.rotation.x = reduced ? 0 : -0.04 + Math.sin(t * 0.45) * 0.015;

    const out = reduced ? 0 : ease(smooth(TL.reveal, TL.end, t));
    camera.position.set(0, 0, lerp(camZ, camZ * 0.18, out));
    camera.lookAt(0, -0.02, 0);

    if (t >= TL.reveal && !revealed) {
      revealed = true;
      api.covering = false;
      resolveReveal();
    }
    if (revealed) {
      if (reduced) {
        introEl.style.opacity = (1 - smooth(TL.reveal, TL.end, t)).toFixed(3);
      } else {
        tmp.set(VISOR.w / 2, VISOR.h / 2, 0).applyMatrix4(head.matrixWorld).project(camera);
        const visorPx = Math.hypot((tmp.x * window.innerWidth) / 2, (tmp.y * window.innerHeight) / 2);
        const r = Math.max(0, visorPx * lerp(0.82, 1.7, out) * smooth(TL.reveal, TL.reveal + 0.35, t)), soft = 40 + 80 * out;
        const m = `radial-gradient(circle at 50% 50%, transparent ${r.toFixed(1)}px, #000 ${(r + soft).toFixed(1)}px)`;
        introEl.style.webkitMaskImage = m;
        introEl.style.maskImage = m;
        introEl.style.opacity = (1 - smooth(TL.end - 0.35, TL.end, t)).toFixed(3);
      }
    }
    if (t >= TL.end) {
      finish();
      return;
    }
    renderer.render(scene, camera);
  }

  animId = requestAnimationFrame((now) => {
    t0 = now;
    frame(now);
  });

  return api;
}
