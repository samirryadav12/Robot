import type { Project } from "@/data/projects";
import { getStoreBundlesForProject } from "@/data/stores";
import type { PanelPreview, StationKind } from "./stage";

/* The floating panels of the panel journey: what each one previews (straight from the project's data) and the
   live HTML screen that shows it in the 3D scene. Every panel shares one look — smoked holographic
   glass with fine illuminated edges, RoboNest orange as the accent and restrained cyan/violet light — while its
   central visual follows what the chapter actually holds: a photo or diagram, a parts list, a build timeline,
   source code, store stock. */

// remote images go through Next's image endpoint so they arrive same-origin (a cross-origin image would taint the
// canvas and could not be uploaded to WebGL); local ones are used as they are
const sameOrigin = (src?: string) =>
  !src ? undefined : /^https?:\/\//.test(src) ? `/_next/image?url=${encodeURIComponent(src)}&w=640&q=75` : encodeURI(src);

const WIRE: Record<string, string> = {
  red: "#E5533D", black: "#3A3F47", white: "#F2F0EA", yellow: "#F2C230", green: "#3FB46E", blue: "#3B82F6",
  orange: "#F0862E", purple: "#9A6BE0", brown: "#9A6232", grey: "#9AA0A8", gray: "#9AA0A8", pink: "#E8789C",
};
const wireCss = (name: string) => WIRE[name.toLowerCase().match(/[a-z]+/g)?.find((w) => w in WIRE) ?? ""] ?? "#C8592E";

export function panelPreviews(project: Project, chapters: { id: StationKind; label: string }[]): PanelPreview[] {
  const bom = project.bom ?? [], pins = project.pinout ?? [], steps = project.steps ?? [], faqs = project.faqs ?? [];
  const code = (project.arduinoCode ?? "").split("\n").filter((l) => l.trim());
  const stores = getStoreBundlesForProject(project);
  const photo = sameOrigin(project.realImage ?? project.image);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return chapters.map((c, i): PanelPreview => {
    const eyebrow = `${String(i + 1).padStart(2, "0")} · ${c.label}`;
    const kind = c.id;
    switch (c.id) {
      case "overview":
        return { kind, eyebrow, title: project.title, stats: [project.level, project.timeEstimate, plural(project.partsCount, "part")], thumb: photo, lines: [project.shortDescription ?? project.description] };
      case "bom": {
        const cats = [...new Set(bom.map((b) => b.category))];
        return {
          kind, eyebrow, title: "Every part, laid out",
          stats: [plural(bom.length, "part"), plural(cats.length, "category")],
          lines: bom.slice(0, 6).map((b) => `${b.qty}× ${b.name}`),
          cards: cats.slice(0, 4).map((cat) => ({ label: cat, value: String(bom.filter((b) => b.category === cat).length) })),
        };
      }
      case "wiring":
        return { kind, eyebrow, title: "Follow every wire", stats: [plural(pins.length, "connection"), plural(new Set(pins.map((p) => p.wireColor)).size, "wire colour")], thumb: sameOrigin(project.wiringImage ?? `/robotics/wiring/${project.slug}/wiring.png`), lines: pins.slice(0, 6).map((p) => `${p.componentPin} → ${p.targetPin}`), swatches: pins.slice(0, 6).map((p) => wireCss(p.wireColor)) };
      case "pinout":
        return { kind, eyebrow, title: "Where each wire lands", stats: [plural(pins.length, "pin"), project.microcontroller], thumb: sameOrigin(`/robotics/pinout/${project.slug}/pinout.png`), lines: pins.slice(0, 6).map((p) => `${p.targetPin}  ${p.componentPin}`), swatches: pins.slice(0, 6).map((p) => wireCss(p.wireColor)) };
      case "steps":
        return { kind, eyebrow, title: "Build it step by step", stats: [plural(steps.length, "step"), project.timeEstimate], lines: steps.slice(0, 6).map((s) => `${s.stepNumber}. ${s.title}`) };
      case "view3d":
        return { kind, eyebrow, title: "Turn it around in 3D", stats: ["Drag to rotate", "Tap any part"], thumb: photo, lines: ["The finished robot in 3D."] };
      case "code":
        return { kind, eyebrow, title: "Give it a brain", stats: [plural(code.length, "line"), project.microcontroller], lines: code.slice(0, 13), code: true };
      case "stores": {
        const top = Math.max(1, ...stores.map((s) => s.totalParts || s.availableParts));
        return { kind, eyebrow, title: "Get the parts", stats: [plural(stores.length, "store"), stores.find((s) => s.isTopStock)?.name ?? "Compare prices"].filter(Boolean) as string[], lines: stores.slice(0, 6).map((s) => `${s.name} · ${s.availableParts} parts`), meters: stores.slice(0, 6).map((s) => s.availableParts / (s.totalParts || top)) };
      }
      case "faq":
        return { kind, eyebrow, title: "Questions, answered", stats: [plural(faqs.length, "question")], lines: faqs.slice(0, 4).map((f) => f.q) };
      default:
        return { kind, eyebrow, title: c.label, stats: [] };
    }
  });
}

