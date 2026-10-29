"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Box as BoxIcon, Layers, ListChecks, X } from "lucide-react";
import type { Project } from "@/data/projects";
import { useJourney } from "@/components/journey/context";
import { WorkshopViewer } from "./WorkshopViewer";
import { PartDetail, showInPartsList, useOpenStep, usePartThumbs } from "./PartsExplorer";
import { useKit } from "./kit";

type PartId = string;

/* "Start Step-by-Step Guide": a full-window introduction before the build steps.
   1. the complete robot (slow turntable, rotate / zoom, explore parts)
   2. the same robot, exploded in place: every part moves straight out from its mounting point, labelled
   3. the existing Build Steps, with Nesto, opened at step 1
   It's the same 3D model as the rest of the workshop (one source of truth), and it can be skipped at any time. */

type Stage = 1 | 2;

export function BuildIntro({ project, open, onClose }: { project: Project; open: boolean; onClose: () => void }) {
  const kit = useKit();
  const [stage, setStage] = useState<Stage>(1);
  const [sel, setSel] = useState<PartId | null>(null);
  const [list, setList] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const thumbs = usePartThumbs();
  const openStep = useOpenStep();
  const { goTo } = useJourney();
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => setMounted(true), []);

  // reset on every open; lock the page behind (released in the same commit that closes the intro); restore focus
  useLayoutEffect(() => {
    if (!open) return;
    setStage(1); setSel(null); setList(false); setLeaving(false);
    lastFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const t = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus(), 50);
    return () => { window.clearTimeout(t); document.documentElement.style.overflow = prevOverflow; lastFocus.current?.focus?.({ preventScroll: true }); };
  }, [open]);

  // leave the intro, then do what was asked once it has faded
  const leave = useCallback((then?: () => void) => {
    setLeaving(true);
    window.setTimeout(() => { onClose(); then?.(); }, reduced ? 0 : 420);
  }, [onClose, reduced]);
  const startBuilding = useCallback(() => leave(() => openStep(1)), [leave, openStep]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); if (sel) setSel(null); else if (list) setList(false); else leave(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, sel, list, leave]);

  if (!open || !mounted) return null;

  const listed = kit.parts.filter((p) => p.labelled);
  const side = sel || list;
  const btn = "inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400";

  return createPortal(
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="lf-intro-title"
      className={`fixed inset-0 z-[90] bg-[#F7F3EC] flex flex-col transition-opacity duration-[420ms] ${leaving ? "opacity-0" : "opacity-100 lf-rise"}`}>
      {/* top bar */}
      <div className="relative z-10 flex items-start justify-between gap-3 px-4 sm:px-8 pt-4 sm:pt-6">
        <div className="min-w-0">
          <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-600">{project.title} · before you build</div>
          <h2 id="lf-intro-title" key={stage} className="mt-1 text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 lf-rise">
            {stage === 1 ? kit.intro.title : "Every part, pulled apart."}
          </h2>
          <p key={`p${stage}`} className="mt-1 text-sm sm:text-base text-slate-600 max-w-xl lf-rise">
            {stage === 1
              ? "Explore its parts before you build it. Drag to turn it around, scroll or pinch to zoom."
              : "Each part slides straight out from where it mounts. The dashed lines show the way back in. Tap any part to learn what it does."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={startBuilding} className="hidden sm:inline-flex items-center gap-1 h-9 px-3.5 rounded-full text-xs font-bold text-slate-600 hover:text-brand-700 hover:bg-white">
            Skip to step 1 <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => leave()} aria-label="Close and go back to the overview" className="grid place-items-center w-10 h-10 rounded-full bg-white border border-[#E8E2D9] text-slate-700 hover:text-brand-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* the robot, full window */}
      <div className="relative flex-1 min-h-0">
        <WorkshopViewer mode="parts" fill variant="technical" showcase={stage === 1} spread={kit.intro.spread} zoom={kit.intro.zoom} exploded={stage === 2} onExplodedChange={(v) => setStage(v ? 2 : 1)}
          selectedPart={sel} onSelectPart={(id) => { setSel(id); if (id) setList(false); }}
          ariaLabel={stage === 1 ? `The complete ${project.title}, in 3D` : `Exploded 3D view of the ${project.title}`} />

        {/* part details / parts list: a side panel on wide screens, a sheet on phones */}
        {side && (
          <aside className="absolute z-20 inset-x-2 bottom-[68px] max-h-[58%] sm:inset-x-auto sm:right-6 sm:top-4 sm:bottom-20 sm:max-h-none sm:w-[380px] overflow-y-auto rounded-3xl border border-[#E8E2D9] bg-white/95 backdrop-blur p-4 shadow-xl lf-rise" aria-live="polite">
            {sel ? (
              <PartDetail project={project} id={sel} thumb={thumbs[sel]} inGuide onBack={() => setSel(null)} backLabel={stage === 2 ? "Back to the exploded view" : `Back to the ${kit.noun}`}
                onShowBom={(bomId) => leave(() => { goTo("bom"); showInPartsList(bomId); })} />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-extrabold text-slate-900">The parts in this {kit.noun}</div>
                  <button type="button" onClick={() => setList(false)} className="text-xs font-bold text-slate-500 hover:text-brand-700">Close</button>
                </div>
                <ol className="space-y-1">
                  {listed.map((p, i) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => setSel(p.id)} className="w-full flex items-center gap-3 p-2 rounded-2xl text-left hover:bg-[#FBF8F3]">
                        <span className="grid place-items-center w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-extrabold shrink-0">{i + 1}</span>
                        {thumbs[p.id] ? <img src={thumbs[p.id]} alt="" className="w-12 h-9 rounded-lg object-cover bg-[#F7F3EC] shrink-0" /> : <span className="w-12 h-9 rounded-lg bg-[#F1ECE4] shrink-0" />}
                        <span className="text-sm font-bold text-slate-900">{p.label}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* the three stages, and what comes next */}
      <div className="relative z-10 border-t border-[#E8E2D9] bg-[#FBF8F3]/95 backdrop-blur px-3 sm:px-8 py-3 flex flex-wrap items-center gap-2 sm:gap-3">
        <ol className="hidden md:flex items-center gap-2 text-xs font-bold mr-auto" aria-label="Introduction progress">
          {[["1", `Complete ${kit.noun}`], ["2", "Exploded view"], ["3", "Build steps with Nesto"]].map(([n, t], i) => {
            const on = i + 1 === stage, done = i + 1 < stage;
            return (
              <li key={n} className="flex items-center gap-2" aria-current={on ? "step" : undefined}>
                <span className={`grid place-items-center w-6 h-6 rounded-full text-[11px] ${on ? "bg-brand-500 text-white" : done ? "bg-slate-900 text-white" : "bg-white border border-[#E8E2D9] text-slate-500"}`}>{n}</span>
                <span className={on ? "text-slate-900" : "text-slate-500"}>{t}</span>
                {i < 2 && <span className="w-6 h-px bg-[#D9D1C5]" />}
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={() => { setSel(null); setList((v) => !v); }} aria-pressed={list} className={`${btn} bg-white border border-[#E8E2D9] text-slate-800 hover:border-brand-300 mr-auto md:mr-0`}>
          <ListChecks className="w-4 h-4" /> <span className="hidden sm:inline">Explore parts</span><span className="sm:hidden">Parts</span>
        </button>
        {stage === 2 && (
          <button type="button" onClick={() => { setSel(null); setStage(1); }} className={`${btn} bg-white border border-[#E8E2D9] text-slate-800 hover:border-brand-300`}>
            <ArrowLeft className="w-4 h-4" /><BoxIcon className="w-4 h-4" /> <span className="hidden sm:inline">Assembled</span>
          </button>
        )}
        {stage === 1 ? (
          <button type="button" data-autofocus onClick={() => { setSel(null); setList(false); setStage(2); }} className={`${btn} bg-brand-500 text-white hover:bg-brand-600`}>
            <Layers className="w-4 h-4" /> See it exploded <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" data-autofocus onClick={startBuilding} className={`${btn} bg-brand-500 text-white hover:bg-brand-600`}>
            Start building: step 1 <ArrowRight className="w-4 h-4" />
          </button>
        )}
        <button type="button" onClick={startBuilding} className="sm:hidden w-full text-center text-xs font-bold text-slate-500 hover:text-brand-700 pt-1">Skip the intro and go to step 1</button>
      </div>
    </div>,
    document.body,
  );
}
