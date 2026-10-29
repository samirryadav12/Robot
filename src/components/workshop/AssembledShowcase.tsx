"use client";

import { useState } from "react";
import type { Project } from "@/data/projects";
import { WorkshopViewer } from "./WorkshopViewer";
import { PartDetail, usePartThumbs } from "./PartsExplorer";
import { useKit } from "./kit";

type PartId = string;

/* The finished robot, fully assembled: the same detailed model as the rest of the workshop, shown as a
   product render. Rotate, zoom, reset, labels and tap-a-part only; it never comes apart here (the exploded view
   lives in the Start Step-by-Step Guide intro and the Parts List). */

export function AssembledShowcase({ project }: { project: Project }) {
  const kit = useKit();
  const [sel, setSel] = useState<PartId | null>(null);
  const thumbs = usePartThumbs();
  return (
    <div className="relative">
      <WorkshopViewer mode="parts" minimal variant="technical" showcase zoom={0.86} height={580}
        selectedPart={sel} onSelectPart={setSel}
        ariaLabel={`The fully assembled ${project.title}, in 3D. Drag to rotate, scroll to zoom, tap a part to learn about it.`} />
      {sel && (
        <aside className="absolute z-10 left-2 right-2 bottom-[60px] max-h-[60%] sm:left-auto sm:right-4 sm:top-4 sm:bottom-[64px] sm:max-h-none sm:w-[360px] overflow-y-auto rounded-3xl border border-[#E8E2D9] bg-white/95 backdrop-blur p-4 shadow-xl lf-rise" aria-live="polite">
          <PartDetail project={project} id={sel} thumb={thumbs[sel]} inGuide onBack={() => setSel(null)} backLabel={`Back to the whole ${kit.noun}`} />
        </aside>
      )}
    </div>
  );
}
