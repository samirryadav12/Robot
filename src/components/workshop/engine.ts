import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { KitModel, WorkshopKit } from "./kit";
import type { ViewerMode } from "./WorkshopViewer";

/* Rendering, interaction and camera for the workshop viewer (imported on demand so three.js only loads with it). */

type PartId = string;
type State = { mode: ViewerMode; part: PartId | null; conn: string | null; step: number | null; exploded: boolean; labels: boolean; isolate: boolean };
type Look = "normal" | "hi" | "ghost" | "dim";
type LabelSpec = { key: string; num?: number; text: string; part?: PartId; conn?: string; anchor: (out: THREE.Vector3) => THREE.Vector3; accent?: boolean };

interface Opts {
  kit: WorkshopKit;
  build: () => KitModel;
  canvas: HTMLCanvasElement;
  wrap: HTMLDivElement;
  labels: HTMLDivElement;
  svg: SVGSVGElement;
  tip: HTMLDivElement;
  installedAt: Record<PartId, number>;
  wiredAt: Record<string, number>;
  onPick: (part: PartId | null, conn: string | null) => void;
  variant?: "default" | "technical";   // technical: thin uppercase callouts, as in an engineering drawing
  showcase?: boolean;                  // a slow turntable turn until the first touch (never with reduced motion)
  spread?: [number, number, number];   // wider exploded layout (per axis), framed from its real bounds
  zoom?: number;                       // camera distance factor for the assembled view (<1 = closer)
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function createEngine(o: Opts) {
  const { kit } = o;
  const PARTS = kit.parts, CONNECTIONS = kit.connections, STEP_VISUALS = kit.stepVisuals;
  const partById = (id: PartId) => PARTS.find((p) => p.id === id)!;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7f3ec);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.85;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6dccd, 0.75));
  const key = new THREE.DirectionalLight(0xfff4e8, 2.1);
  key.position.set(16, 34, 18);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.55);
  fill.position.set(-20, 12, -10);
  scene.add(fill);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xefe9df, roughness: 1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.06;
  floor.receiveShadow = true;
  scene.add(floor);

  const model = o.build();
  scene.add(model.root);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400);
  const controls = new OrbitControls(camera, o.canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.085;
  controls.minDistance = 7;
  controls.maxDistance = 110;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.screenSpacePanning = true;
  const HOME = { target: new THREE.Vector3(...kit.camera.target), dir: new THREE.Vector3(...kit.camera.dir).normalize(), dist: kit.camera.dist };
  const homeDist = () => HOME.dist * (o.zoom ?? 1) * (camera.aspect < 1 ? 1.55 : camera.aspect < 1.3 ? 1.15 : 1);
  camera.position.copy(HOME.target).addScaledVector(HOME.dir, homeDist());
  controls.target.copy(HOME.target);

  /* ---------- per-part bounds (local), for label anchors and camera framing ---------- */
  const localBox = new Map<PartId, THREE.Box3>();
  for (const [id, n] of model.parts) {
    const saved = n.group.matrixWorld.clone();
    n.group.updateWorldMatrix(true, true);
    const inv = n.group.matrixWorld.clone().invert();
    const b = new THREE.Box3();
    n.meshes.forEach((m) => { m.geometry.computeBoundingBox(); const mb = m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld).applyMatrix4(inv); b.union(mb); });
    localBox.set(id, b);
    void saved;
  }
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
  // the exploded layout's bounds (only for a custom spread): measured once with every part out, then put back
  let explodedBox: THREE.Box3 | null = null;
  if (o.spread) {
    model.setSpread(...o.spread);
    model.setExplode(1);
    model.root.updateWorldMatrix(true, true);
    explodedBox = new THREE.Box3();
    for (const [id, n] of model.parts) if (id !== kit.wiresPart && partById(id)?.onRobot) n.meshes.forEach((m) => explodedBox!.expandByObject(m));
    model.setExplode(0);
  }
  const partAnchor = (id: PartId) => (out: THREE.Vector3) => {
    if (id === kit.wiresPart) { const w = model.wires.get(kit.wireAnchorConn)!; w.mesh.geometry.computeBoundingBox(); return w.mesh.geometry.boundingBox!.getCenter(out).applyMatrix4(model.root.matrixWorld); }
    const b = localBox.get(id)!, g = model.parts.get(id)!.group;
    return out.set((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2).applyMatrix4(g.matrixWorld);
  };
  const objAnchor = (obj: THREE.Object3D) => (out: THREE.Vector3) => obj.getWorldPosition(out);

  /* ---------- materials per look (selected glow, isolate glass, dim) ---------- */
  const looks = new Map<THREE.Material, Record<Exclude<Look, "normal">, THREE.Material>>();
  const lookOf = (m: THREE.Material, l: Exclude<Look, "normal">) => {
    let set = looks.get(m);
    if (!set) {
      const hi = m.clone() as THREE.MeshStandardMaterial;
      if ("emissive" in hi) { hi.emissive = new THREE.Color(0xff6a2b); hi.emissiveIntensity = 0.42; }
      const ghost = m.clone();
      ghost.transparent = true; ghost.opacity = 0.09; ghost.depthWrite = false;
      const dim = m.clone();
      dim.transparent = true; dim.opacity = 0.32; dim.depthWrite = false;
      set = { hi, ghost, dim };
      looks.set(m, set);
    }
    return set[l];
  };
  const setLook = (mesh: THREE.Mesh, l: Look) => {
    if (!mesh.userData.base) mesh.userData.base = mesh.material;
    const base = mesh.userData.base as THREE.Material | THREE.Material[];
    mesh.material = l === "normal" ? base : Array.isArray(base) ? base.map((m) => lookOf(m, l)) : lookOf(base, l);
    mesh.castShadow = l === "normal" || l === "hi";
  };

  /* ---------- state ---------- */
  let st: State = { mode: "parts", part: null, conn: null, step: null, exploded: false, labels: true, isolate: false };
  let explodeK = 0, explodeTarget = 0, needs = true;
  let specs: LabelSpec[] = [];
  let hoverKey = "";

  function apply(prev: State | null) {
    const step = st.mode === "step" ? st.step ?? 1 : null;
    const sv = step ? STEP_VISUALS[step] : null;
    const stepParts = new Set<PartId>(sv?.parts ?? []);
    const stepConns = new Set<string>(sv?.connections ?? []);
    // a step that is about laying the parts out (step 1) is always exploded; every other step follows the toggle
    explodeTarget = (sv?.exploded || st.exploded) ? 1 : 0;
    if (reduced) { explodeK = explodeTarget; model.setExplode(explodeK); }
    if (model.track) model.track.visible = !!sv?.track;
    const glass = new Set<PartId>(sv?.seeThrough ?? []);

    for (const [id, n] of model.parts) {
      if (id === kit.wiresPart) continue;
      const shown = !step || o.installedAt[id] <= step || stepParts.has(id);
      n.group.visible = shown && !(sv?.exploded && !stepParts.has(id));
      const selected = st.mode === "parts" ? st.part === id : step ? stepParts.has(id) : false;
      const look: Look = selected ? "hi" : (st.isolate && (st.part || step)) || glass.has(id) ? "ghost" : st.mode === "wiring" && st.conn ? "dim" : "normal";
      n.meshes.forEach((m) => setLook(m, look));
    }
    for (const w of model.wires.values()) {
      const id = w.conn.id;
      const shown = !step || (o.wiredAt[id] ?? 99) <= step;
      const sel = st.mode === "wiring" ? st.conn === id : step ? stepConns.has(id) : st.part === kit.wiresPart ? w.conn.jumper : st.part === w.conn.from.part && !w.conn.jumper;
      const look: Look = sel ? "hi" : st.mode === "wiring" && st.conn ? "dim" : st.isolate && (st.part || step) ? "ghost" : "normal";
      w.mesh.visible = shown && !(sv?.exploded);
      w.plugs.forEach((p) => { p.visible = w.mesh.visible; setLook(p, look === "hi" ? "normal" : look); });
      setLook(w.mesh, look);
    }

    // labels
    const L: LabelSpec[] = [];
    if (st.mode === "parts") {
      PARTS.filter((p) => p.labelled).forEach((p, i) => { if (st.labels || st.part === p.id) L.push({ key: p.id, num: i + 1, text: p.label, part: p.id, anchor: partAnchor(p.id), accent: st.part === p.id }); });
      // details worth naming on their own (e.g. a switch, a connector)
      for (const f of kit.partFeatures) {
        const obj = model.features[f.feature];
        if (obj && (st.labels || st.part === f.part)) L.push({ key: f.key, text: f.text, part: f.part, anchor: objAnchor(obj), accent: st.part === f.part });
      }
    } else if (st.mode === "wiring") {
      const c = CONNECTIONS.find((x) => x.id === st.conn);
      if (c) {
        L.push({ key: "from", text: c.from.name, conn: c.id, anchor: (out) => model.terminalWorld(c.from.terminal, out), accent: true });
        L.push({ key: "to", text: c.to.name, conn: c.id, anchor: (out) => model.terminalWorld(c.to.terminal, out), accent: true });
      } else if (st.labels) {
        kit.wiringOverview.forEach((id, i) => L.push({ key: id, num: i + 1, text: partById(id).label, part: id, anchor: partAnchor(id) }));
      }
    } else if (sv) {
      const shownParts = (sv.parts.length ? sv.parts : kit.stepOverview).filter((id) => partById(id).onRobot);
      if (st.labels) shownParts.forEach((id, i) => L.push({ key: id, num: i + 1, text: partById(id).label, part: id, anchor: partAnchor(id), accent: !!sv.parts.length }));
      for (const d of sv.detail ? kit.stepDetails[sv.detail] ?? [] : []) {
        const obj = model.features[d.feature];
        if (obj) L.push({ key: d.key, text: d.text, anchor: objAnchor(obj), accent: true });
      }
      const named = new Set<string>();   // several wires into one terminal: name it once
      if (sv.connections) sv.connections.forEach((cid) => {
        const c = CONNECTIONS.find((x) => x.id === cid)!;
        if (named.has(c.to.terminal)) return;
        named.add(c.to.terminal);
        if (st.labels) L.push({ key: `t-${cid}`, text: c.to.name.replace("Arduino ", ""), conn: cid, anchor: (out) => model.terminalWorld(c.to.terminal, out) });
      });
    }
    buildLabels(L);

    // camera: frame what this state is about
    if (prev && prev.exploded !== st.exploded && st.mode === "parts" && !st.part) {
      if (st.exploded && explodedBox) {
        // frame the whole exploded layout from its real bounds
        const c = explodedBox.getCenter(new THREE.Vector3()), r = explodedBox.getSize(new THREE.Vector3()).length() / 2;
        const fov = THREE.MathUtils.degToRad(camera.fov) / 2;
        const fit = r / Math.sin(Math.min(fov, Math.atan(Math.tan(fov) * camera.aspect)));
        tweenTo(c, c.clone().addScaledVector(HOME.dir, fit * (camera.aspect < 1 ? 0.92 : kit.camera.explodedFit ?? 0.6))); // the bounding sphere is generous: come in closer (less so in portrait)
      } else if (st.exploded) { const t = new THREE.Vector3(...kit.camera.explodedTarget); tweenTo(t, t.clone().addScaledVector(HOME.dir, homeDist() * kit.camera.explodedDist)); }
      else goHome();
    }
    // a build step toggled between assembled and exploded: once the parts have finished moving, frame them
    // (exploded: everything installed so far, so the spread-out layout fits; assembled: the step's own focus)
    if (prev && prev.exploded !== st.exploded && sv && !sv.exploded && !sv.track) {
      pendingFrame = st.exploded ? installedBy(step!) : (sv.focus ?? sv.parts);
    }
    const changed = !prev || prev.part !== st.part || prev.conn !== st.conn || prev.step !== st.step || prev.mode !== st.mode;
    if (changed) {
      if (st.mode === "parts") {
        if (st.part && partById(st.part).onRobot) { if (!saved) saved = { t: controls.target.clone(), p: camera.position.clone() }; frameParts([st.part]); }
        else if (!st.part && saved && prev?.part) { tweenTo(saved.t, saved.p); saved = null; }
      } else if (st.mode === "wiring") {
        if (st.conn) { if (!saved) saved = { t: controls.target.clone(), p: camera.position.clone() }; frameConn(st.conn); }
        else if (saved && prev?.conn) { tweenTo(saved.t, saved.p); saved = null; }
      } else if (sv) {
        if (sv.track) tweenTo(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 2, 0).addScaledVector(new THREE.Vector3(0.45, 0.62, 0.65).normalize(), homeDist() * 1.25));
        else if (sv.exploded) pendingFrame = sv.parts; // step 1's laid-out parts, framed once they have spread out
        else if (st.exploded) pendingFrame = installedBy(step!); // moving to another step while exploded
        else frameParts(sv.focus ?? sv.parts, true);
      }
    }
    needs = true;
  }

  /* ---------- camera moves ---------- */
  let pendingFrame: PartId[] | null = null;
  const installedBy = (step: number) => PARTS.filter((p) => p.onRobot && o.installedAt[p.id] <= step).map((p) => p.id);
  let saved: { t: THREE.Vector3; p: THREE.Vector3 } | null = null;
  let tween: { ft: THREE.Vector3; fp: THREE.Vector3; tt: THREE.Vector3; tp: THREE.Vector3; t: number } | null = null;
  function tweenTo(t: THREE.Vector3, p: THREE.Vector3) {
    if (reduced) { controls.target.copy(t); camera.position.copy(p); controls.update(); tween = null; needs = true; return; }
    tween = { ft: controls.target.clone(), fp: camera.position.clone(), tt: t.clone(), tp: p.clone(), t: 0 };
  }
  function goHome() { tweenTo(HOME.target, HOME.target.clone().addScaledVector(HOME.dir, homeDist())); }
  function frameBox(b: THREE.Box3, keepDir = true, minDist = 12, pad = 1.35) {
    const c = b.getCenter(new THREE.Vector3()), r = Math.max(b.getSize(tmpV).length() / 2, 2);
    let dir = keepDir ? camera.position.clone().sub(controls.target).normalize() : HOME.dir.clone();
    const low = explodeTarget === 0 ? kit.camera.lowView?.(c) : null;
    if (low) dir = new THREE.Vector3(...low).normalize(); // a part hidden low down: look from its own side
    else if (dir.y < 0.25) dir.y = 0.25;
    dir.normalize();
    const fov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const fit = r / Math.sin(Math.min(fov, Math.atan(Math.tan(fov) * camera.aspect)));
    // stay far enough back that the whole robot remains in view around the selection
    tweenTo(c, c.clone().addScaledVector(dir, clamp(fit * pad, minDist, 80)));
  }
  function frameParts(ids: PartId[], fromHome = false, minDist = 22, pad = 1.35) {
    const b = new THREE.Box3();
    model.root.updateWorldMatrix(true, true);
    ids.forEach((id) => { const n = model.parts.get(id); if (n && partById(id).onRobot) { const lb = localBox.get(id)!.clone().applyMatrix4(n.group.matrixWorld); b.union(lb); } });
    if (b.isEmpty()) return goHome();
    frameBox(b, !fromHome, minDist, pad);
  }
  // an exploded build step: fit the spread-out parts snugly (the bounding sphere of a wide, flat layout is generous)
  const frameExploded = (ids: PartId[]) => frameParts(ids, false, 12, 0.95);
  function frameConn(id: string) {
    const w = model.wires.get(id);
    if (!w) return;
    w.mesh.geometry.computeBoundingBox();
    frameBox(w.mesh.geometry.boundingBox!.clone().applyMatrix4(model.root.matrixWorld), true, 20);
  }
  let spin = !!o.showcase && !reduced;
  controls.addEventListener("start", () => { tween = null; spin = false; controls.autoRotate = false; });
  controls.addEventListener("change", () => { needs = true; });

  /* ---------- labels with leader lines ---------- */
  type LabelEl = { spec: LabelSpec; el: HTMLButtonElement; line: SVGLineElement; dot: SVGCircleElement };
  let labelEls: LabelEl[] = [];
  const SVGNS = "http://www.w3.org/2000/svg";
  function buildLabels(L: LabelSpec[]) {
    specs = L;
    o.labels.replaceChildren();
    o.svg.replaceChildren();
    labelEls = L.map((spec) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = o.variant === "technical"
        ? `absolute left-0 top-0 pointer-events-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors ${spec.accent ? "bg-brand-500 text-white" : "bg-[#F7F3EC]/80 text-slate-800 hover:text-brand-700"}`
        : `absolute left-0 top-0 pointer-events-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-bold shadow-sm transition-colors ${spec.accent ? "bg-brand-500 border-brand-500 text-white" : "bg-white/95 border-[#E8E2D9] text-slate-800 hover:border-brand-300"}`;
      if (spec.num) {
        const n = document.createElement("span");
        n.className = `grid place-items-center w-4 h-4 rounded-full text-[10px] ${spec.accent ? "bg-white text-brand-600" : "bg-brand-500 text-white"}`;
        n.textContent = String(spec.num);
        el.appendChild(n);
      }
      el.appendChild(document.createTextNode(spec.text));
      el.addEventListener("click", (e) => { e.stopPropagation(); o.onPick(spec.part ?? null, spec.conn ?? null); });
      o.labels.appendChild(el);
      const line = document.createElementNS(SVGNS, "line");
      line.setAttribute("stroke", spec.accent ? "#C8592E" : "#8a8f96");
      line.setAttribute("stroke-width", "1");
      const dot = document.createElementNS(SVGNS, "circle");
      dot.setAttribute("r", "3");
      dot.setAttribute("fill", spec.accent ? "#C8592E" : "#5c6570");
      o.svg.append(line, dot);
      return { spec, el, line, dot };
    });
  }
  function layoutLabels() {
    const w = o.wrap.clientWidth, h = o.wrap.clientHeight;
    const pts = labelEls.map((L) => {
      L.spec.anchor(tmpV2).project(camera);
      const vis = tmpV2.z < 1 && Math.abs(tmpV2.x) < 1.2 && Math.abs(tmpV2.y) < 1.2;
      return { L, x: ((tmpV2.x + 1) / 2) * w, y: ((1 - tmpV2.y) / 2) * h, vis, ew: L.el.offsetWidth, eh: L.el.offsetHeight };
    });
    const cx = pts.length ? pts.reduce((s, p) => s + p.x, 0) / pts.length : w / 2;
    const narrow = w < 560;
    for (const side of [-1, 1]) {
      const col = pts.filter((p) => p.vis && (side < 0 ? p.x < cx : p.x >= cx)).sort((a, b) => a.y - b.y);
      let lastBottom = 8;
      for (const p of col) {
        const off = narrow ? 18 : 46;
        let lx = side < 0 ? p.x - off - p.ew : p.x + off;
        lx = clamp(lx, 6, w - p.ew - 6);
        let ly = clamp(p.y - p.eh / 2 - (narrow ? 0 : 10), 8, h - p.eh - 8);
        if (ly < lastBottom + 4) ly = lastBottom + 4;
        lastBottom = ly + p.eh;
        p.L.el.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`;
        p.L.el.style.opacity = "1";
        const ex = side < 0 ? lx + p.ew : lx, ey = ly + p.eh / 2;
        p.L.line.setAttribute("x1", p.x.toFixed(1)); p.L.line.setAttribute("y1", p.y.toFixed(1));
        p.L.line.setAttribute("x2", ex.toFixed(1)); p.L.line.setAttribute("y2", ey.toFixed(1));
        p.L.dot.setAttribute("cx", p.x.toFixed(1)); p.L.dot.setAttribute("cy", p.y.toFixed(1));
        p.L.line.style.opacity = p.L.dot.style.opacity = "1";
      }
    }
    pts.filter((p) => !p.vis).forEach((p) => { p.L.el.style.opacity = "0"; p.L.line.style.opacity = p.L.dot.style.opacity = "0"; });
  }

  /* ---------- hover and click ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pickables = () => {
    const out: THREE.Object3D[] = [];
    for (const n of model.parts.values()) if (n.group.visible) n.meshes.forEach((m) => { if (m.visible) out.push(m); });
    for (const w of model.wires.values()) if (w.mesh.visible) out.push(w.mesh);
    return out;
  };
  function hit(e: PointerEvent) {
    const r = o.canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pickables(), false).filter((x) => {
      const m = (x.object as THREE.Mesh).material as THREE.Material | THREE.Material[];
      const op = Array.isArray(m) ? m[0].opacity : m.opacity;
      return op > 0.2 || (x.object.userData.part === kit.basePart && st.part === kit.basePart);
    });
    // the base is under everything: prefer whatever sits on it
    const first = hits.find((x) => x.object.userData.part !== kit.basePart) ?? hits[0];
    return first ? { part: first.object.userData.part as PartId, conn: (first.object.userData.conn as string) ?? null, x: e.clientX - r.left, y: e.clientY - r.top } : null;
  }
  let down: { x: number; y: number } | null = null;
  const onMove = (e: PointerEvent) => {
    if (e.buttons) return;
    const h = hit(e);
    const keyNow = h ? `${h.part}|${st.mode === "wiring" ? h.conn : ""}` : "";
    o.canvas.style.cursor = h ? "pointer" : "grab";
    if (keyNow !== hoverKey) hoverKey = keyNow;
    if (h) {
      const c = st.mode === "wiring" && h.conn ? CONNECTIONS.find((x) => x.id === h.conn) : null;
      o.tip.textContent = c ? `${c.from.name} → ${c.to.name}` : partById(h.part).label;
      o.tip.style.transform = `translate(${h.x + 14}px, ${h.y + 12}px)`;
      o.tip.style.opacity = "1";
    } else o.tip.style.opacity = "0";
  };
  const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: PointerEvent) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; }
    down = null;
    const h = hit(e);
    if (st.mode === "wiring") o.onPick(null, h?.conn ?? null);
    else if (st.mode === "parts") o.onPick(h ? h.part : null, null);
  };
  const onLeave = () => { o.tip.style.opacity = "0"; };
  o.canvas.addEventListener("pointermove", onMove);
  o.canvas.addEventListener("pointerdown", onDown);
  o.canvas.addEventListener("pointerup", onUp);
  o.canvas.addEventListener("pointerleave", onLeave);

  /* ---------- sizing and the on-demand render loop ---------- */
  function resize() {
    const w = o.wrap.clientWidth, h = o.wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    needs = true;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(o.wrap);
  resize();
  camera.position.copy(HOME.target).addScaledVector(HOME.dir, homeDist());
  controls.update();

  let raf = 0, last = performance.now(), disposed = false;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = clamp((now - last) / 1000, 0, 0.1);
    last = now;
    let active = false;
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / 0.8);
      const k = ease(tween.t);
      controls.target.lerpVectors(tween.ft, tween.tt, k);
      camera.position.lerpVectors(tween.fp, tween.tp, k);
      if (tween.t >= 1) tween = null;
      active = true;
    }
    if (explodeK !== explodeTarget) {
      explodeK = Math.abs(explodeTarget - explodeK) < 0.002 ? explodeTarget : explodeK + (explodeTarget - explodeK) * (1 - Math.exp(-dt * 5.5));
      model.setExplode(ease(clamp(explodeK, 0, 1)));
      active = true;
    }
    // after a build step is toggled: closer for the exploded layout (so the separated parts read), normal for assembled
    if (pendingFrame && explodeK === explodeTarget) { const ids = pendingFrame; pendingFrame = null; if (explodeTarget) frameExploded(ids); else frameParts(ids); }
    if (spin) { controls.autoRotate = true; controls.autoRotateSpeed = 0.55; active = true; }
    if (controls.update()) active = true;
    if (active || needs) {
      renderer.render(scene, camera);
      layoutLabels();
      needs = false;
    }
  }
  raf = requestAnimationFrame(frame);

  return {
    setState(s: State) {
      if (s.part || s.conn || s.exploded) { spin = false; controls.autoRotate = false; }
      const prev = st;
      st = { ...s };
      apply(prev === s ? null : prev);
    },
    command(c: "rotL" | "rotR" | "zoomIn" | "zoomOut" | "reset") {
      spin = false; controls.autoRotate = false;
      if (c === "reset") { saved = null; goHome(); return; }
      const off = camera.position.clone().sub(controls.target);
      if (c === "rotL" || c === "rotR") off.applyAxisAngle(new THREE.Vector3(0, 1, 0), (c === "rotL" ? 1 : -1) * (Math.PI / 6));
      else off.multiplyScalar(c === "zoomIn" ? 0.75 : 1.33).clampLength(controls.minDistance, controls.maxDistance);
      tweenTo(controls.target.clone(), controls.target.clone().add(off));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      o.canvas.removeEventListener("pointermove", onMove);
      o.canvas.removeEventListener("pointerdown", onDown);
      o.canvas.removeEventListener("pointerup", onUp);
      o.canvas.removeEventListener("pointerleave", onLeave);
      o.labels.replaceChildren();
      o.svg.replaceChildren();
      looks.forEach((set) => Object.values(set).forEach((m) => m.dispose()));
      model.dispose();
      floor.geometry.dispose();
      floorMat.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      // give the WebGL context back now: browsers cap live contexts and drop the oldest one (the journey's stage)
      renderer.forceContextLoss();
    },
  };
}
