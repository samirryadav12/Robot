"use client";

import { createContext, useContext } from "react";
import type { ReactNode, MouseEvent as ReactMouseEvent } from "react";
import type { StationKind } from "./stage";

/* Shared by both journey layouts (the long scroll page and the panel journey): chapters, and the goTo
   that in-page links use, so the same tab content works unchanged in either. */

export interface JourneyChapter {
  id: StationKind;        // section id, also the old ?tab= / #hash name so existing links keep working
  label: string;          // navigator label
  eyebrow?: string;
  title?: string;
  lede?: string;
  badge?: string;
  layout?: "side" | "wide";
  beat?: ReactNode;       // custom opening (the overview hero)
  children: ReactNode;
}

export const JourneyContext = createContext<{ goTo: (id: string) => void }>({ goTo: () => {} });
export const useJourney = () => useContext(JourneyContext);

/* an in-page link to a chapter: travels through the journey to it instead of jumping */
export function JourneyLink({ to, className, children }: { to: StationKind; className?: string; children: ReactNode }) {
  const { goTo } = useJourney();
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={(e: ReactMouseEvent) => { e.preventDefault(); goTo(to); }}
    >
      {children}
    </a>
  );
}
