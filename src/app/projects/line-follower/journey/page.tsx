import LineFollowerDetailPage from "../page";
import { PanelJourneyMode } from "@/components/journey/mode";

/* The Line Follower's panel journey: its regular project page, rendered in panel mode (same chapters, same content). */
export default function LineFollowerPanelJourneyPage() {
  return (
    <PanelJourneyMode slug="line-follower" classicHref="/projects/line-follower">
      <LineFollowerDetailPage />
    </PanelJourneyMode>
  );
}