/* The panel is a real HTML screen placed in the 3D scene (see stage.ts): the browser draws its text and images,
   so it stays sharp at any zoom or distance. It is laid out at PANEL_W × PANEL_H CSS pixels and scaled to the
   panel's size in the world. */
export const PANEL_W = 1024, PANEL_H = 640;

const CSS = `
.rnp { position: relative; width: ${PANEL_W}px; height: ${PANEL_H}px; border-radius: 40px; overflow: hidden; box-sizing: border-box;
  color: #23282E; font-family: var(--font-plus-jakarta, system-ui), system-ui, sans-serif; -webkit-font-smoothing: antialiased;
  /* the glass body itself is the translucent pane in the 3D scene; this only adds its liquid light */
  background:
    radial-gradient(520px 300px at 18% -4%, rgba(255, 255, 255, .42), transparent 70%),
    radial-gradient(700px 260px at 70% 108%, rgba(255, 255, 255, .26), transparent 70%),
    linear-gradient(180deg, rgba(255, 255, 255, .22), rgba(235, 238, 242, .08) 45%, rgba(255, 255, 255, .18));
  box-shadow:
    inset 0 0 0 1.5px rgba(255, 255, 255, .85),
    inset 0 0 0 9px rgba(255, 255, 255, .14),
    inset 0 0 0 10.5px rgba(255, 255, 255, .45),
    inset 0 3px 0 rgba(255, 255, 255, 1),
    inset 0 -4px 10px rgba(255, 255, 255, .45),
    inset 18px 0 30px -18px rgba(255, 255, 255, .55),
    inset -18px 0 30px -18px rgba(255, 255, 255, .55); }
.rnp, .rnp * { pointer-events: none; user-select: none; }
.rnp::after { content: ""; position: absolute; inset: 0; background: linear-gradient(118deg, transparent 22%, rgba(255, 255, 255, .28) 30%, transparent 40%, transparent 70%, rgba(255, 255, 255, .12) 76%, transparent 84%); }
.rnp-mono { font-family: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace; }
.rnp-corner { display: none; }
.rnp-left { position: absolute; left: 56px; top: 64px; width: 468px; z-index: 1; }
.rnp-eb { display: flex; align-items: center; gap: 14px; font-size: 18px; font-weight: 600; letter-spacing: 3px; color: #4A5159; text-transform: uppercase; white-space: nowrap; }
.rnp-eb i { flex: none; width: 9px; height: 9px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 1.5px rgba(60, 66, 74, .35), 0 0 10px #fff; }
.rnp-eb span { overflow: hidden; text-overflow: ellipsis; }
.rnp-eb b { flex: 1; min-width: 20px; height: 1.5px; background: linear-gradient(90deg, rgba(60, 66, 74, .35), transparent); }
.rnp-title { margin: 28px 0 0; font-size: 60px; line-height: 64px; font-weight: 300; letter-spacing: -1.5px; color: #1F242A;
  text-shadow: 0 1px 0 rgba(255, 255, 255, .6), 0 0 18px rgba(255, 255, 255, .35);
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.rnp-chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
.rnp-chip { padding: 9px 20px; border-radius: 999px; font-size: 20px; font-weight: 500; color: #2C3238;
  background: linear-gradient(180deg, rgba(255, 255, 255, .62), rgba(255, 255, 255, .3));
  box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, .9), inset 0 -2px 6px rgba(255, 255, 255, .5), 0 4px 14px rgba(0, 0, 0, .12);
  max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rnp-cards { display: grid; gap: 10px; margin-top: 20px; }
.rnp-card { display: flex; align-items: center; gap: 12px; height: 62px; padding: 0 18px; border-radius: 31px;
  background: linear-gradient(180deg, rgba(255, 255, 255, .58), rgba(255, 255, 255, .26));
  box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, .9), inset 0 -2px 8px rgba(255, 255, 255, .5), 0 6px 16px rgba(0, 0, 0, .12); }
.rnp-card i { display: none; }
.rnp-card b { font-size: 30px; font-weight: 400; color: #1F242A; }
.rnp-card span { font-size: 19px; font-weight: 500; color: #3E454D; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rnp-cta { position: absolute; left: 56px; bottom: 56px; display: flex; align-items: center; gap: 22px; z-index: 3; }
.rnp-cta b { padding: 16px 32px; border-radius: 999px; font-size: 25px; font-weight: 500; color: #1F242A;
  background: linear-gradient(180deg, rgba(255, 255, 255, .8), rgba(255, 255, 255, .42));
  box-shadow: inset 0 0 0 1.5px #fff, inset 0 -3px 8px rgba(255, 255, 255, .7), 0 6px 20px rgba(0, 0, 0, .18), 0 0 22px rgba(255, 255, 255, .35); }
.rnp-cta span { font-size: 16px; font-weight: 600; letter-spacing: 2px; color: #3E454D; }
.rnp-vis { position: absolute; left: 584px; top: 52px; width: 388px; height: 448px; border-radius: 28px; overflow: hidden; z-index: 1;
  background: linear-gradient(180deg, rgba(255, 255, 255, .42), rgba(255, 255, 255, .2));
  box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, .95), inset 0 0 24px rgba(255, 255, 255, .45), 0 10px 30px rgba(0, 0, 0, .18); }
.rnp-vis > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.rnp-vis > .rnp-wash { position: absolute; inset: 0; background: linear-gradient(rgba(255, 255, 255, .16), transparent 45%, rgba(255, 255, 255, .22)); box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, .9), inset 0 0 26px rgba(255, 255, 255, .5); border-radius: 28px; }
.rnp-vtick { display: none; }
.rnp-orbit { position: absolute; left: 8%; right: 8%; top: 63%; height: 18%; border-radius: 50%; border: 1.5px dashed rgba(255, 255, 255, .85); }
.rnp-rows { position: absolute; inset: 16px; display: flex; flex-direction: column; gap: 10px; }
.rnp-row { flex: 1; min-height: 0; display: flex; align-items: center; gap: 14px; padding: 0 18px; border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, .6), rgba(255, 255, 255, .3));
  box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, .9), inset 0 -2px 6px rgba(255, 255, 255, .45);
  font-size: 19px; font-weight: 500; color: #23282E; line-height: 22px; }
.rnp-row .t { flex: 1; min-width: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rnp-row .t.one { -webkit-line-clamp: 1; }
.rnp-badge { flex: none; min-width: 40px; height: 30px; padding: 0 10px; box-sizing: border-box; display: grid; place-items: center; border-radius: 15px;
  font-size: 16px; font-weight: 600; color: #2C3238; background: rgba(255, 255, 255, .7); box-shadow: inset 0 0 0 1px rgba(60, 66, 74, .18); }
.rnp-badge.q { color: #2C3238; }
.rnp-dot { flex: none; width: 12px; height: 12px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 1.5px rgba(255, 255, 255, .9), 0 0 0 2.5px rgba(40, 46, 54, .2); }
.rnp-meter { height: 6px; margin-top: 8px; border-radius: 3px; background: rgba(40, 46, 54, .12); overflow: hidden; }
.rnp-meter i { display: block; height: 100%; background: linear-gradient(90deg, #8A9098, #4A5159); border-radius: 3px; }
.rnp-steps { position: absolute; inset: 20px 20px 20px 22px; display: flex; flex-direction: column; justify-content: space-around; }
.rnp-steps::before { content: ""; position: absolute; left: 16px; top: 8%; bottom: 8%; width: 2px; background: rgba(255, 255, 255, .8); }
.rnp-step { position: relative; display: flex; align-items: center; gap: 16px; font-size: 19px; font-weight: 500; color: #23282E; line-height: 23px; }
.rnp-step b { flex: none; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-size: 15px; font-weight: 600; color: #2C3238;
  background: linear-gradient(180deg, rgba(255, 255, 255, .85), rgba(255, 255, 255, .5)); box-shadow: inset 0 0 0 1.5px #fff, 0 3px 10px rgba(0, 0, 0, .15); }
.rnp-step span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rnp-code { position: absolute; inset: 0; background: rgba(255, 255, 255, .45); font-size: 18px; line-height: 29px; }
.rnp-code-bar { height: 40px; display: flex; align-items: center; gap: 9px; padding-left: 18px; background: rgba(255, 255, 255, .35); }
.rnp-code-bar i { width: 10px; height: 10px; border-radius: 50%; background: rgba(40, 46, 54, .2); }
.rnp-code ol { margin: 0; padding: 14px 16px 0 0; list-style: none; counter-reset: ln; border-left: 0; }
.rnp-code li { counter-increment: ln; display: flex; white-space: pre; overflow: hidden; }
.rnp-code li::before { content: counter(ln); flex: none; width: 44px; margin-right: 26px; text-align: right; color: rgba(40, 46, 54, .4);
  box-shadow: 13px 0 0 -12px rgba(40, 46, 54, .15); }
.rnp-code li span { overflow: hidden; text-overflow: ellipsis; }
.rnp-float { position: absolute; left: 520px; width: 268px; padding: 16px 20px; border-radius: 24px; z-index: 3; box-sizing: border-box;
  background: linear-gradient(180deg, rgba(246, 247, 249, .9), rgba(222, 226, 231, .82));
  box-shadow: inset 0 0 0 1.5px #fff, inset 0 -3px 10px rgba(255, 255, 255, .6), 0 12px 30px rgba(0, 0, 0, .25); }
.rnp-float p { margin: 0; font-size: 18px; line-height: 27px; color: #2C3238; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.rnp-float div { display: flex; align-items: center; gap: 12px; height: 38px; font-size: 17px; color: #2C3238; white-space: nowrap; }
.rnp-float div span { overflow: hidden; text-overflow: ellipsis; }
.rnp-link { position: absolute; z-index: 2; box-sizing: border-box; border: 1.5px solid rgba(255, 255, 255, .8); border-left: 0; border-bottom: 0; }
.rnp-tail { position: absolute; z-index: 2; width: 18px; height: 0; border-top: 1.5px solid rgba(255, 255, 255, .8); }
.rnp-link::before { content: ""; position: absolute; left: -5px; top: -5px; width: 8px; height: 8px; border-radius: 50%; background: #fff; box-shadow: 0 0 10px #fff; }
`;

