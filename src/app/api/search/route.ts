import { NextResponse } from "next/server";
import { PROJECTS } from "@/data/projects";
import { searchProjects } from "@/lib/projectSearch";

/* GET /api/search?q=drone&limit=8&offset=0&category=…&level=…
   Searches every published project in the catalogue (src/data/projects.ts) on the server, so the homepage
   (a static page) and the /search page share one search and visitors only download the results. */
export function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").slice(0, 120);
  try {
    const res = searchProjects(PROJECTS, q, {
      limit: Number(sp.get("limit")) || 8,
      offset: Number(sp.get("offset")) || 0,
      category: sp.get("category")?.slice(0, 60) || undefined,
      level: sp.get("level")?.slice(0, 30) || undefined,
    });
    return NextResponse.json(res, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ error: "Search is unavailable right now." }, { status: 500 });
  }
}
