"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { RobotViewer3D } from "@/components/RobotViewer3D";

interface Project3DComparisonProps {
  slug: string;
  title: string;
  realImage?: string;
  description?: string;
  viewer?: ReactNode;   // a project's own 3D view in place of the generic RobotViewer3D
}

export function Project3DComparison({
  slug,
  title,
  realImage,
  description = "Explore the robot from every angle. Drag to rotate the model and use the controls to zoom in or out.",
  viewer,
}: Project3DComparisonProps) {
  // Determine standard path for real robot photograph
  const resolvedRealImage =
    realImage ||
    (slug === "drone" || slug === "drone-explorer"
      ? "/robotics/drone-real.jpeg"
      : slug === "line-follower"
      ? "/robotics/line-follower-real.png"
      : `/robotics/${slug}-real.jpg`);

  return (
    <div className="space-y-8">
      {/* 3D Section Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-brand-600 font-extrabold text-xs uppercase tracking-widest">
            3D Model View
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
          <span className="text-slate-500 font-semibold text-xs">Interactive Preview</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          See Your Robot in 3D
        </h3>
        <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>

      {/* 1. 3D MODEL VIEWER (Primary) */}
      <div className="w-full">
        {viewer ?? <RobotViewer3D slug={slug} />}
      </div>

      {/* 2. REAL PROJECT PHOTOGRAPH COMPARISON (Directly Below 3D Viewer) */}
      <div className="pt-6 border-t border-[#E8E2D9] space-y-4">
        {/* Label & Caption */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-[11px] font-extrabold uppercase tracking-wider">
            <span>REAL PROJECT</span>
          </div>
          <p className="text-slate-600 text-sm font-medium">
            Here is what the finished robot can look like in real life.
          </p>
        </div>

        {/* Real Robot Photograph Card */}
        <div className="rounded-3xl border border-[#E8E2D9] bg-[#FAF7F2] p-4 sm:p-6 shadow-subtle space-y-3">
          <div className="relative w-full h-[320px] sm:h-[440px] md:h-[500px] rounded-2xl overflow-hidden bg-white border border-[#E8E2D9] shadow-inner flex items-center justify-center">
            <Image
              src={resolvedRealImage}
              alt={`${title} Physical Robot Build`}
              fill
              className="object-contain p-2 sm:p-4 transition-transform duration-500 hover:scale-[1.01]"
              unoptimized
              priority={false}
            />
          </div>

          {/* Photograph Metadata footer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500 font-medium px-1">
            <span className="flex items-center gap-1.5 font-bold text-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Finished real-life robot build
            </span>
            <span className="text-[11px] text-slate-500">
              Use this photo to check your assembly and wiring positions.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
