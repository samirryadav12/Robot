"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, Lightbulb, ListChecks, MapPin, Plug, Search, ShoppingCart, Undo2, Wrench, Layers } from "lucide-react";
import type { Project, BomItem } from "@/data/projects";
import { getStoreBundlesForProject, getStorePricingForProject } from "@/data/stores";
import { ProjectBomSection } from "@/components/ProjectBomSection";
import { useJourney } from "@/components/journey/context";
import { WorkshopViewer } from "./WorkshopViewer";
import { ShoppingList } from "./ShoppingList";
import { useKit } from "./kit";
import type { WorkshopKit } from "./kit";
import { wireCss } from "./wiringStyle";

type PartId = string;

/* ---------- shared bits ---------- */

export function usePartThumbs() {
  const kit = useKit();
  const [thumbs, setThumbs] = useState<Partial<Record<PartId, string>>>({});
  useEffect(() => {
    let alive = true;
    import("./thumbs").then(({ getPartThumbnails }) => getPartThumbnails(kit)).then((t) => { if (alive) setThumbs(t); }).catch(() => {});
    return () => { alive = false; };
  }, [kit]);
  return thumbs;
}

export const partOf = (kit: WorkshopKit, id: PartId) => kit.parts.find((p) => p.id === id)!;
export const stepsUsing = (kit: WorkshopKit, id: PartId) => Object.entries(kit.stepVisuals).filter(([, v]) => v.parts.includes(id)).map(([n]) => Number(n));

/* ask the build guide to show a step (it may not be on screen yet, e.g. inside another journey panel) */
export let pendingStep: number | null = null;
export function showStepInGuide(n: number) {
  pendingStep = n;
  window.dispatchEvent(new CustomEvent("lf:show-step", { detail: n }));
}
export const takePendingStep = () => { const n = pendingStep; pendingStep = null; return n; };

/* ask the Parts List chapter to show a part (it may mount later, inside the Parts List panel) */
let pendingBom: string | null = null;
export function showInPartsList(bomId: string) {
  pendingBom = bomId;
  window.dispatchEvent(new CustomEvent("lf:show-bom", { detail: bomId }));
}

/* the step the reader was last on in the build guide (kept for this browser session, per robot) */
export const stepKey = (kit: WorkshopKit) => `${kit.id}:current-step`;
export function rememberStep(kit: WorkshopKit, n: number) {
  try { sessionStorage.setItem(stepKey(kit), String(n)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent("lf:step-changed", { detail: n }));
}
export function useLastStep() {
  const kit = useKit();
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    try { const v = Number(sessionStorage.getItem(stepKey(kit))); if (v) setN(v); } catch { /* storage unavailable */ }
    const on = (e: Event) => setN((e as CustomEvent<number>).detail);
    window.addEventListener("lf:step-changed", on);
    return () => window.removeEventListener("lf:step-changed", on);
  }, [kit]);
  return n;
}

/* open the build guide at a step: works in the panel journey (opens the Build Steps panel) and on the scroll page */
export function useOpenStep() {
  const { goTo } = useJourney();
  return useCallback((n: number) => {
    // the guide is already on the page (scroll layout): go straight to the step card
    if (document.getElementById(`lf-step-${n}`)) { showStepInGuide(n); return; }
    // otherwise (panel journey) open the Build Steps panel; the guide picks up the step when it mounts
    pendingStep = n;
    goTo("steps");
  }, [goTo]);
}

const bomOf = (kit: WorkshopKit, project: Project, id: PartId) => project.bom?.find((b) => b.id === partOf(kit, id).bomId);

const H = ({ children }: { children: React.ReactNode }) => <dt className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{children}</dt>;

/* ---------- the detail panel for one part ---------- */

