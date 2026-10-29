"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import type { SearchHit, SearchResponse } from "@/lib/projectSearch";

/* /search?q=drone&category=…&level=… — every published project in the catalogue, through /api/search,
   a page of results at a time. The homepage search's "View all results" lands here. */

const PAGE = 12;
const SUGGESTIONS = ["line follower", "drone", "robotic arm", "soccer", "maze", "IR sensor", "beginner", "Arduino"];

function ResultCard({ r }: { r: SearchHit }) {
  return (
    <Link href={r.href} className="group flex gap-4 p-4 rounded-3xl bg-white border border-[#E8E2D9] hover:border-brand-300 shadow-subtle transition-colors">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {r.image ? <img src={r.image} alt="" loading="lazy" className="w-28 h-20 sm:w-36 sm:h-24 rounded-2xl object-cover bg-[#F1ECE4] shrink-0" /> : <span className="w-28 h-20 sm:w-36 sm:h-24 rounded-2xl bg-[#F1ECE4] shrink-0" />}
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="block text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-brand-700 leading-tight">{r.title}</span>
        <span className="block text-sm text-slate-600 leading-snug line-clamp-2">{r.description}</span>
        <span className="flex flex-wrap gap-1.5 pt-0.5">
          {r.level && <span className="px-2 py-0.5 rounded-full bg-brand-50 border border-brand-200 text-[11px] font-bold text-brand-700">{r.level}</span>}
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">{r.category}</span>
        </span>
      </span>
      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500 self-center shrink-0 hidden sm:block" />
    </Link>
  );
}

function SearchPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const level = params.get("level") ?? "";
  const [draft, setDraft] = useState(q);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "more" | "error">("loading");
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => setDraft(q), [q]);

  const fetchPage = useCallback(async (offset: number) => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState(offset ? "more" : "loading");
    try {
      const sp = new URLSearchParams({ q, limit: String(PAGE), offset: String(offset) });
      if (category) sp.set("category", category);
      if (level) sp.set("level", level);
      const res = await fetch(`/api/search?${sp}`, { signal: c.signal });
      if (!res.ok) throw new Error(String(res.status));
      const d: SearchResponse = await res.json();
      setData(d);
      setResults((prev) => (offset ? [...prev, ...d.results.filter((r) => !prev.some((p) => p.slug === r.slug))] : d.results));
      setState("idle");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setState("error");
    }
  }, [q, category, level]);

  useEffect(() => { fetchPage(0); }, [fetchPage]);

  const go = (next: { q?: string; category?: string; level?: string }) => {
    const sp = new URLSearchParams();
    const nq = next.q ?? q, nc = next.category ?? category, nl = next.level ?? level;
    if (nq) sp.set("q", nq);
    if (nc) sp.set("category", nc);
    if (nl) sp.set("level", nl);
    router.replace(`/search${sp.toString() ? `?${sp}` : ""}`, { scroll: false });
  };

  const chip = (on: boolean) => `px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${on ? "bg-slate-900 text-white" : "bg-white border border-[#E8E2D9] text-slate-600 hover:text-slate-900"}`;
  const cats = Object.entries(data?.facets.categories ?? {});
  const levels = Object.entries(data?.facets.levels ?? {});

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <div className="space-y-4">
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-100 text-brand-800">Project search</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{q ? <>Results for “{q}”</> : "Search every robot project"}</h1>
        <form role="search" onSubmit={(e) => { e.preventDefault(); go({ q: draft.trim().slice(0, 120) }); }} className="relative max-w-2xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={120} placeholder="Search any robot project…" aria-label="Search any robot project"
            className="w-full h-13 py-3.5 pl-12 pr-28 rounded-full bg-white border border-[#E8E2D9] text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
          {draft && <button type="button" onClick={() => { setDraft(""); go({ q: "" }); }} aria-label="Clear search" className="absolute right-[92px] top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>}
          <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-10 px-5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold">Search</button>
        </form>
      </div>

      {(cats.length > 1 || levels.length > 1 || category || level) && (
        <div className="space-y-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Filter by category">
            <button type="button" className={chip(!category)} onClick={() => go({ category: "" })}>All categories</button>
            {cats.map(([c, n]) => <button key={c} type="button" className={chip(category === c)} onClick={() => go({ category: category === c ? "" : c })}>{c} <span className="opacity-60">{n}</span></button>)}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Filter by level">
            <button type="button" className={chip(!level)} onClick={() => go({ level: "" })}>Any level</button>
            {levels.map(([l, n]) => <button key={l} type="button" className={chip(level === l)} onClick={() => go({ level: level === l ? "" : l })}>{l} <span className="opacity-60">{n}</span></button>)}
          </div>
        </div>
      )}

      <div aria-live="polite" className="text-sm font-semibold text-slate-500">
        {state === "loading" ? "Searching…" : state === "error" ? "" : data ? `${data.total} ${data.total === 1 ? "project" : "projects"}${q ? " found" : ""}` : ""}
      </div>

      {state === "error" && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Search isn&apos;t available right now. <button type="button" onClick={() => fetchPage(0)} className="font-bold underline">Try again</button> or <Link href="/projects" className="font-bold underline">browse all projects</Link>.
        </div>
      )}

      {state !== "loading" && state !== "error" && data && data.total === 0 && (
        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 space-y-3">
          <div className="font-extrabold text-slate-900">No projects match{q ? ` “${q}”` : ""}{category || level ? " with these filters" : ""}.</div>
          <p className="text-sm text-slate-600">Try a robot type, a part, or a level:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => <button key={s} type="button" className={chip(false)} onClick={() => go({ q: s, category: "", level: "" })}>{s}</button>)}
          </div>
          {(category || level) && <button type="button" onClick={() => go({ category: "", level: "" })} className="text-sm font-bold text-brand-700 hover:underline">Clear the filters</button>}
        </div>
      )}

      <div className="grid gap-3">
        {results.map((r) => <ResultCard key={r.slug} r={r} />)}
      </div>

      {data && results.length < data.total && state !== "error" && (
        <div className="flex justify-center">
          <button type="button" onClick={() => fetchPage(results.length)} disabled={state === "more"} className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-white border border-[#E8E2D9] text-sm font-bold text-slate-800 hover:border-brand-300 disabled:opacity-60">
            {state === "more" && <Loader2 className="w-4 h-4 animate-spin" />} Show more ({data.total - results.length} left)
          </button>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-14 text-sm text-slate-500">Loading search…</div>}>
      <SearchPageInner />
    </Suspense>
  );
}
