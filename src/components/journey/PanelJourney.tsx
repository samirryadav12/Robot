"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, ChevronDown, ChevronUp, LayoutList, X } from "lucide-react";
import { PROJECTS } from "@/data/projects";
import { JourneyContext } from "./context";
import type { JourneyChapter } from "./context";
import type { PanelMode } from "./mode";
import type { JourneyState, StageData, StationKind } from "./stage";
import { panelPreviews } from "./panelArt";

/* The panel journey: Nesto guides the visitor through one floating 3D panel per chapter. One scroll step per
   panel; scroll position is the single source of truth for the robot, the camera, the active panel, the rail
   and the URL. Clicking a panel (or its caption button, or Enter) expands it into the chapter's real content —
   the same JSX the regular project page shows — and closing returns to the same place, scene still running. */

interface Props {
  chapters: JourneyChapter[];
  stage: Omit<StageData, "kinds">;
  completedSteps?: Record<number, boolean>;
  stepNumbers?: number[];
  mode: PanelMode;
  fallback: ReactNode;
}
type Rect = { left: number; top: number; right: number; bottom: number };
type StageHandle = { dispose: () => void; pick: (x: number, y: number) => number; setHover: (k: number) => void; panelRect: (k: number) => Rect | null };
type Open = { id: StationKind; phase: "from" | "in" | "out"; rect: Rect | null };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const nn = (i: number) => String(i).padStart(2, "0");
const OPEN_MS = 460;          // panel expand / collapse
const HASH = /^#([a-z0-9]+?)(-open)?$/;