let styled = false;
function ensureStyles() {
  if (styled || typeof document === "undefined") return;
  styled = true;
  const s = document.createElement("style");
  s.dataset.rnPanels = "";
  s.textContent = CSS;
  document.head.appendChild(s);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string, parent?: HTMLElement) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent?.appendChild(e);
  return e;
}

const codeColour = (t: string) =>
  /^\s*(\/\/|\/\*|\*)/.test(t) ? "#3F8A55" : /^\s*#/.test(t) ? "#8357C7" : /\b(void|int|const|float|bool|if|else|for|while|return)\b/.test(t) ? "#1F74B8" : "#22323F";

/* builds one panel's screen from its preview */
export function createPanelDom(p: PanelPreview) {
  ensureStyles();
  const kind: StationKind = p.kind ?? (p.code ? "code" : "overview");
  const root = el("div", "rnp");
  root.setAttribute("aria-hidden", "true"); // the chapter's own caption and button carry the content for assistive tech
  for (const c of ["tl", "tr", "bl", "br"]) el("i", `rnp-corner ${c}`, undefined, root);

  /* left column: step identifier, title, chips, readouts */
  const left = el("div", "rnp-left", undefined, root);
  const eb = el("div", "rnp-eb rnp-mono", undefined, left);
  el("i", undefined, undefined, eb);
  el("span", undefined, p.eyebrow, eb);
  el("b", undefined, undefined, eb);
  el("h3", "rnp-title", p.title, left);
  if (p.stats.length) {
    const chips = el("div", "rnp-chips", undefined, left);
    p.stats.slice(0, 4).forEach((s) => el("span", "rnp-chip", s, chips));
  }
  const cards = (p.cards ?? []).slice(0, 4);
  if (cards.length) {
    const box = el("div", "rnp-cards", undefined, left);
    box.style.gridTemplateColumns = `repeat(${cards.length > 2 ? 2 : cards.length}, 1fr)`;
    cards.forEach((c) => {
      const card = el("div", "rnp-card", undefined, box);
      el("i", undefined, undefined, card);
      el("b", undefined, c.value, card);
      el("span", undefined, c.label, card);
    });
  }

  /* the central visual */
  const vis = el("div", "rnp-vis", undefined, root);
  const ticks: [string, string][] = [["top:6px;left:6px", "border-right:0;border-bottom:0"], ["top:6px;right:6px", "border-left:0;border-bottom:0"], ["bottom:6px;left:6px", "border-right:0;border-top:0"], ["bottom:6px;right:6px", "border-left:0;border-top:0"]];
  const lines = p.lines ?? [];
  const fallback = () => {
    vis.replaceChildren();
    if (p.code) codeView(vis, lines);
    else if (lines.length) listView(vis, p, kind, lines);
  };
  let float: HTMLElement | null = null, link: HTMLElement | null = null;
  if (p.thumb) {
    const img = el("img", undefined, undefined, vis);
    img.alt = "";
    img.decoding = "async";
    img.src = p.thumb;
    el("div", "rnp-wash", undefined, vis);
    if (kind === "view3d") el("div", "rnp-orbit", undefined, vis);
    // a floating card over the picture, tied to the left column by a connector
    if (lines.length && kind !== "view3d") {
      float = el("div", "rnp-float", undefined, root);
      if (kind === "overview") el("p", undefined, lines[0], float);
      else lines.slice(0, 3).forEach((t, i) => {
        const row = el("div", "rnp-mono", undefined, float!);
        const dot = el("i", "rnp-dot", undefined, row);
        dot.style.color = p.swatches?.[i] ?? "#6B727A";
        el("span", undefined, t, row);
      });
      const rows = kind === "overview" ? 0 : Math.min(3, lines.length);
      const fh = kind === "overview" ? 140 : 32 + rows * 38;
      const fy = 52 + 448 - fh + 34;
      float.style.top = `${fy}px`;
      // connector: across from the left column, down, and into the card
      link = el("i", "rnp-link", undefined, root);
      Object.assign(link.style, { left: "484px", top: `${fy - 30}px`, width: "18px", height: "52px" });
      const tail = el("i", "rnp-tail", undefined, root);
      Object.assign(tail.style, { left: "502px", top: `${fy + 22}px` });
      img.addEventListener("error", () => { float?.remove(); link?.remove(); tail.remove(); fallback(); addTicks(); });
    } else {
      img.addEventListener("error", () => { fallback(); addTicks(); });
    }
  } else fallback();
  const addTicks = () => ticks.forEach(([pos, cut]) => { const t = el("i", "rnp-vtick", undefined, vis); t.style.cssText += `${pos};${cut}`; });
  addTicks();

  /* the call to action */
  const cta = el("div", "rnp-cta", undefined, root);
  el("b", undefined, "Open  ↗", cta);
  el("span", "rnp-mono", "CLICK · ENTER", cta);
  return root;
}

