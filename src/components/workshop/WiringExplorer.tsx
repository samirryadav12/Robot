"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, HelpCircle, Zap } from "lucide-react";
import type { Project } from "@/data/projects";
import { WorkshopViewer } from "./WorkshopViewer";
import { useKit } from "./kit";
import type { ConnKind } from "./kit";
import { DASH, KIND_LABEL, WIDTH, strokeCss, wireCss } from "./wiringStyle";

/* Wiring: the 3D wires, a circuit diagram and the connection list, all driven by one connection list (the kit's,
   taken from the project's pinout table and wiring steps) and one selection. */

export function WiringExplorer({ project }: { project: Project }) {
  const kit = useKit();
  const { connections: CONNECTIONS, connectionLevel: CONNECTION_LEVEL, pinText: PIN_TEXT, Diagram: CircuitDiagram } = kit;
  const partById = (id: string) => kit.parts.find((p) => p.id === id)!;
  const [sel, setSel] = useState<string | null>(null);
  const toggle = (id: string | null) => setSel((s) => (s === id ? null : id));
  const c = CONNECTIONS.find((x) => x.id === sel) ?? null;
  return (
    <section className="space-y-4" aria-label="Interactive wiring">
      <div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">Every wire, in 3D and on the diagram</h3>
        <p className="text-sm text-slate-600">Pick a connection from the list, the 3D model or the diagram — the same wire lights up in all three.</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <WorkshopViewer mode="wiring" selectedConn={sel} onSelectConn={toggle} height={430} ariaLabel={`3D wiring of the ${project.title}`} />
        <div className="rounded-[1.75rem] border border-[#E8E2D9] bg-[#FBF8F3] overflow-hidden">
          <div className="px-4 pt-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Circuit diagram</div>
          <CircuitDiagram selected={sel} onSelect={toggle} />
        </div>
      </div>

      {/* legend: colour + line pattern + name, never colour alone */}
      <div className="flex flex-wrap gap-3 text-[11px] font-bold text-slate-600">
        {(Object.keys(KIND_LABEL) as ConnKind[]).filter((k) => CONNECTIONS.some((x) => x.kind === k)).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <svg width="34" height="8" aria-hidden><line x1="1" y1="4" x2="33" y2="4" stroke="#475569" strokeWidth={WIDTH[k]} strokeDasharray={DASH[k]} /></svg>
            {KIND_LABEL[k]}
          </span>
        ))}
        <span className="text-slate-400 font-semibold">· wire colours follow the guide&apos;s recommendation</span>
      </div>

      {c && (
        <div className="rounded-3xl border-2 border-brand-200 bg-white p-4 sm:p-5 grid gap-2 sm:grid-cols-[auto_1fr]">
          <span className="w-3 h-3 mt-1.5 rounded-full border border-slate-300" style={{ background: wireCss(c.color) }} />
          <div className="space-y-1.5">
            <div className="text-sm font-extrabold text-slate-900">{c.from.name} <span className="text-brand-500">→</span> {c.to.name}</div>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white">{KIND_LABEL[c.kind]}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{c.color} wire{c.colorNote ? ` (${c.colorNote})` : ""}</span>
              <span className="px-2 py-0.5 rounded-full bg-[#F3ECE3] text-slate-600">Source: {c.source}</span>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl bg-[#FBF8F3] border border-[#E8E2D9] px-3 py-2"><dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">From</dt><dd className="text-slate-900"><b>{partById(c.from.part).label}</b><br /><span className="font-mono">{PIN_TEXT[c.from.terminal] || c.from.name}</span></dd></div>
              <div className="rounded-2xl bg-[#FBF8F3] border border-[#E8E2D9] px-3 py-2"><dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">To</dt><dd className="text-slate-900"><b>{partById(c.to.part).label}</b><br /><span className="font-mono">{PIN_TEXT[c.to.terminal] || c.to.name}</span></dd></div>
            </dl>
            <p className="text-sm text-slate-700"><b>Purpose:</b> {c.purpose}</p>
            {CONNECTION_LEVEL[c.id] && <p className="text-xs text-slate-700 flex gap-1.5"><Zap className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" /><span><b>Voltage / polarity:</b> {CONNECTION_LEVEL[c.id]}</span></p>}
            {c.warning && <p className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2 flex gap-2"><AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />{c.warning}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {kit.wiringGroups.map((g) => (
          <div key={g.title} className="rounded-3xl border border-[#E8E2D9] bg-white p-3">
            <div className="px-1 pb-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">{g.title}</div>
            <ul className="space-y-1">
              {g.ids.map((id) => {
                const x = CONNECTIONS.find((y) => y.id === id)!;
                const on = sel === id;
                return (
                  <li key={id}>
                    <button type="button" onClick={() => toggle(id)} aria-pressed={on}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-left text-xs transition-colors ${on ? "bg-brand-50 ring-1 ring-brand-300" : "hover:bg-[#FBF8F3]"}`}>
                      <svg width="26" height="8" aria-hidden className="shrink-0"><line x1="1" y1="4" x2="25" y2="4" stroke={strokeCss(x.color)} strokeWidth={WIDTH[x.kind] + 0.5} strokeDasharray={DASH[x.kind]} /></svg>
                      <span className="flex-1 min-w-0"><b className="text-slate-900">{x.from.name}</b> → <b className="text-slate-900">{x.to.name}</b></span>
                      <span className="shrink-0 text-[10px] font-bold text-slate-500">{x.color} · {KIND_LABEL[x.kind]}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* every connection in one table: start, end, purpose, voltage — collapsible to keep the page short */}
      <details className="group rounded-3xl border border-[#E8E2D9] bg-white overflow-hidden">
        <summary className="flex items-center justify-between gap-2 px-5 py-3.5 cursor-pointer list-none text-sm font-extrabold text-slate-900">
          All {CONNECTIONS.length} connections in one table
          <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="overflow-x-auto border-t border-[#E8E2D9]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              <tr><th className="py-2.5 px-4">From (part · pin)</th><th className="py-2.5 px-4">To (part · pin)</th><th className="py-2.5 px-4">Wire</th><th className="py-2.5 px-4 min-w-[200px]">Purpose</th><th className="py-2.5 px-4 min-w-[200px]">Voltage / polarity</th><th className="py-2.5 px-4">Step</th></tr>
            </thead>
            <tbody className="divide-y divide-[#EFE9E0]">
              {CONNECTIONS.map((x) => (
                <tr key={x.id} onClick={() => toggle(x.id)} className={`cursor-pointer ${sel === x.id ? "bg-brand-50" : "hover:bg-[#FBF8F3]"}`}>
                  <td className="py-2.5 px-4"><b className="text-slate-900">{partById(x.from.part).label}</b><div className="font-mono text-slate-600">{PIN_TEXT[x.from.terminal] || x.from.name}</div></td>
                  <td className="py-2.5 px-4"><b className="text-slate-900">{partById(x.to.part).label}</b><div className="font-mono text-slate-600">{PIN_TEXT[x.to.terminal] || x.to.name}</div></td>
                  <td className="py-2.5 px-4 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ background: wireCss(x.color) }} />{x.color}</span><div className="text-slate-400">{KIND_LABEL[x.kind]}</div></td>
                  <td className="py-2.5 px-4 text-slate-700">{x.purpose}</td>
                  <td className="py-2.5 px-4 text-slate-700">{CONNECTION_LEVEL[x.id]}</td>
                  <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{x.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {kit.openQuestions.map((q) => (
        <div key={q} className="rounded-3xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-950 flex gap-2">
          <HelpCircle className="w-4 h-4 text-sky-600 shrink-0" />
          <span><b>Needs confirming:</b> {q}</span>
        </div>
      ))}
    </section>
  );
}
