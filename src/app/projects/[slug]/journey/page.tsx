import GenericProjectPage from "../page";
import { PROJECTS } from "@/data/projects";
import { PanelJourneyMode } from "@/components/journey/mode";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return PROJECTS.filter((p) => p.slug !== "line-follower").map((p) => ({ slug: p.slug }));
}

/* The panel journey: the regular project page, rendered in panel mode (same chapters, same content). */
export default async function ProjectPanelJourneyPage({ params }: Props) {
  const { slug } = await params;
  return (
    <PanelJourneyMode slug={slug} classicHref={`/projects/${slug}`}>
      <GenericProjectPage params={params} />
    </PanelJourneyMode>
  );
}