export function PanelJourney({ chapters, stage, completedSteps, stepNumbers, mode, fallback }: Props) {
  const project = useMemo(() => PROJECTS.find((p) => p.slug === mode.slug), [mode.slug]);
  // keyed on the ids themselves, so a page state change (which rebuilds `chapters`) doesn't re-run the setup and
  // re-apply the #hash deep link
  const idKey = chapters.map((c) => c.id).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ids = useMemo<StationKind[]>(() => ["intro", ...chapters.map((c) => c.id)], [idKey]);
  const K = ids.length;

  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<Open | null>(null);
  const [past, setPast] = useState(false); // scrolled beyond the journey (page footer)

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<StageHandle | null>(null);
  const geom = useRef({ top: 0, step: 1 });
  const activeRef = useRef(0);
  const aimRef = useRef<number | null>(null);   // step a keyboard / rail move is heading to
  const openRef = useRef<StationKind | null>(null);
  const pushedRef = useRef(false);               // the open panel has its own history entry
  const readyRef = useRef(false);
  const reducedRef = useRef(false);
  const lastFocus = useRef<HTMLElement | null>(null);

  const state = useRef<JourneyState>({
    f: 0,
    local: ids.map(() => 0.8),                         // stations show their subject fully built
    side: ids.map((id) => (id === "intro" ? 1 : 0)),   // the intro frames Nesto right of its title
    hotPin: -1,
    completed: [],
    viewerBusy: false,
    visible: true,
    pointer: { x: 0, y: 0, at: -1e9 },
  });
  state.current.completed = (stepNumbers ?? []).map((n) => !!completedSteps?.[n]);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(!!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch { setWebgl(false); }
  }, []);

  const setHash = (h: string) => {
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${h ? `#${h}` : ""}`);
  };

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    geom.current = { top: el.getBoundingClientRect().top + window.scrollY, step: Math.max(1, el.offsetHeight / K) };
  }, [K]);

  /* scroll → the one progress value everything follows */
  const sync = useCallback(() => {
    const g = geom.current, y = window.scrollY, vh = window.innerHeight;
    const f = clamp((y - g.top) / g.step, 0, K - 1);
    state.current.f = f;
    if (pctRef.current) pctRef.current.textContent = `${Math.round((f / (K - 1)) * 100)}%`;
    if (aimRef.current !== null && Math.abs(f - aimRef.current) < 0.02) aimRef.current = null;
    // past the last panel the world fades so the page footer sits on a calm page
    const end = g.top + (K - 1) * g.step;
    const fade = clamp(1 - (y - end) / (vh * 0.6));
    state.current.visible = fade > 0.001;
    if (canvasWrapRef.current) canvasWrapRef.current.style.opacity = String(fade);
    setPast(fade < 0.5);
    const a = Math.round(f);
    if (a !== activeRef.current) {
      activeRef.current = a;
      setActive(a);
      if (readyRef.current && !openRef.current) setHash(a === 0 ? "" : ids[a]);
    }
  }, [K, ids]);

  const goStep = useCallback((k: number, smooth = true) => {
    const kk = clamp(Math.round(k), 0, K - 1);
    measure();
    aimRef.current = kk;
    window.scrollTo({ top: geom.current.top + kk * geom.current.step, behavior: (smooth && !reducedRef.current ? "smooth" : "instant") as ScrollBehavior });
  }, [K, measure]);

  const openPanel = useCallback((id: StationKind, push = true) => {
    const k = ids.indexOf(id);
    if (k <= 0) return;
    if (openRef.current) { // already open: switch to the other panel in place
      openRef.current = id;
      setHash(`${id}-open`);
      goStep(k, false);
      setOpen({ id, phase: "in", rect: null });
      return;
    }
    lastFocus.current = document.activeElement as HTMLElement | null;
    const rect = stageRef.current?.panelRect(k) ?? null;
    if (Math.round(state.current.f) !== k) goStep(k, false); // travel there behind the panel, so closing lands on it
    openRef.current = id;
    if (push) { window.history.pushState(window.history.state, "", `${window.location.pathname}${window.location.search}#${id}-open`); pushedRef.current = true; }
    else { setHash(`${id}-open`); pushedRef.current = false; }
    stageRef.current?.setHover(-1);
    setOpen({ id, phase: reducedRef.current ? "in" : "from", rect });
  }, [ids, goStep]);

  const closePanel = useCallback((fromHistory = false) => {
    const id = openRef.current;
    if (!id) return;
    if (!fromHistory && pushedRef.current) { window.history.back(); return; } // popstate closes it
    openRef.current = null;
    pushedRef.current = false;
    if (!fromHistory) setHash(id);
    const rect = stageRef.current?.panelRect(ids.indexOf(id)) ?? null;
    setOpen((o) => (o ? { ...o, phase: "out", rect: rect ?? o.rect } : o));
    window.setTimeout(() => setOpen((o) => (o && o.phase === "out" ? null : o)), reducedRef.current ? 0 : OPEN_MS);
    lastFocus.current?.focus?.({ preventScroll: true });
  }, [ids]);

  // the latest handlers, for the long-lived listeners below
  const fns = useRef({ openPanel, closePanel, goStep });
  fns.current = { openPanel, closePanel, goStep };

  /* while a panel is open: the page behind keeps its scroll position, the scene idles at a low rate */
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = "hidden";
    state.current.viewerBusy = true;
    let r1 = 0, r2 = 0;
    if (open.phase === "from") r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setOpen((o) => (o && o.phase === "from" ? { ...o, phase: "in" } : o))); });
    if (open.phase === "in") closeRef.current?.focus({ preventScroll: true });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); html.style.overflow = prev; state.current.viewerBusy = false; };
  }, [open]);

  /* one panel per scroll step */
  useLayoutEffect(() => {
    if (webgl === false) return;
    const html = document.documentElement;
    const footer = document.querySelector("body > footer") as HTMLElement | null;
    const prev = [html.style.scrollSnapType, footer?.style.scrollSnapAlign ?? ""];
    html.style.scrollSnapType = "y mandatory";
    if (footer) footer.style.scrollSnapAlign = "end"; // the page footer stays reachable
    return () => { html.style.scrollSnapType = prev[0]; if (footer) footer.style.scrollSnapAlign = prev[1]; };
  }, [webgl]);

  /* geometry, scroll, pointer, keyboard, history */
  useEffect(() => {
    if (webgl === false) return;
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; sync(); }); };
    const remeasure = () => { measure(); schedule(); };
    measure();

    // deep link (#bom, or #bom-open to land with that panel open); runs after the router's own scroll handling
    const m = HASH.exec(window.location.hash);
    const want = m && ids.includes(m[1] as StationKind) ? (m[1] as StationKind) : null;
    const start = requestAnimationFrame(() => {
      measure();
      if (want) {
        const k = ids.indexOf(want);
        window.scrollTo({ top: geom.current.top + k * geom.current.step, behavior: "instant" as ScrollBehavior });
        activeRef.current = k;
        setActive(k);
        if (m![2]) fns.current.openPanel(want, false);
      }
      readyRef.current = true;
      sync();
    });

    const inTrack = () => window.scrollY < geom.current.top + (K - 0.5) * geom.current.step;
    const ui = (t: EventTarget | null) => (t as HTMLElement | null)?.closest?.("a,button,input,select,textarea,[data-journey-ui],header,footer,[role=dialog]");
    const ndcOf = (e: { clientX: number; clientY: number }) => [(e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1)] as const;

    const onPointer = (e: PointerEvent) => {
      const p = state.current.pointer;
      p.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.y = (e.clientY / window.innerHeight) * 2 - 1;
      p.at = performance.now();
      if (openRef.current || !stageRef.current) return;
      const k = !ui(e.target) && inTrack() ? stageRef.current.pick(...ndcOf(e)) : -1;
      stageRef.current.setHover(k);
      document.body.style.cursor = k > 0 ? "pointer" : "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      // in-page links to a chapter (#steps …) open that panel
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (a) {
        const url = new URL(a.href, window.location.href);
        const key = url.hash.replace("#", "").replace(/^milestones$/, "steps") as StationKind;
        if (url.pathname === window.location.pathname && ids.includes(key) && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
          if (key === "intro") fns.current.goStep(0); else fns.current.openPanel(key);
        }
        return;
      }
      if (openRef.current || ui(e.target) || !inTrack() || !stageRef.current) return;
      const k = stageRef.current.pick(...ndcOf(e));
      if (k > 0) fns.current.openPanel(ids[k]);
    };
    const onKey = (e: KeyboardEvent) => {
      if (openRef.current) {
        if (e.key === "Escape") { e.preventDefault(); fns.current.closePanel(); }
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input,textarea,select,[contenteditable=true]") || e.altKey || e.ctrlKey || e.metaKey || !inTrack()) return;
      const base = aimRef.current ?? activeRef.current;
      if (["ArrowDown", "ArrowRight", "PageDown"].includes(e.key)) { e.preventDefault(); fns.current.goStep(base + 1); }
      else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); fns.current.goStep(base - 1); }
      else if (e.key === "Enter" && !t?.closest?.("a,button") && activeRef.current > 0) { e.preventDefault(); fns.current.openPanel(ids[activeRef.current]); }
    };
    const onPop = () => {
      const h = HASH.exec(window.location.hash);
      const id = (h && ids.includes(h[1] as StationKind) ? h[1] : "intro") as StationKind;
      if (h?.[2]) {
        if (openRef.current !== id) { fns.current.openPanel(id, false); pushedRef.current = true; }
      } else {
        if (openRef.current) fns.current.closePanel(true);
        const k = ids.indexOf(id);
        if (k !== activeRef.current) fns.current.goStep(k);
      }
    };

    const ro = new ResizeObserver(remeasure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(start);
      ro.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick);
      document.body.style.cursor = "";
      readyRef.current = false;
    };
  }, [webgl, ids, K, measure, sync]);

  /* the 3D world, with a floating panel per chapter */
  const stageKey = JSON.stringify([ids, stage.modelUrl, mode.slug]);
  useEffect(() => {
    if (!webgl) return;
    let disposed = false;
    let handle: StageHandle | null = null;
    const previews = project ? panelPreviews(project, chapters.map((c) => ({ id: c.id, label: c.label }))) : chapters.map((c) => ({ eyebrow: c.label, title: c.title ?? c.label, stats: [] }));
    import("./stage")
      .then(({ createStage }) => {
        if (disposed || !canvasRef.current) return;
        try {
          handle = createStage(canvasRef.current, { ...stage, kinds: ids, panels: [null, ...previews] }, state.current, {
            reduced: reducedRef.current,
            onDark: (d) => { if (rootRef.current) rootRef.current.dataset.ink = d > 0.5 ? "light" : "dark"; },
          });
          stageRef.current = handle;
        } catch {
          setWebgl(false);
        }
      })
      .catch(() => setWebgl(false));
    return () => { disposed = true; stageRef.current = null; handle?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webgl, stageKey]);

  const goTo = useCallback((id: string) => {
    const key = (id === "milestones" ? "steps" : id) as StationKind;
    if (key === "intro") goStep(0); else if (ids.includes(key)) openPanel(key);
  }, [ids, goStep, openPanel]);

  if (webgl === false) return <>{fallback}</>;

  const ch = active > 0 ? chapters[active - 1] : null;
  const title = (c: JourneyChapter | null) => (c ? (c.id === "overview" ? project?.title ?? c.label : c.title ?? c.label) : "");
  const openCh = open ? chapters.find((c) => c.id === open.id) ?? null : null;
  const openK = open ? ids.indexOf(open.id) : -1;
  const reduced = reducedRef.current;
  const vw = typeof window === "undefined" ? 0 : window.innerWidth, vh = typeof window === "undefined" ? 0 : window.innerHeight;
  const fromClip = open?.rect
    ? `inset(${open.rect.top.toFixed(0)}px ${(vw - open.rect.right).toFixed(0)}px ${(vh - open.rect.bottom).toFixed(0)}px ${open.rect.left.toFixed(0)}px round 28px)`
    : "inset(14% 16% 14% 16% round 28px)";
  const expanded = open?.phase === "in";

  return (
    <JourneyContext.Provider value={{ goTo }}>
      <style>{`@keyframes pj-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .pj-rise{animation:pj-rise .6s cubic-bezier(.2,.7,.1,1) both}
        @media (prefers-reduced-motion: reduce){.pj-rise{animation:none}}`}</style>
      <div ref={rootRef} className="journey relative" data-ink="dark">
        <div ref={canvasWrapRef} aria-hidden className="journey-canvas fixed inset-0 z-0 pointer-events-none">
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>

        {/* the scroll track: one viewport per step */}
        <div ref={trackRef} className="relative" style={{ height: `${K * 100}svh` }} aria-hidden>
          {ids.map((id) => <div key={id} className="h-[100svh]" style={{ scrollSnapAlign: "start" }} />)}
        </div>

        {/* captions */}
        {!past && (
          <div data-journey-ui className="fixed inset-x-0 bottom-0 z-30 pointer-events-none">
            {active === 0 ? (
              <div key="intro" className="pj-rise max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 lg:pb-[16vh]">
                <div className="journey-ink max-w-xl pointer-events-auto">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-brand-600">Nesto&apos;s build journey</div>
                  <h1 className="mt-3 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]">{project?.title}</h1>
                  <p className="mt-4 text-base sm:text-lg leading-relaxed opacity-80 max-w-md">{project?.shortDescription ?? project?.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                    {[project?.level, project?.timeEstimate, project ? `${project.partsCount} parts` : null].filter(Boolean).map((x) => (
                      <span key={x} className="px-3 py-1.5 rounded-full bg-white/85 border border-[#E8E2D9] text-slate-700">{x}</span>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => goStep(1)} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-md transition-colors">
                      Start the journey <ArrowDown className="w-4 h-4" />
                    </button>
                    <Link href={mode.classicHref} className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/90 hover:bg-white border border-[#E8E2D9] text-slate-800 font-bold text-sm">
                      <LayoutList className="w-4 h-4" /> Classic view
                    </Link>
                  </div>
                </div>
              </div>
            ) : ch ? (
              <div key={ch.id} className="pj-rise max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 lg:pb-10">
                <div className="journey-ink max-w-lg pointer-events-auto">
                  <div className="flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.22em]">
                    <span className="text-brand-500">{nn(active)} / {nn(K - 1)}</span>
                    <span className="h-px w-8 bg-current opacity-30" />
                    <span className="opacity-70">{ch.label}</span>
                  </div>
                  <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.05]">{title(ch)}</h2>
                  {ch.lede && <p className="mt-2 text-sm sm:text-base leading-relaxed opacity-80 hidden sm:block">{ch.lede}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => openPanel(ch.id)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-md transition-colors">
                      Open {ch.label} <ArrowUpRight className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-semibold opacity-60 hidden sm:inline">or click the panel · Enter</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* progress rail: every step, with the share of the journey travelled */}
        {!past && (
          <nav data-journey-ui aria-label="Journey panels" className="hidden lg:block fixed right-5 top-1/2 -translate-y-1/2 z-40">
            <div className="flex flex-col items-center gap-1.5 py-3 px-1.5 rounded-full bg-white/85 border border-[#E8E2D9] shadow-subtle">
              <span ref={pctRef} className="text-[10px] font-extrabold text-brand-600 tabular-nums" aria-hidden>0%</span>
              <ol className="flex flex-col">
                {ids.map((id, i) => {
                  const label = i === 0 ? "Introduction" : chapters[i - 1].label;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => goStep(i)}
                        aria-current={active === i ? "step" : undefined}
                        aria-label={`${nn(i)} ${label}`}
                        className="group relative flex items-center justify-center w-8 h-7 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                      >
                        <span className={`block rounded-full transition-all duration-300 ${active === i ? "w-3 h-3 bg-brand-500 ring-4 ring-brand-100" : i < active ? "w-2 h-2 bg-brand-300" : "w-2 h-2 bg-slate-300 group-hover:bg-brand-400"}`} />
                        <span className="pointer-events-none absolute right-10 whitespace-nowrap rounded-full bg-white border border-[#E8E2D9] shadow-subtle px-3 py-1.5 text-xs font-bold text-slate-800 opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0">
                          <span className="text-brand-600 mr-1.5">{nn(i)}</span>{label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </nav>
        )}

        {/* phones: previous / next */}
        {!past && (
          <div data-journey-ui className="lg:hidden fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-1 h-11 pl-1 pr-1 rounded-full bg-white/95 border border-[#E8E2D9] shadow-lift text-sm font-bold text-slate-800">
              <button type="button" onClick={() => goStep(active - 1)} disabled={active === 0} aria-label="Previous panel" className="w-9 h-9 grid place-items-center rounded-full disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
              <span className="px-2 tabular-nums text-xs text-brand-600">{nn(active)} / {nn(K - 1)}</span>
              <span className="max-w-[9rem] truncate">{active === 0 ? "Introduction" : chapters[active - 1].label}</span>
              <button type="button" onClick={() => goStep(active + 1)} disabled={active === K - 1} aria-label="Next panel" className="w-9 h-9 grid place-items-center rounded-full disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {/* an open panel: the chapter's real content, grown out of the 3D panel */}
        {open && openCh && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pj-open-title"
            className="journey-open fixed inset-0 z-[70] overflow-y-auto overscroll-contain"
            style={reduced
              ? { opacity: expanded ? 1 : 0, transition: "opacity 200ms" }
              : { clipPath: expanded ? "inset(0px 0px 0px 0px round 0px)" : fromClip, transition: `clip-path ${OPEN_MS}ms cubic-bezier(.65,0,.35,1)` }}
          >
            <div className="journey-open-bar sticky top-0 z-10 backdrop-blur-md">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brand-600">{nn(openK)} / {nn(K - 1)} · {project?.title}</div>
                  <h2 id="pj-open-title" className="text-lg sm:text-xl font-extrabold tracking-tight text-white truncate">{openCh.label}</h2>
                </div>
                {openK < K - 1 && (
                  <button type="button" onClick={() => openPanel(ids[openK + 1])} className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[#E8E2D9] text-sm font-bold text-slate-700 hover:border-brand-300">
                    Next: {chapters[openK].label} <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                )}
                <button ref={closeRef} type="button" onClick={() => closePanel()} aria-label="Close panel (Esc)" className="w-10 h-10 grid place-items-center rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10" style={{ opacity: expanded ? 1 : 0, transition: `opacity ${reduced ? 0 : 280}ms ${reduced ? 0 : 160}ms` }}>
              <div className="journey-sheet journey-sheet-space rounded-[2rem] border p-4 sm:p-6 lg:p-8 shadow-lift">
                {openCh.children}
              </div>
            </div>
          </div>
        )}
      </div>
    </JourneyContext.Provider>
  );
}
