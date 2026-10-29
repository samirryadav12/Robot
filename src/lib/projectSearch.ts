import type { Project } from "@/data/projects";

/* Project search over the whole catalogue (src/data/projects.ts). Every published project is indexed
   automatically from the fields it already has — title, badge, category, level, description, how it works,
   controller, sensors, motor driver, BOM part names and alternatives, and optional `keywords` — so adding a
   project to the catalogue makes it searchable with no change here. Drafts (`status: "draft"`) are never
   returned. Pure functions: the API route and tests call them with whatever catalogue they hold. */

export interface SearchHit {
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  image?: string;
  href: string;
  score: number;
}

export interface SearchResponse {
  query: string;
  total: number;
  offset: number;
  limit: number;
  results: SearchHit[];
  facets: { categories: Record<string, number>; levels: Record<string, number> };
}

/* words people use for the same thing; a query word also matches its synonyms */
const SYNONYMS: string[][] = [
  ["ir", "infrared"],
  ["drone", "quadcopter", "quad", "uav", "aerial"],
  ["arm", "manipulator", "gripper"],
  ["line", "track"],
  ["mcu", "microcontroller", "controller", "arduino", "brain"],
  ["beginner", "beginners", "easy", "starter", "first"],
  ["advanced", "expert", "hard"],
  ["intermediate", "medium"],
  ["camera", "vision"],
  ["battery", "lipo", "18650", "power"],
  ["motor", "motors"],
  ["sensor", "sensors"],
  ["maze", "labyrinth"],
  ["soccer", "football"],
  ["balance", "balancing", "self-balancing"],
];
const SYN = new Map<string, string[]>();
for (const group of SYNONYMS) for (const w of group) SYN.set(w, group);

export const normalize = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9+#.-]+/g, " ").replace(/\s+/g, " ").trim();

/* searchable text per project, by weight: a match in the name counts most */
interface Indexed { p: Project; title: string; tags: string; parts: string; text: string }
const isPublished = (p: Project) => p.status !== "draft";

function indexProject(p: Project): Indexed {
  const level = p.level || p.difficulty || "";
  return {
    p,
    title: normalize([p.title, p.name ?? "", p.slug.replace(/-/g, " ")].join(" ")),
    tags: normalize([p.badge ?? "", p.category, level, ...(p.keywords ?? [])].join(" ")),
    parts: normalize([p.microcontroller, p.motorDriver, ...(p.sensors ?? []), ...(p.bom ?? []).flatMap((b) => [b.name, b.alternative?.name ?? ""])].join(" ")),
    text: normalize([p.description, p.shortDescription ?? "", p.howItWorks ?? "", p.overview ?? ""].join(" ")),
  };
}

/* cache the index per catalogue array, so repeated searches don't rebuild it */
const cache = new WeakMap<readonly Project[], Indexed[]>();
function indexOf(catalogue: readonly Project[]) {
  let idx = cache.get(catalogue);
  if (!idx) {
    const seen = new Set<string>();
    idx = catalogue.filter((p) => p && p.slug && isPublished(p) && !seen.has(p.slug) && (seen.add(p.slug), true)).map(indexProject);
    cache.set(catalogue, idx);
  }
  return idx;
}

const hasWord = (field: string, w: string) => (" " + field).includes(" " + w); // a word that starts with w
function termScore(d: Indexed, term: string): number {
  const forms = SYN.get(term) ?? [term];
  let best = 0;
  for (const f of forms) {
    const exact = f === term ? 1 : 0.85; // synonyms count a little less than the word typed
    if (f.length >= 3 ? d.title.includes(f) : hasWord(d.title, f)) best = Math.max(best, (hasWord(d.title, f) ? 10 : 6) * exact);
    if (hasWord(d.tags, f)) best = Math.max(best, 6 * exact);
    if (hasWord(d.parts, f)) best = Math.max(best, 4 * exact);
    else if (f.length >= 3 && d.parts.includes(f)) best = Math.max(best, 2.5 * exact);
    if (hasWord(d.text, f)) best = Math.max(best, 2 * exact);
    else if (f.length >= 4 && d.text.includes(f)) best = Math.max(best, 1 * exact);
  }
  return best;
}

export function searchProjects(
  catalogue: readonly Project[],
  rawQuery: string,
  opts: { limit?: number; offset?: number; category?: string; level?: string } = {},
): SearchResponse {
  const query = normalize(String(rawQuery ?? "").slice(0, 120));
  const limit = Math.min(Math.max(Number(opts.limit) || 8, 1), 50);
  const offset = Math.max(Number(opts.offset) || 0, 0);
  const terms = query ? query.split(" ").filter(Boolean).slice(0, 8) : [];
  const levelOf = (p: Project) => p.level || p.difficulty || "";

  let hits: { d: Indexed; score: number }[] = [];
  for (const d of indexOf(catalogue)) {
    if (!terms.length) { hits.push({ d, score: d.p.featured ? 1 : 0 }); continue; }
    let score = 0;
    let all = true;
    for (const t of terms) { const s = termScore(d, t); if (!s) { all = false; break; } score += s; }
    if (!all) continue;
    if (d.title.startsWith(query)) score += 8; // whole query at the start of the name
    else if (d.title.includes(query)) score += 4;
    hits.push({ d, score });
  }
  hits.sort((a, b) => b.score - a.score || a.d.p.title.localeCompare(b.d.p.title));

  // facets describe the matches before the category / level filters are applied
  const facets = { categories: {} as Record<string, number>, levels: {} as Record<string, number> };
  for (const h of hits) {
    facets.categories[h.d.p.category] = (facets.categories[h.d.p.category] ?? 0) + 1;
    const lv = levelOf(h.d.p);
    if (lv) facets.levels[lv] = (facets.levels[lv] ?? 0) + 1;
  }
  if (opts.category) hits = hits.filter((h) => h.d.p.category === opts.category);
  if (opts.level) hits = hits.filter((h) => levelOf(h.d.p) === opts.level);

  return {
    query, total: hits.length, offset, limit, facets,
    results: hits.slice(offset, offset + limit).map(({ d, score }) => ({
      slug: d.p.slug,
      title: d.p.title,
      description: d.p.shortDescription || d.p.description,
      category: d.p.category,
      level: levelOf(d.p),
      image: d.p.image || d.p.realImage || undefined,
      href: `/projects/${d.p.slug}`,
      score: Math.round(score * 10) / 10,
    })),
  };
}
