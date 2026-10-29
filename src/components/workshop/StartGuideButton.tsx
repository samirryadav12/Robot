"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { Project } from "@/data/projects";
import { KitProvider } from "./kit";
import { kitForSlug } from "./kits";
import { BuildIntro } from "./BuildIntro";

/* "Start Step-by-Step Guide" on the shared project page: projects with a 3D workshop open the full-window build
   intro (complete model → exploded view → build steps); the rest keep their plain link to the steps. */
export function StartGuideButton({ project, href, className, children }: { project: Project; href: string; className: string; children: ReactNode }) {
  const kit = kitForSlug(project.slug);
  const [open, setOpen] = useState(false);
  if (!kit) return <a href={href} className={className}>{children}</a>;
  return (
    <KitProvider kit={kit}>
      <button type="button" onClick={() => setOpen(true)} className={className}>{children}</button>
      <BuildIntro project={project} open={open} onClose={() => setOpen(false)} />
    </KitProvider>
  );
}