function codeView(vis: HTMLElement, lines: string[]) {
  const box = el("div", "rnp-code rnp-mono", undefined, vis);
  const bar = el("div", "rnp-code-bar", undefined, box);
  for (let i = 0; i < 3; i++) el("i", undefined, undefined, bar);
  const ol = el("ol", undefined, undefined, box);
  lines.slice(0, 13).forEach((l) => {
    const t = l.replace(/\t/g, "  ");
    const li = el("li", undefined, undefined, ol);
    const s = el("span", undefined, t, li);
    s.style.color = codeColour(t);
  });
}

function listView(vis: HTMLElement, p: PanelPreview, kind: StationKind, all: string[]) {
  const lines = all.slice(0, kind === "faq" ? 4 : 6);
  if (kind === "steps") {
    const box = el("div", "rnp-steps", undefined, vis);
    lines.forEach((l, i) => {
      const m = l.match(/^(\d+)\.\s*(.*)$/);
      const row = el("div", "rnp-step", undefined, box);
      el("b", "rnp-mono", m ? m[1] : String(i + 1), row);
      el("span", undefined, m ? m[2] : l, row);
    });
    return;
  }
  const box = el("div", "rnp-rows", undefined, vis);
  lines.forEach((l, i) => {
    const row = el("div", "rnp-row", undefined, box);
    let text = l;
    if (kind === "bom") {
      const m = l.match(/^(\d+)×\s*(.*)$/);
      el("span", "rnp-badge rnp-mono", m ? `${m[1]}×` : "•", row);
      text = m ? m[2] : l;
    } else if (kind === "faq") {
      el("span", "rnp-badge q rnp-mono", "Q", row);
    } else {
      const dot = el("i", "rnp-dot", undefined, row);
      dot.style.color = p.swatches?.[i] ?? "#6B727A";
    }
    if (p.meters) {
      const col = el("div", "t one", undefined, row);
      col.style.display = "block";
      el("div", "t one", text, col).style.cssText = "display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
      const meter = el("div", "rnp-meter", undefined, col);
      el("i", undefined, undefined, meter).style.width = `${Math.round(Math.max(0, Math.min(1, p.meters[i] ?? 0)) * 100)}%`;
    } else el("span", "t", text, row);
  });
}
