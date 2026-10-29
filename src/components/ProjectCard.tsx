import Link from "next/link";
import Image from "next/image";
import { Project } from "@/data/projects";
import { Clock, Cpu, Wrench, ArrowRight, Box } from "lucide-react";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const isLineFollower = project.slug === "line-follower";
  const linkHref = isLineFollower ? "/projects/line-follower" : `/projects/${project.slug}`;

  const levelColor = {
    Beginner: "bg-[#EAF5EC] text-[#2E7D32] border-[#D5EBD7]",
    Intermediate: "bg-[#FDF1E8] text-brand-600 border-[#FCDDC9]",
    Advanced: "bg-[#F2ECFA] text-[#7048E8] border-[#E3D5F7]",
  }[project.level];

  return (
    <div className="group bg-white rounded-3xl border border-[#E8E2D9] p-4 flex flex-col justify-between shadow-subtle hover:shadow-lift transition-all duration-300 hover:-translate-y-1">
      <div>
        {/* Image Module */}
        <div className="relative w-full h-52 rounded-2xl overflow-hidden bg-brand-50 mb-4">
          <Image
            src={project.image}
            alt={project.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />
          {project.badge && (
            <div className="absolute top-3 left-3 bg-brand-500 text-white font-extrabold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
              {project.badge}
            </div>
          )}
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-brand-500" />
            <span>{project.timeEstimate}</span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${levelColor}`}>
              {project.level}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Wrench className="w-3 h-3 text-slate-400" />
              {project.partsCount} Parts
            </span>
          </div>

          <h3 className="font-extrabold text-xl text-slate-900 group-hover:text-brand-600 transition-colors">
            {project.title}
          </h3>

          <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed">
            {project.description}
          </p>
        </div>

        {/* Hardware specs preview */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Cpu className="w-3.5 h-3.5 text-brand-500 shrink-0" />
          <span className="truncate">{project.microcontroller}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-3 space-y-3">
        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
          {project.category}
        </span>
        <div className="grid grid-cols-2 gap-2">
          {/* the guided 3D journey through this project's panels */}
          <Link
            href={`${linkHref}/journey`}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-brand-500 text-white hover:bg-brand-600 font-bold text-xs whitespace-nowrap transition-colors duration-200"
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Journey</span>
          </Link>
          <Link
            href={linkHref}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-[#FDF1E8] text-brand-600 hover:bg-brand-500 hover:text-white font-bold text-xs whitespace-nowrap transition-colors duration-200"
          >
            <span>Build Guide</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
