"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, Eye, LifeBuoy, ShieldAlert, Sparkles, Square, CheckSquare, Wrench, Plug, Undo2 } from "lucide-react";
import type { Project } from "@/data/projects";
import { WorkshopViewer } from "./WorkshopViewer";
import { useKit } from "./kit";
import { wireCss } from "./wiringStyle";
import { PartDetail, partOf, rememberStep, stepKey, takePendingStep, usePartThumbs } from "./PartsExplorer";

type PartId = string;

/* The build steps, every one kept in its original order with all of its content (stage, time,
   title, what to do, how to do it, what you should see, checkpoints, tip, and the existing "Mark as Done"),
   plus: the parts and tools it uses (tap one for its details), numbered instructions, the wires it makes, a
   common mistake, a safety note, what to check if it doesn't work, a checklist, and a 3D view of the robot as
   it stands at that step. Nothing is marked done automatically. */

type Step = NonNullable<Project["steps"]>[number];

// split the step's own "how" text into numbered instructions, without rewording it
const instructions = (s: Step) => (s.howToDo || s.description).split(/(?<=[.!?])\s+(?=[A-Z])/).map((x) => x.trim()).filter(Boolean);

export function StepGuide({ project, completedSteps, onToggleStep }: { project: Project; completedSteps: Record<number, boolean>; onToggleStep: (n: number) => void }) {
  const kit = useKit();
  const { connections: CONNECTIONS, stepHelp: STEP_HELP, stepVisuals: STEP_VISUALS } = kit;
  const partById = (id: PartId) => partOf(kit, id);
  const CHECKS_KEY = `${kit.id}:step-checks`, STEP_KEY = stepKey(kit);
  const steps = project.steps ?? [];
  const [current, setCurrent] = useState(steps[0]?.stepNumber ?? 1);
  const [resume, setResume] = useState<number | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [openPart, setOpenPart] = useState<{ step: number; id: PartId } | null>(null);
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const viewerRef = useRef<HTMLDivElement>(null);
  const followScroll = useRef(true);
  const thumbs = usePartThumbs();
  const total = steps.length;
  const idx = Math.max(0, steps.findIndex((s) => s.stepNumber === current));
  const doneCount = steps.filter((s) => completedSteps[s.stepNumber]).length;

  // during a programmatic scroll the 3D view keeps the chosen step; it follows the reader again once the target
  // has arrived near the top of the screen, as soon as the reader scrolls themselves, or after a safety timeout
  // (resuming on a timer alone would latch onto a card passing by during a long smooth scroll)
  const resumeFollow = (target: () => HTMLElement | null) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearInterval(poll); window.clearTimeout(cap);
      ["wheel", "touchstart", "keydown"].forEach((ev) => window.removeEventListener(ev, finish));
      followScroll.current = true;
    };
    const poll = window.setInterval(() => { const r = target()?.getBoundingClientRect(); if (!r || (r.top > -80 && r.top < 260)) window.setTimeout(finish, 250); }, 150);
    const cap = window.setTimeout(finish, 8000);
    ["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, finish, { passive: true }));
  };
  const go = (n: number, scroll = true) => {
    const s = steps.find((x) => x.stepNumber === n);
    if (!s) return;
    setCurrent(n);
    setResume(null);
    if (scroll) {
      followScroll.current = false;
      cardRefs.current[n]?.scrollIntoView({ behavior: "smooth", block: "start" });
      resumeFollow(() => cardRefs.current[n]);
    }
  };

  // this session's checklist ticks, and the step the reader was on (offered as "resume", never auto-scrolled)
  useEffect(() => {
    try {
      const c = JSON.parse(sessionStorage.getItem(CHECKS_KEY) || "{}");
      if (c && typeof c === "object") setChecks(c);
      const n = Number(sessionStorage.getItem(STEP_KEY));
      if (n > 1 && steps.some((s) => s.stepNumber === n)) setResume(n);
    } catch { /* storage unavailable */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggleCheck = (k: string) => setChecks((c) => {
    const next = { ...c, [k]: !c[k] };
    try { sessionStorage.setItem(CHECKS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  });
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } rememberStep(kit, current); }, [current]);

  // the 3D view follows the step being read
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      if (!followScroll.current) return;
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setCurrent(Number((vis.target as HTMLElement).dataset.step));
    }, { rootMargin: "-35% 0px -55% 0px" });
    Object.values(cardRefs.current).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [total]);

  // "used in step N" from a part's details
  useEffect(() => {
    const n = takePendingStep();
    if (n) window.setTimeout(() => go(n), 350);
    const on = (e: Event) => go((e as CustomEvent<number>).detail);
    window.addEventListener("lf:show-step", on);
    return () => window.removeEventListener("lf:show-step", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = steps[idx];
  const sv = s ? STEP_VISUALS[s.stepNumber] : undefined;
  const showPart = (step: number, id: PartId) => {
    setOpenPart({ step, id });
    window.setTimeout(() => document.getElementById(`lf-step-part-${step}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
  };
  // show a step in the 3D view; only scroll to the viewer when it isn't already on screen (it's sticky on wide screens)
  const showIn3D = (n: number) => {
    go(n, false);
    const r = viewerRef.current?.getBoundingClientRect();
    if (!r || (r.top >= 0 && r.top < window.innerHeight / 2)) return;
    followScroll.current = false;
    viewerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    resumeFollow(() => viewerRef.current);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* the step viewer: sticky beside the steps on wide screens */}
      <div className="lg:col-span-5 lg:order-2">
        <div ref={viewerRef} className="lg:sticky lg:top-24 space-y-3 scroll-mt-24">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-600">Step {s?.stepNumber} of {total} · {doneCount} done</div>
              <div key={s?.stepNumber} className="text-sm font-extrabold text-slate-900 truncate lf-rise">{s?.title}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => go(steps[idx - 1]?.stepNumber ?? 0)} disabled={idx === 0} aria-label="Previous step" className="inline-flex items-center gap-1 h-9 px-3 rounded-full border border-[#E8E2D9] bg-white text-xs font-bold text-slate-700 disabled:opacity-40 hover:border-brand-300"><ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Previous</span></button>
              <button type="button" onClick={() => go(steps[idx + 1]?.stepNumber ?? 0)} disabled={idx >= total - 1} aria-label="Next step" className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-brand-500 text-white text-xs font-bold disabled:opacity-40 hover:bg-brand-600"><span className="hidden sm:inline">Next</span><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          {resume && resume !== current && (
            <button type="button" onClick={() => go(resume)} className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-full border border-brand-200 bg-brand-50 text-xs font-bold text-brand-800 hover:bg-brand-100">
              <Undo2 className="w-3.5 h-3.5" /> Resume where you left off: step {resume}
            </button>
          )}
          {/* a little more spread than the full-size viewers, so the exploded layout reads in this smaller frame */}
          <WorkshopViewer mode="step" step={s?.stepNumber ?? 1} height={380} spread={kit.stepSpread} onSelectPart={(id) => { if (id && s) showPart(s.stepNumber, id); }} ariaLabel={`3D view of step ${s?.stepNumber}: ${s?.title}`} />
          {sv?.connections && (
            <ul className="rounded-2xl border border-[#E8E2D9] bg-white p-3 space-y-1 text-xs">
              {sv.connections.map((cid) => {
                const c = CONNECTIONS.find((x) => x.id === cid)!;
                return (
                  <li key={cid} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0" style={{ background: wireCss(c.color) }} />
                    <span className="text-slate-700"><b>{c.from.name}</b> → <b>{c.to.name}</b></span>
                  </li>
                );
              })}
            </ul>
          )}
          {/* every step: done ones green, the current one ringed */}
          <ol className="flex gap-1" aria-label={`Progress: ${doneCount} of ${total} steps done, now on step ${s?.stepNumber}`}>
            {steps.map((x) => (
              <li key={x.stepNumber} className="flex-1">
                <button type="button" onClick={() => go(x.stepNumber)} title={`Step ${x.stepNumber}: ${x.title}${completedSteps[x.stepNumber] ? " (done)" : ""}`}
                  aria-label={`Go to step ${x.stepNumber}`} aria-current={x.stepNumber === current ? "step" : undefined}
                  className={`block w-full h-2 rounded-full transition-colors ${completedSteps[x.stepNumber] ? "bg-emerald-500" : x.stepNumber === current ? "bg-brand-500" : "bg-brand-100 hover:bg-brand-200"} ${x.stepNumber === current ? "ring-2 ring-offset-1 ring-brand-300" : ""}`} />
              </li>
            ))}
          </ol>
          <div className="flex justify-between text-[10px] font-semibold text-slate-400"><span>Green = marked as done</span><span>Tap a bar to jump to a step</span></div>
        </div>
      </div>

      {/* the steps, in their original order */}
      <div className="lg:col-span-7 lg:order-1 space-y-6">
        {steps.map((step, si) => {
          const isDone = !!completedSteps[step.stepNumber];
          const v = STEP_VISUALS[step.stepNumber];
          const help = STEP_HELP[step.stepNumber];
          const isCurrent = step.stepNumber === current;
          const ticked = step.checkpoints.filter((_, i) => checks[`${step.stepNumber}-${i}`]).length;
          const partOpen = openPart?.step === step.stepNumber ? openPart.id : null;
          return (
            <div
              key={step.stepNumber}
              id={`lf-step-${step.stepNumber}`}
              data-step={step.stepNumber}
              ref={(el) => { cardRefs.current[step.stepNumber] = el; }}
              className={`scroll-mt-24 bg-white rounded-3xl p-6 sm:p-8 border transition-all duration-300 shadow-subtle space-y-5 ${
                isDone ? "border-emerald-300 bg-emerald-50/20" : isCurrent ? "border-brand-300" : "border-[#E8E2D9]"
              }`}
            >
              {/* Top Row: Step Badge + Title + Button */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl font-extrabold text-base flex items-center justify-center shrink-0 shadow-sm ${isDone ? "bg-emerald-600 text-white" : "bg-brand-500 text-white"}`}>
                    {step.stepNumber < 10 ? `0${step.stepNumber}` : step.stepNumber}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">{step.stage}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500 font-semibold">{step.time}</span>
                    </div>
                    <h4 className="text-xl font-extrabold text-slate-900">{step.title}</h4>
                    <p className="text-xs text-slate-500">Step {step.stepNumber} of {total}</p>
                  </div>
                </div>
                <button
                  onClick={() => onToggleStep(step.stepNumber)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-colors ${isDone ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-slate-100 text-slate-700 hover:bg-brand-100 hover:text-brand-800"}`}
                >
                  {isDone ? <Check className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-400" />}
                  <span>{isDone ? "Completed" : "Mark as Done"}</span>
                </button>
              </div>

              {/* Goal */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D9] space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Goal · what to do</div>
                <p className="text-sm text-slate-800 font-medium leading-relaxed">{step.whatToDo || step.description}</p>
                {step.description && step.description !== step.whatToDo && <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>}
              </div>

              {/* Parts & tools for this step (tap a part for its details) */}
              {v && (v.parts.length > 0 || (v.tools?.length ?? 0) > 0) && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Parts &amp; tools for this step <span className="normal-case tracking-normal font-semibold">· tap a part for details</span></div>
                  <div className="flex flex-wrap gap-2">
                    {v.parts.map((pid) => {
                      const p = partById(pid);
                      const b = project.bom?.find((x) => x.id === p.bomId);
                      const on = partOpen === pid;
                      return (
                        <button key={pid} type="button" onClick={() => (on ? setOpenPart(null) : showPart(step.stepNumber, pid))} aria-expanded={on}
                          className={`inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-2xl border text-left transition-colors ${on ? "border-brand-400 bg-brand-50" : "border-[#E8E2D9] bg-[#FBF8F3] hover:border-brand-300"}`}>
                          {thumbs[pid] ? <img src={thumbs[pid]} alt="" className="w-10 h-8 rounded-xl object-cover bg-[#F7F3EC]" /> : <span className="w-10 h-8 rounded-xl bg-[#F1ECE4]" />}
                          <span className="text-xs"><b className="text-slate-900">{p.label}</b>{b && <span className="text-slate-500"> · qty {kit.oneOfSet(pid) ? 1 : b.qty}</span>}</span>
                        </button>
                      );
                    })}
                    {v.tools?.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-[#F3ECE3] text-xs font-semibold text-slate-700"><Wrench className="w-3.5 h-3.5 text-slate-500" />{t}</span>
                    ))}
                  </div>
                  {partOpen && (
                    <div id={`lf-step-part-${step.stepNumber}`} className="rounded-3xl border border-brand-200 bg-[#FDFBF8] p-4 scroll-mt-28">
                      <PartDetail project={project} id={partOpen} thumb={thumbs[partOpen]} inGuide onBack={() => setOpenPart(null)} backLabel={`Back to step ${step.stepNumber}`} />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* How: the step's own text as numbered instructions */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D9] space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">How to do it</div>
                  <ol className="space-y-1.5">
                    {instructions(step).map((line, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-slate-800 font-medium leading-relaxed">
                        <span className="grid place-items-center w-5 h-5 mt-0.5 rounded-full bg-brand-500 text-white text-[10px] font-extrabold shrink-0">{i + 1}</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">What you should see</div>
                  <p className="text-sm text-emerald-950 font-medium leading-relaxed">{step.whatYouSee || "Check that this step is complete and firmly assembled."}</p>
                  <button type="button" onClick={() => showIn3D(step.stepNumber)}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline lg:hidden">
                    <Eye className="w-3.5 h-3.5" /> Compare with the 3D view
                  </button>
                </div>
              </div>

              {/* wires this step makes */}
              {v?.connections && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider"><Plug className="w-3.5 h-3.5" /> Connections in this step</div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                    {v.connections.map((cid) => {
                      const c = CONNECTIONS.find((x) => x.id === cid)!;
                      return (
                        <li key={cid} className="flex items-center gap-2 text-slate-700">
                          <span className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0" style={{ background: wireCss(c.color) }} />
                          <span><b>{c.from.name}</b> → <b>{c.to.name}</b> <span className="text-slate-400">({c.color})</span></span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* common mistake · safety · if it doesn't work */}
              {help && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-extrabold text-amber-900 uppercase tracking-wider text-[10px]"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Common mistake</div>
                    <p className="text-amber-950 leading-relaxed">{help.mistake}</p>
                  </div>
                  {help.safety && (
                    <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-extrabold text-rose-900 uppercase tracking-wider text-[10px]"><ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Safety</div>
                      <p className="text-rose-950 leading-relaxed">{help.safety}</p>
                    </div>
                  )}
                  {help.check && (
                    <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-extrabold text-sky-900 uppercase tracking-wider text-[10px]"><LifeBuoy className="w-3.5 h-3.5 text-sky-600" /> If it doesn&apos;t work</div>
                      <p className="text-sky-950 leading-relaxed">{help.check}</p>
                    </div>
                  )}
                  <p className="md:col-span-3 text-[10px] text-slate-400">From the guide: {help.source}</p>
                </div>
              )}

              {/* the step's own common problems: what goes wrong, why, and the fix */}
              {step.commonProblems && step.commonProblems.length > 0 && (
                <details className="group rounded-2xl border border-amber-200 bg-amber-50/40 overflow-hidden">
                  <summary className="flex items-center justify-between gap-2 px-4 py-2.5 cursor-pointer list-none text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Common problems ({step.commonProblems.length})</span>
                    <ChevronRight className="w-4 h-4 text-amber-700 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-4 pb-3 space-y-2">
                    {step.commonProblems.map((cp, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white/80 border border-amber-100 text-xs space-y-1">
                        <div className="font-semibold text-amber-950">{cp.problem}</div>
                        <div className="text-amber-900"><span className="font-semibold">Why it happens:</span> {cp.reason}</div>
                        <div className="text-amber-900"><span className="font-semibold">What to do:</span> {cp.solution}</div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Completion checklist (the step's checkpoints) — ticks are kept for this session */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Checkpoints to verify:</div>
                  <span className="text-[11px] font-bold text-slate-400">{ticked} of {step.checkpoints.length} checked</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {step.checkpoints.map((cp, i) => {
                    const k = `${step.stepNumber}-${i}`, on = !!checks[k];
                    return (
                      <button key={i} type="button" onClick={() => toggleCheck(k)} aria-pressed={on} className="flex items-start gap-2 text-left text-slate-600 hover:text-slate-900">
                        {on ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <Square className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />}
                        <span className={on ? "line-through decoration-emerald-400" : ""}>{cp}</span>
                      </button>
                    );
                  })}
                </div>
                {ticked === step.checkpoints.length && step.checkpoints.length > 0 && !isDone && (
                  <p className="text-[11px] font-semibold text-emerald-700">All checked. When you&apos;re happy with this step, use &quot;Mark as Done&quot; above.</p>
                )}
              </div>

              {step.tip && (
                <div className="p-3.5 rounded-2xl bg-brand-50/70 border border-brand-100 text-xs text-brand-800 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                  <div><strong>Helpful Tip:</strong> {step.tip}</div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button type="button" onClick={() => showIn3D(step.stepNumber)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border ${isCurrent ? "bg-brand-500 text-white border-brand-500" : "bg-white text-slate-700 border-[#E8E2D9] hover:border-brand-300"}`}>
                  <Eye className="w-3.5 h-3.5" /> {isCurrent ? "Showing in 3D" : "Show in 3D"}
                </button>
                {isDone && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Marked as done</span>}
                {si < total - 1 && (
                  <button type="button" onClick={() => go(steps[si + 1].stepNumber)} className="ml-auto inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-xs font-bold text-slate-700 bg-[#FBF8F3] border border-[#E8E2D9] hover:border-brand-300">
                    Next: step {steps[si + 1].stepNumber} <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
