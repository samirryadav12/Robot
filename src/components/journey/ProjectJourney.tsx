"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import type { JourneyState, StageData, StationKind } from "./stage";
import { JourneyContext } from "./context";
import type { JourneyChapter } from "./context";
import { usePanelMode } from "./mode";
import { PanelJourney } from "./PanelJourney";

export { JourneyLink, useJourney } from "./context";
export type { JourneyChapter } from "./context";

export interface ProjectJourneyProps {
  chapters: JourneyChapter[];
  stage: Omit<StageData, "kinds">;
  completedSteps?: Record<number, boolean>;
  stepNumbers?: number[];
}

/* A project page's chapters, shown either as the long scroll page (the regular project page) or, inside
   <PanelJourneyMode>, as the panel journey. Both are fed the same chapters, so the tab content is shared. */
export function ProjectJourney(props: ProjectJourneyProps) {
  const panelMode = usePanelMode();
  // without WebGL the panel journey falls back to the plain stacked chapters of the scroll page
  return panelMode ? <PanelJourney {...props} mode={panelMode} fallback={<ScrollJourney {...props} />} /> : <ScrollJourney {...props} />;
}

/* One continuous, scroll-driven project page. Each chapter is a <section> with a short "beat" (the
   chapter title, shown beside an open view of the 3D world while Nesto travels to the next station)
   followed by the chapter's existing content on a readable sheet. Scroll position drives the 3D
   journey; the compact navigator jumps anywhere and stays in sync. */

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const nn = (i: number) => String(i + 1).padStart(2, "0");