export function PartDetail({ project, id, thumb, onBack, backLabel, onShowBom, onView3D, inGuide = false }: {
  project: Project; id: PartId; thumb?: string; onBack?: () => void; backLabel?: string;
  onShowBom?: (bomId: string) => void; onView3D?: () => void; inGuide?: boolean;
}) {
  const kit = useKit();
  const info = partOf(kit, id);
  const guide = kit.partGuide[id];
  const b = bomOf(kit, project, id);
  const pricing = getStorePricingForProject(project).find((r) => r.sku.toLowerCase() === info.bomId);
  const stores = getStoreBundlesForProject(project);
  const conns = kit.connections.filter((c) => c.from.part === id || c.to.part === id || (id === kit.wiresPart && c.jumper));
  const used = stepsUsing(kit, id);
  const openStep = useOpenStep();
  const lastStep = useLastStep();
  const oneOfPair = kit.oneOfSet(id);
  return (
    <div key={id} className="space-y-4 lf-rise">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {onBack && (
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-brand-700">
            <ArrowLeft className="w-3.5 h-3.5" /> {backLabel ?? `Back to full ${kit.noun}`}
          </button>
        )}
        {!inGuide && lastStep && (
          <button type="button" onClick={() => openStep(lastStep)} className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:underline">
            <Undo2 className="w-3.5 h-3.5" /> Back to build step {lastStep}
          </button>
        )}
      </div>

      {/* 1–2: name and picture */}
      <div className="flex items-start gap-3">
        <figure className="shrink-0 w-28">
          {thumb ? <img src={thumb} alt={`3D render of the ${info.label}`} className="w-28 h-[84px] rounded-2xl border border-[#E8E2D9] bg-[#F7F3EC] object-cover" /> : <div className="w-28 h-20 rounded-2xl bg-[#F1ECE4]" />}
          <figcaption className="mt-1 text-[10px] font-semibold text-slate-400 leading-tight">3D render, illustrative. Buy by the specification, not the picture.</figcaption>
        </figure>
        <div className="min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-600">{b?.category ?? "Part"}</div>
          <h4 className="text-lg font-extrabold text-slate-900 leading-tight">{b?.name ?? info.label}</h4>
          {b && info.label !== b.name && <div className="text-xs font-semibold text-slate-500">{info.label}</div>}
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
            {b && <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white">Qty {b.qty}{oneOfPair ? " in the kit (this is one)" : ""}</span>}
            {b && <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200" title="The guide's estimate for the whole line (all units)">{b.priceEst} est. for {b.qty > 1 ? `all ${b.qty}` : "1"}</span>}
            {!info.onRobot && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">Not mounted on the {kit.noun}</span>}
          </div>
        </div>
      </div>

      {onView3D && (
        <button type="button" onClick={onView3D} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500 text-white text-xs font-bold hover:bg-brand-600">
          <Layers className="w-3.5 h-3.5" /> View in 3D
        </button>
      )}

      <dl className="space-y-3 text-sm">
        {b && <div><H>What it is</H><dd className="text-slate-800">{b.whatIsIt}</dd></div>}
        {b && <div><H>What it does in this {kit.noun}</H><dd className="text-slate-800">{b.whyUsed}</dd></div>}
        {guide && <div><H>Why the {kit.noun} needs it</H><dd className="text-slate-800">{guide.need}</dd></div>}
        <div>
          <H>Where it is</H>
          <dd className="flex gap-2 text-slate-700 text-xs leading-relaxed mt-0.5"><MapPin className="w-4 h-4 text-brand-500 shrink-0" />{info.where}</dd>
        </div>
        <div>
          <H>How it connects</H>
          <dd className="mt-1">
            {conns.length > 0 ? (
              <ul className="space-y-1 text-xs">
                {conns.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0" style={{ background: wireCss(c.color) }} />
                    <span className="text-slate-700"><b>{c.from.name}</b> → <b>{c.to.name}</b> <span className="text-slate-400">· {c.color}</span></span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex gap-2 text-xs text-slate-600"><Plug className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />{info.onRobot ? "No electrical connections. It is held on mechanically (see where it is above)." : kit.offRobotNote(id)}</p>
            )}
          </dd>
        </div>
        {b && (
          <div>
            <H>Specification to match</H>
            <dd className="text-slate-700 font-mono text-xs leading-relaxed">{b.spec}</dd>
            <dd className="text-xs text-slate-500 mt-0.5">Quantity for this build: <b className="text-slate-800">{b.qty}</b></dd>
          </div>
        )}
      </dl>

      {guide && (
        <div className="rounded-2xl bg-brand-50/70 border border-brand-100 p-3 text-xs text-brand-900 flex gap-2">
          <Lightbulb className="w-4 h-4 text-brand-500 shrink-0" />
          <div><b>Beginner tip:</b> {guide.tip} <span className="text-brand-700/70">({guide.tipSource})</span></div>
        </div>
      )}

      {b?.alternative && (
        <div className="text-xs text-slate-600 rounded-2xl border border-amber-200/70 bg-amber-50/50 p-3">
          <span className="font-extrabold text-slate-800">Optional substitute: {b.alternative.name}.</span> {b.alternative.whyItWorks}
        </div>
      )}

      {used.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <ListChecks className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-700">Used in build steps</span>
          {used.map((n) => (
            <button key={n} type="button" onClick={() => openStep(n)} className="px-2 py-0.5 rounded-full bg-white border border-[#E8E2D9] font-bold text-slate-700 hover:border-brand-300 hover:text-brand-700" aria-label={`Open build step ${n}`}>{n}</button>
          ))}
        </div>
      )}

      {b && (
        <div className="rounded-2xl border border-[#E8E2D9] bg-[#FBF8F3] p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500"><ShoppingCart className="w-3.5 h-3.5" /> Buying</div>
          <div className="text-xs text-slate-700">Search for <b>{b.name}</b>. Estimated <b>{b.priceEst}</b> (INR) for {b.qty > 1 ? `all ${b.qty}` : "one"}: an approximate figure from this guide, not a store quote.</div>
          <div className="flex flex-wrap gap-1.5">
            {stores.map((s) => {
              const url = pricing?.[s.id as "robu" | "quartz" | "robocraze" | "zbotic"]?.url;
              return url ? (
                <a key={s.id} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E8E2D9] text-[11px] font-bold text-slate-700 hover:border-brand-300 hover:text-brand-700">
                  <Search className="w-3 h-3" /> Search {s.name} <ExternalLink className="w-3 h-3" />
                </a>
              ) : null;
            })}
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">These links open each store&apos;s search results, not a specific product. Check that the listing matches the specification above.</p>
          {onShowBom && (
            <button type="button" onClick={() => onShowBom(info.bomId)} className="text-xs font-bold text-brand-700 hover:underline">Show it in the shopping list ↓</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- the explorer: 3D + part list + detail ---------- */

export function PartsExplorer({ project, selected, onSelect, onShowBom, height = 540, title = "Explore the parts" }: {
  project: Project; selected?: PartId | null; onSelect?: (id: PartId | null) => void; onShowBom?: (bomId: string) => void; height?: number; title?: string;
}) {
  const [own, setOwn] = useState<PartId | null>(null);
  const sel = selected !== undefined ? selected : own;
  const set = useCallback((id: PartId | null) => { if (onSelect) onSelect(id); else setOwn(id); }, [onSelect]);
  const kit = useKit();
  const thumbs = usePartThumbs();
  const listed = kit.parts.filter((p) => p.labelled || !p.onRobot);
  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600">Tap any part, in 3D or in the list, to see what it is, where it goes and how to buy it.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <WorkshopViewer mode="parts" selectedPart={sel} onSelectPart={set} height={height} ariaLabel={`Interactive 3D model of the ${project.title}`} />
        </div>
        <aside className="lg:col-span-4 rounded-[1.75rem] border border-[#E8E2D9] bg-white p-4 max-h-[640px] overflow-y-auto" aria-live="polite">
          {sel ? (
            <PartDetail project={project} id={sel} thumb={thumbs[sel]} onBack={() => set(null)} onShowBom={onShowBom} />
          ) : (
            <ol className="space-y-1">
              {listed.map((p, i) => {
                const b = bomOf(kit, project, p.id);
                return (
                  <li key={p.id}>
                    <button type="button" onClick={() => set(p.id)} className="w-full flex items-center gap-3 p-2 rounded-2xl text-left hover:bg-[#FBF8F3] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
                      <span className="grid place-items-center w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-extrabold shrink-0">{p.labelled ? i + 1 : "–"}</span>
                      {thumbs[p.id] ? <img src={thumbs[p.id]} alt="" className="w-12 h-9 rounded-lg object-cover bg-[#F7F3EC] shrink-0" /> : <span className="w-12 h-9 rounded-lg bg-[#F1ECE4] shrink-0 grid place-items-center">{!p.onRobot && <Wrench className="w-3.5 h-3.5 text-slate-400" />}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-900 truncate">{p.label}</span>
                        <span className="block text-[11px] text-slate-500 truncate">{b ? `Qty ${b.qty} · ${b.priceEst} est.` : ""}{!p.onRobot ? ` · not on the ${kit.noun}` : ""}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </aside>
      </div>
    </section>
  );
}

/* ---------- the Parts List chapter: explorer + shopping list + the existing BOM cards, all linked ---------- */

export function WorkshopPartsChapter({ project }: { project: Project }) {
  const kit = useKit();
  const partForBom = kit.partForBom;
  const [sel, setSel] = useState<PartId | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const explorerRef = useRef<HTMLDivElement>(null);
  const thumbs = usePartThumbs();
  const thumbFor = useMemo(() => (bomId: string) => { const p = partForBom(bomId); return p ? thumbs[p.id] : undefined; }, [thumbs, partForBom]);
  const showBom = (bomId: string) => {
    setFlash(bomId);
    document.getElementById(`lf-buy-${bomId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setFlash((f) => (f === bomId ? null : f)), 2400);
  };
  const locate = (bomId: string) => {
    const p = partForBom(bomId);
    if (!p) return;
    setSel(p.id);
    explorerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  // "See it in the Parts List" from the build intro: select the part and bring its shopping-list line into view
  useEffect(() => {
    const show = (bomId: string) => { pendingBom = null; const p = partForBom(bomId); if (p) setSel(p.id); window.setTimeout(() => showBom(bomId), 400); };
    if (pendingBom) show(pendingBom);
    const on = (e: Event) => show((e as CustomEvent<string>).detail);
    window.addEventListener("lf:show-bom", on);
    return () => window.removeEventListener("lf:show-bom", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="space-y-10">
      <div ref={explorerRef} className="scroll-mt-24">
        <PartsExplorer project={project} selected={sel} onSelect={setSel} onShowBom={showBom} title="Find each part on the robot" />
      </div>
      <ShoppingList project={project} thumbFor={thumbFor} onLocate={locate} highlightId={flash ?? (sel ? partOf(kit, sel).bomId : undefined)} />
      <ProjectBomSection items={project.bom || []} projectTitle={project.title} projectSlug={project.slug} onLocate={locate} highlightId={flash ?? (sel ? partOf(kit, sel).bomId : undefined)} thumbFor={thumbFor} />
    </div>
  );
}

export const LineFollowerPartsChapter = WorkshopPartsChapter;

export type { BomItem };
