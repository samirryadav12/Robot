"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

/* Wrapping an existing project page in <PanelJourneyMode> makes its ProjectJourney render as the panel journey
   (Nesto guiding through floating 3D panels) instead of the long scroll page. The page builds its chapters exactly
   as before, so the tab content is shared, not copied. */

export interface PanelMode {
  slug: string;
  classicHref: string; // the regular tabbed project page, kept as the alternative view
}

const PanelModeContext = createContext<PanelMode | null>(null);
export const usePanelMode = () => useContext(PanelModeContext);

export function PanelJourneyMode({ slug, classicHref, children }: PanelMode & { children: ReactNode }) {
  return <PanelModeContext.Provider value={{ slug, classicHref }}>{children}</PanelModeContext.Provider>;
}