export function ScrollJourney({ chapters, stage, completedSteps, stepNumbers }: ProjectJourneyProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const bodyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [stageOff, setStageOff] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // keyed on the ids themselves: the page rebuilds `chapters` on every state change (e.g. "Mark as Done"), and a
  // new ids array would re-run the setup effect below, re-applying the #hash deep link and jumping the page
  const idKey = chapters.map((c) => c.id).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ids = useMemo(() => chapters.map((c) => c.id), [idKey]);
  // even chapters read on the left with the 3D world on the right; odd chapters swap sides
  const sides = useMemo(() => chapters.map((_, i) => (i % 2 === 0 ? 1 : -1)), [chapters]);

  const state = useRef<JourneyState>({
    f: 0,
    local: chapters.map(() => 0),
    side: sides,
    hotPin: -1,
    completed: [],
    viewerBusy: false,
    visible: true,
    pointer: { x: 0, y: 0, at: -1e9 },
  });
  state.current.side = sides;
  state.current.completed = (stepNumbers ?? []).map((n) => !!completedSteps?.[n]);

  const geom = useRef({ tops: [] as number[], beats: [] as number[], bodies: [] as { top: number; h: number }[], rootTop: 0, rootBottom: 0 });
  const reducedRef = useRef(false);
  const activeRef = useRef(0);
  const userScrolled = useRef(false);

  const measure = useCallback(() => {
    const y = window.scrollY;
    const g = geom.current;
    g.tops = sectionRefs.current.map((el) => (el ? el.getBoundingClientRect().top + y : 0));
    g.bodies = bodyRefs.current.map((el) => {
      const r = el?.getBoundingClientRect();
      return r ? { top: r.top + y, h: r.height } : { top: 0, h: 1 };
    });
    const rr = rootRef.current?.getBoundingClientRect();
    g.rootTop = (rr?.top ?? 0) + y;
    g.rootBottom = (rr?.bottom ?? 0) + y;
  }, []);

  /* scroll → journey state; reads only cached geometry, so scrolling never forces layout */
  const sync = useCallback(() => {
    const y = window.scrollY, vh = window.innerHeight, g = geom.current, s = state.current;
    let f = 0;
    for (let i = 1; i < g.tops.length; i++) f += clamp((y + vh * 0.95 - g.tops[i]) / (vh * 0.75));
    s.f = f;
    s.local = g.bodies.map((b) => clamp((y + vh * 0.6 - b.top) / Math.max(b.h - vh * 0.2, 1)));
    // one source of truth: the active chapter is read from the same progress that moves Nesto and the camera
    const a = Math.min(g.tops.length - 1, Math.max(0, Math.floor(f + 0.5)));
    const v3 = ids.indexOf("view3d");
    const vb = v3 >= 0 ? g.bodies[v3] : null;
    s.viewerBusy = !!vb && y + vh > vb.top + 120 && y < vb.top + vb.h - 120;
    // fade the world out as the journey ends so the site footer sits on a calm page
    const fade = clamp((g.rootBottom - y - vh * 0.15) / (vh * 0.5));
    s.visible = fade > 0.001;
    if (canvasWrapRef.current) canvasWrapRef.current.style.opacity = String(fade);
    if (a !== activeRef.current) {
      activeRef.current = a;
      setActive(a);
      if (userScrolled.current) window.history.replaceState(window.history.state, "", `${window.location.pathname}#${ids[a]}`);
    }
  }, [ids]);

  const goTo = useCallback((id: string) => {
    const i = ids.indexOf((id === "milestones" ? "steps" : id) as StationKind);
    if (i < 0) return;
    measure();
    userScrolled.current = true;
    const top = i === 0 ? 0 : geom.current.tops[i];
    window.scrollTo({ top, behavior: reducedRef.current ? "auto" : "smooth" });
    sectionRefs.current[i]?.focus({ preventScroll: true });
    setSheetOpen(false);
  }, [ids, measure]);

  /* geometry, scroll and pointer wiring */
  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; sync(); }); };
    const remeasure = () => { measure(); schedule(); };
    const onScroll = () => schedule();
    const onUser = () => { userScrolled.current = true; };
    const onPointer = (e: PointerEvent) => {
      const p = state.current.pointer;
      p.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.y = (e.clientY / window.innerHeight) * 2 - 1;
      p.at = performance.now();
      // hovering a row of the pin table lights that pin on the 3D board
      const row = (e.target as HTMLElement | null)?.closest?.("#pinout tbody tr") as HTMLTableRowElement | null;
      state.current.hotPin = row ? row.sectionRowIndex : -1;
    };
    measure();
    sync();
    const ro = new ResizeObserver(remeasure);
    if (rootRef.current) ro.observe(rootRef.current);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", remeasure);
    window.addEventListener("wheel", onUser, { passive: true });
    window.addEventListener("touchstart", onUser, { passive: true });
    window.addEventListener("keydown", onUser);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.fonts?.ready.then(remeasure).catch(() => {});

    /* deep links: #wiring, or the older ?tab=code links, open straight at that chapter */
    const hash = window.location.hash.replace("#", "");
    const tab = new URLSearchParams(window.location.search).get("tab");
    const want = [hash, tab].map((x) => (x === "milestones" ? "steps" : x)).find((x) => x && ids.includes(x as StationKind));
    if (want) {
      const i = ids.indexOf(want as StationKind);
      requestAnimationFrame(() => {
        measure();
        window.scrollTo({ top: i === 0 ? 0 : geom.current.tops[i], behavior: "auto" });
        window.history.replaceState(window.history.state, "", `${window.location.pathname}#${want}`);
      });
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("wheel", onUser);
      window.removeEventListener("touchstart", onUser);
      window.removeEventListener("keydown", onUser);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [ids, measure, sync]);

  /* in-page links anywhere in the journey (e.g. "#steps") travel through the journey instead of jumping */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const url = new URL(a.href, window.location.href);
      if (url.pathname !== window.location.pathname) return;
      const id = url.hash.replace("#", "") || url.searchParams.get("tab") || "";
      const key = id === "milestones" ? "steps" : id === "project-content" ? url.searchParams.get("tab") || "" : id;
      if (!ids.includes(key as StationKind)) return;
      e.preventDefault();
      goTo(key);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [ids, goTo]);

  /* the 3D world loads after the content, so every chapter is readable even if WebGL is unavailable */
  const stageKey = JSON.stringify([ids, stage.modelUrl, stage.pinCount, stage.stepCount]);
  useEffect(() => {
    let disposed = false;
    let handle: { dispose: () => void } | null = null;
    const root = rootRef.current;
    import("./stage")
      .then(({ createStage }) => {
        if (disposed || !canvasRef.current) return;
        try {
          handle = createStage(canvasRef.current, { ...stage, kinds: ids }, state.current, {
            reduced: reducedRef.current,
            onDark: (d) => { if (root) root.dataset.ink = d > 0.5 ? "light" : "dark"; },
          });
        } catch {
          setStageOff(true);
        }
      })
      .catch(() => setStageOff(true));
    return () => { disposed = true; handle?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageKey]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSheetOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const total = chapters.length;

  return (
    <JourneyContext.Provider value={{ goTo }}>
      <div ref={rootRef} className="journey relative" data-ink="dark" data-stage={stageOff ? "off" : "on"}>
        <div ref={canvasWrapRef} aria-hidden className="journey-canvas fixed inset-0 z-0 pointer-events-none">
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>

        {/* positioned without a z-index: paints above the canvas yet leaves the content in the page stacking
            context, so overlays inside chapters (diagram zoom, viewer fullscreen) still cover the navbar */}
        <div className="relative">
          {chapters.map((c, i) => {
            const right = sides[i] === -1;
            return (
              <section
                key={c.id}
                id={c.id}
                ref={(el) => { sectionRefs.current[i] = el; }}
                tabIndex={-1}
                aria-labelledby={`${c.id}-title`}
                className="outline-none"
              >
                {c.beat ? (
                  c.beat
                ) : (
                  <div className="journey-beat min-h-[78svh] lg:min-h-[80vh] flex items-end lg:items-center pt-28 pb-10 lg:pb-16">
                    <div className={`max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 lg:pr-24 flex ${right ? "lg:justify-end" : ""}`}>
                      <div className="journey-ink max-w-md lg:max-w-[440px]">
                        <div className="flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.22em]">
                          <span className="text-brand-500">{nn(i)}</span>
                          <span className="h-px w-8 bg-current opacity-30" />
                          <span className="opacity-70">{c.eyebrow ?? c.label}</span>
                        </div>
                        <h2 id={`${c.id}-title`} className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.04]">
                          {c.title ?? c.label}
                        </h2>
                        {c.lede && <p className="mt-4 text-base sm:text-lg leading-relaxed opacity-80">{c.lede}</p>}
                      </div>
                    </div>
                  </div>
                )}

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:pr-24 pb-20 lg:pb-28">
                  <div
                    ref={(el) => { bodyRefs.current[i] = el; }}
                    className={c.layout === "wide" ? "" : `lg:w-[62%] ${right ? "lg:ml-auto" : ""}`}
                  >
                    <div className="journey-sheet rounded-[2rem] border border-[#E8E2D9] p-4 sm:p-6 lg:p-8 shadow-lift">
                      {c.children}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* compact chapter index: a slim rail on desktop, a single pill on phones */}
        <nav aria-label="Project chapters" className="hidden lg:block fixed right-5 top-1/2 -translate-y-1/2 z-40">
          <div className="flex flex-col items-center gap-2 py-3 px-1.5 rounded-full bg-white/85 border border-[#E8E2D9] shadow-subtle">
            <span className="text-[10px] font-extrabold text-brand-600 tabular-nums" aria-hidden>{nn(active)}</span>
            <ol className="relative flex flex-col">
              <span aria-hidden className="absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-[#E8E2D9]" />
              <span
                aria-hidden
                className="absolute left-1/2 top-4 w-px -translate-x-1/2 bg-brand-400 transition-[height] duration-500"
                style={{ height: `calc((100% - 2rem) * ${total > 1 ? active / (total - 1) : 0})` }}
              />
              {chapters.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => goTo(c.id)}
                    aria-current={active === i ? "step" : undefined}
                    aria-label={`${nn(i)} ${c.label}${c.badge ? ` (${c.badge})` : ""}`}
                    className="group relative flex items-center justify-center w-8 h-8 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  >
                    <span
                      className={`relative block rounded-full transition-all duration-300 ${
                        active === i ? "w-3 h-3 bg-brand-500 ring-4 ring-brand-100" : i < active ? "w-2 h-2 bg-brand-300" : "w-2 h-2 bg-slate-300 group-hover:bg-brand-400"
                      }`}
                    />
                    <span className="pointer-events-none absolute right-11 whitespace-nowrap rounded-full bg-white border border-[#E8E2D9] shadow-subtle px-3 py-1.5 text-xs font-bold text-slate-800 opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0">
                      <span className="text-brand-600 mr-1.5">{nn(i)}</span>
                      {c.label}
                      {c.badge && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700">{c.badge}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="lg:hidden fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto relative">
            {sheetOpen && (
              <ol className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-[min(18rem,calc(100vw-2rem))] max-h-[60vh] overflow-auto rounded-3xl bg-white border border-[#E8E2D9] shadow-lift p-2">
                {chapters.map((c, i) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => goTo(c.id)}
                      aria-current={active === i ? "step" : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left text-sm font-bold ${active === i ? "bg-brand-500 text-white" : "text-slate-700 hover:bg-brand-50"}`}
                    >
                      <span className={`text-xs tabular-nums ${active === i ? "text-brand-100" : "text-brand-600"}`}>{nn(i)}</span>
                      <span className="flex-1">{c.label}</span>
                      {c.badge && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active === i ? "bg-white text-brand-700" : "bg-brand-100 text-brand-700"}`}>{c.badge}</span>}
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <button
              type="button"
              onClick={() => setSheetOpen((o) => !o)}
              aria-expanded={sheetOpen}
              aria-label="Jump to a chapter"
              className="flex items-center gap-2.5 pl-4 pr-3 h-11 rounded-full bg-white/95 border border-[#E8E2D9] shadow-lift text-sm font-bold text-slate-800"
            >
              <span className="text-brand-600 tabular-nums text-xs">{nn(active)} / {nn(total - 1)}</span>
              <span className="max-w-[11rem] truncate">{chapters[active]?.label}</span>
              <ChevronUp className={`w-4 h-4 text-slate-500 transition-transform ${sheetOpen ? "" : "rotate-180"}`} />
            </button>
          </div>
        </div>
      </div>
    </JourneyContext.Provider>
  );
}
