"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Layers, RotateCcw, Search, ShoppingCart, Wrench } from "lucide-react";
import type { Project } from "@/data/projects";
import { getStoreBundlesForProject, getStorePricingForProject } from "@/data/stores";
import { PartDetail } from "./PartsExplorer";
import { useKit } from "./kit";

/* The shopping list: every BOM line with quantity, an editable unit estimate, subtotal and total,
   store search links, "View in 3D" and "View details". Prices start from the guide's own estimates: each BOM
   priceEst is the estimate for the whole line (the existing Parts List adds them up that way), so the starting
   unit price is that figure ÷ quantity. Edited prices are only kept in this browser. */

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const lineEstimate = (s: string) => { const n = parseInt(s.replace(/[^0-9]/g, ""), 10); return isNaN(n) ? 0 : n; };

type Tab = "required" | "optional" | "tools";

export function ShoppingList({ project, thumbFor, onLocate, highlightId }: {
  project: Project; thumbFor: (bomId: string) => string | undefined; onLocate: (bomId: string) => void; highlightId?: string;
}) {
  const kit = useKit();
  const { tools: TOOLS, partForBom } = kit;
  const PRICE_KEY = `${kit.id}:unit-prices`;
  const items = useMemo(() => project.bom ?? [], [project.bom]);
  const defaults = useMemo(() => Object.fromEntries(items.map((b) => [b.id, lineEstimate(b.priceEst) / Math.max(b.qty, 1)])), [items]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<Tab>("required");
  const [open, setOpen] = useState<string | null>(null);
  const pricing = useMemo(() => getStorePricingForProject(project), [project]);
  const stores = useMemo(() => getStoreBundlesForProject(project), [project]);

  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem(PRICE_KEY) || "{}"); if (v && typeof v === "object") setPrices(v); } catch { /* storage unavailable */ }
  }, [PRICE_KEY]);
  const save = (next: Record<string, number>) => {
    setPrices(next);
    try { localStorage.setItem(PRICE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };
  const unit = (id: string) => prices[id] ?? defaults[id] ?? 0;
  const edited = Object.keys(prices).length > 0;
  const total = items.reduce((s, b) => s + unit(b.id) * b.qty, 0);
  const alternatives = items.filter((b) => b.alternative);

  // a part chosen elsewhere (3D, explorer) opens its row here
  useEffect(() => { if (highlightId) { setTab("required"); } }, [highlightId]);

  const tabBtn = (t: Tab, label: string, n: number) => (
    <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
      className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${tab === t ? "bg-slate-900 text-white" : "bg-white border border-[#E8E2D9] text-slate-600 hover:text-slate-900"}`}>
      {label} <span className={`ml-1 text-[10px] ${tab === t ? "text-slate-300" : "text-slate-400"}`}>{n}</span>
    </button>
  );

  return (
    <section className="space-y-4" aria-label="Shopping list">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-100 text-brand-800">Shopping list</span>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">What to buy</h3>
          <p className="text-sm text-slate-600 max-w-2xl">Everything you need for this build, with quantities and an estimated cost. Prices are approximate, in Indian rupees. Change a unit price to match a quote you found and the total updates.</p>
        </div>
        <div className="rounded-3xl border border-[#E8E2D9] bg-white px-5 py-3 text-right shrink-0">
          <div className="text-[11px] font-bold text-slate-500">Estimated total ({items.length} lines)</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{rupees(total)}</div>
          <div className="text-[10px] text-slate-400">{edited ? "Includes your edited prices" : "From the guide's estimates"} · approximate</div>
          {edited && (
            <button type="button" onClick={() => save({})} className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline"><RotateCcw className="w-3 h-3" /> Reset to the guide&apos;s estimates</button>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Shopping list sections">
        {tabBtn("required", "Required", items.length)}
        {tabBtn("optional", "Optional substitutes", alternatives.length)}
        {tabBtn("tools", "Tools", TOOLS.length)}
      </div>

      {tab === "required" && (
        <div className="rounded-3xl border border-[#E8E2D9] bg-white overflow-hidden">
          <div className="hidden md:grid grid-cols-[64px_1fr_56px_110px_88px_auto] gap-3 px-4 py-2.5 bg-[#FAF7F2] border-b border-[#E8E2D9] text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            <span /> <span>Component</span> <span className="text-center">Qty</span> <span>Unit est. (₹)</span> <span className="text-right">Subtotal</span> <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-[#EFE9E0]">
            {items.map((b) => {
              const p = partForBom(b.id);
              const isOpen = open === b.id;
              const urls = pricing.find((r) => r.sku.toLowerCase() === b.id);
              return (
                <li key={b.id} id={`lf-buy-${b.id}`} className={`scroll-mt-28 transition-colors ${highlightId === b.id ? "bg-brand-50/70" : ""}`}>
                  <div className="grid grid-cols-[56px_1fr] md:grid-cols-[64px_1fr_56px_110px_88px_auto] gap-x-3 gap-y-2 px-4 py-3 items-center">
                    {thumbFor(b.id) ? <img src={thumbFor(b.id)} alt="" className="w-14 md:w-16 h-11 md:h-12 rounded-xl object-cover bg-[#F7F3EC] border border-[#E8E2D9]" /> : <span className="w-14 h-11 rounded-xl bg-[#F1ECE4]" />}
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 leading-tight">{b.name}</div>
                      <div className="text-[11px] font-mono text-slate-500 leading-snug line-clamp-2">{b.spec}</div>
                      <div className="text-xs text-slate-600 leading-snug mt-0.5 line-clamp-2">{b.whyUsed}</div>
                    </div>
                    <div className="col-start-2 md:col-start-auto flex md:block items-center gap-3 text-xs md:text-center">
                      <span className="md:hidden text-slate-500 font-semibold">Qty</span>
                      <span className="font-extrabold text-slate-900">{b.qty}</span>
                    </div>
                    <label className="col-start-2 md:col-start-auto flex items-center gap-2 text-xs">
                      <span className="md:hidden text-slate-500 font-semibold">Unit est. ₹</span>
                      <input type="number" inputMode="numeric" min={0} step={1} value={Math.round(unit(b.id))} aria-label={`Estimated unit price in rupees for ${b.name}`}
                        onChange={(e) => { const v = Math.max(0, Number(e.target.value) || 0); save({ ...prices, [b.id]: v }); }}
                        className="w-24 px-2.5 py-1.5 rounded-xl border border-[#E8E2D9] bg-[#FBF8F3] text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:border-brand-400" />
                    </label>
                    <div className="col-start-2 md:col-start-auto text-xs md:text-right">
                      <span className="md:hidden text-slate-500 font-semibold mr-2">Subtotal</span>
                      <span className="text-sm font-extrabold text-slate-900 tabular-nums">{rupees(unit(b.id) * b.qty)}</span>
                    </div>
                    <div className="col-start-2 md:col-start-auto flex flex-wrap md:justify-end gap-1.5">
                      {p?.onRobot && (
                        <button type="button" onClick={() => onLocate(b.id)} className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-[#FBF8F3] border border-[#E8E2D9] text-[11px] font-bold text-slate-700 hover:border-brand-300 hover:text-brand-700"><Layers className="w-3.5 h-3.5" /> View in 3D</button>
                      )}
                      <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : b.id)} className={`inline-flex items-center gap-1 h-8 px-3 rounded-full text-[11px] font-bold ${isOpen ? "bg-slate-900 text-white" : "bg-white border border-[#E8E2D9] text-slate-700 hover:border-brand-300"}`}>
                        View details <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                  </div>
                  <div className="px-4 pb-3 -mt-1 flex flex-wrap items-center gap-1.5 md:pl-[92px]">
                    <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
                    {stores.map((s) => {
                      const url = urls?.[s.id as "robu" | "quartz" | "robocraze" | "zbotic"]?.url;
                      return url ? (
                        <a key={s.id} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#E8E2D9] text-[10px] font-bold text-slate-600 hover:border-brand-300 hover:text-brand-700">
                          <Search className="w-3 h-3" /> {s.name} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : null;
                    })}
                    <span className="text-[10px] text-slate-400">store searches, so check the listing matches the spec</span>
                  </div>
                  {isOpen && p && (
                    <div className="mx-4 mb-4 rounded-3xl border border-[#E8E2D9] bg-[#FDFBF8] p-4">
                      <PartDetail project={project} id={p.id} thumb={thumbFor(b.id)} onView3D={p.onRobot ? () => onLocate(b.id) : undefined} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="px-4 py-3 bg-[#FAF7F2] border-t border-[#E8E2D9] flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">Starting unit prices are the guide&apos;s line estimates divided by quantity. Edits are saved only in this browser.</span>
            <span className="font-extrabold text-slate-900">Total {rupees(total)} <span className="font-semibold text-slate-400">approx.</span></span>
          </div>
        </div>
      )}

      {tab === "optional" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Not needed if you buy the required parts. These are compatible swaps the guide suggests when a part is unavailable. No prices are listed for them, so they are not in the total.</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alternatives.map((b) => (
              <li key={b.id} className="rounded-3xl border border-amber-200/70 bg-amber-50/40 p-4 space-y-1.5">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">Instead of {b.name}</div>
                <div className="text-sm font-extrabold text-slate-900">{b.alternative!.name}</div>
                {b.alternative!.useCase && <div className="text-xs text-slate-700"><b>Use it if:</b> {b.alternative!.useCase}</div>}
                <div className="text-xs text-slate-700"><b>Why it works:</b> {b.alternative!.whyItWorks}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "tools" && (
        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-5 space-y-2">
          <p className="text-xs text-slate-500">The build steps mention these tools and materials. They are not part of the BOM and not in the total.</p>
          <ul className="flex flex-wrap gap-1.5">
            {TOOLS.map((t) => <li key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F3ECE3] text-xs font-semibold text-slate-700"><Wrench className="w-3.5 h-3.5 text-slate-500" />{t}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
