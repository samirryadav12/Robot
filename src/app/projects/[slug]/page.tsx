import { notFound } from "next/navigation";
import Link from "next/link";
import { PROJECTS } from "@/data/projects";
import { 
  Clock, 
  Wrench, 
  ChevronRight, 
  ListChecks,
  Code2,
  Box
} from "lucide-react";
import { ProjectTabsContainer } from "@/components/ProjectTabsContainer";
import { StartGuideButton } from "@/components/workshop/StartGuideButton";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export async function generateStaticParams() {
  return PROJECTS.filter(p => p.slug !== "line-follower").map((p) => ({
    slug: p.slug,
  }));
}

export default async function GenericProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);

  if (!project) {
    notFound();
  }

  /* the project opening is the first chapter of the journey: copy on the left, the 3D world on the right */
  const hero = (
      <div key="hero" className="journey-beat min-h-[calc(100svh-5rem)] flex flex-col pt-8 pb-12 lg:pb-16">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 lg:pr-24 flex-1 flex flex-col space-y-6">
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-brand-600 transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/projects" className="hover:text-brand-600 transition-colors">Projects</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-brand-600 font-bold">{project.title}</span>
          </nav>

          <div className="flex-1 flex items-end lg:items-center pt-[34svh] lg:pt-0">
            <div className="lg:w-[56%] space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-brand-500 text-white font-extrabold text-xs uppercase tracking-wider">
                  {project.level}
                </span>
                <span className="px-3 py-1 rounded-full bg-brand-100 text-brand-800 font-bold text-xs">
                  {project.category}
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {project.timeEstimate}
                </span>
              </div>

              <h1 id="overview-title" className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                {project.title}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                {project.description}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-white rounded-2xl p-3 border border-[#E8E2D9] shadow-subtle">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Brain / Controller</div>
                  <div className="text-xs font-bold text-slate-800 truncate">{project.microcontroller}</div>
                </div>
                <div className="bg-white rounded-2xl p-3 border border-[#E8E2D9] shadow-subtle">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Motor Control</div>
                  <div className="text-xs font-bold text-slate-800 truncate">{project.motorDriver}</div>
                </div>
                <div className="bg-white rounded-2xl p-3 border border-[#E8E2D9] shadow-subtle">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Parts Needed</div>
                  <div className="text-xs font-bold text-slate-800">{project.partsCount} items</div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <StartGuideButton
                  project={project}
                  href="#steps"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-md transition-colors"
                >
                  <ListChecks className="w-4 h-4" />
                  <span>Start Step-by-Step Guide</span>
                </StartGuideButton>

                {project.arduinoCode && (
                  <a
                    href="#code"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white hover:bg-brand-50 border border-brand-200 text-brand-700 font-bold text-sm shadow-sm transition-colors"
                  >
                    <Code2 className="w-4 h-4 text-brand-500" />
                    <span>View Program Code</span>
                  </a>
                )}

                <Link
                  href="/assistant"
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-brand-100 hover:bg-brand-200 text-brand-800 font-bold text-sm transition-colors"
                >
                  <Wrench className="w-4 h-4 text-brand-600" />
                  <span>Ask the Assistant</span>
                </Link>

                <Link
                  href={`/projects/${project.slug}/journey`}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-slate-900 hover:bg-slate-700 text-white font-bold text-sm transition-colors"
                >
                  <Box className="w-4 h-4" />
                  <span>3D Journey</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
  );

  return (
    <div className="pb-24">
      <ProjectTabsContainer project={project} hero={hero} />
    </div>
  );
}
