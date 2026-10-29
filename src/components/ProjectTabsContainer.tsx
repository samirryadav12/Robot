"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Project } from "@/data/projects";
import { getStoreBundlesForProject, getStorePricingForProject } from "@/data/stores";
import { DiagramViewer } from "@/components/DiagramViewer";
import { Project3DComparison } from "@/components/Project3DComparison";
import { ProjectBomSection } from "@/components/ProjectBomSection";
import { ProjectJourney, JourneyLink } from "@/components/journey/ProjectJourney";
import type { JourneyChapter } from "@/components/journey/ProjectJourney";
import { chapterCovers, stageDataFor } from "@/components/journey/chapters";
import { KitProvider } from "@/components/workshop/kit";
import { kitForSlug } from "@/components/workshop/kits";
import { WorkshopPartsChapter } from "@/components/workshop/PartsExplorer";
import { WiringExplorer } from "@/components/workshop/WiringExplorer";
import { StepGuide } from "@/components/workshop/StepGuide";
import { AssembledShowcase } from "@/components/workshop/AssembledShowcase";
import { 
  Layers, 
  ShoppingCart, 
  Cpu, 
  FileCode2, 
  ListChecks, 
  Box, 
  Code2,
  ExternalLink,
  HelpCircle,
  ArrowRight, 
  ChevronRight,
  CheckCircle2,
  Circle,
  Check,
  Copy,
  Download,
  Info,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export type ProjectTabType = 
  | "overview" 
  | "bom" 
  | "wiring" 
  | "pinout" 
  | "steps" 
  | "view3d" 
  | "code" 
  | "stores" 
  | "faq"
  | "milestones";

interface ProjectTabsContainerProps {
  project: Project;
  /** kept for older callers; the journey opens at the chapter named in ?tab= or #hash by itself */
  initialTab?: ProjectTabType;
  /** the project's opening (title, key facts, actions), shown as the first chapter's cover */
  hero?: ReactNode;
}

/* The project page as one scroll-driven journey: each former tab is now a chapter, in the same order. */
export function ProjectTabsContainer({ project, hero }: ProjectTabsContainerProps) {
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [codeCopied, setCodeCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  // projects with a 3D workshop (e.g. the drone) get the interactive parts, wiring, steps and showcase
  const kit = kitForSlug(project.slug);
  const doneKey = kit ? `${kit.id}:completed-steps` : null;

  // a workshop project keeps its "Mark as Done" ticks for this browser session, like the Line Follower
  useEffect(() => {
    if (!doneKey) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(doneKey) || "{}");
      if (saved && typeof saved === "object") setCompletedSteps(saved);
    } catch { /* storage unavailable */ }
  }, [doneKey]);

  const toggleStep =(stepNumber: number) => {
    setCompletedSteps((prev) => {
      const next = { ...prev, [stepNumber]: !prev[stepNumber] };
      if (doneKey) try { sessionStorage.setItem(doneKey, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  };

  const copyCodeToClipboard = () => {
    if (project.arduinoCode) {
      navigator.clipboard.writeText(project.arduinoCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    }
  };

  const downloadIno = () => {
    const isFlightController = 
      project.slug === "drone-explorer" ||
      project.microcontroller.toLowerCase().includes("flight controller") ||
      project.category === "Aerial Robotics";

    const extension = isFlightController ? "txt" : "ino";
    const filename = `${project.title.replace(/[^a-zA-Z0-9]/g, "_")}${isFlightController ? "_Betaflight_CLI" : ""}.${extension}`;
    const element = document.createElement("a");
    const file = new Blob([project.arduinoCode || ""], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const completedStepsCount = Object.values(completedSteps).filter(Boolean).length;
  const totalSteps = project.steps?.length || 12;
  const progressPercent = Math.round((completedStepsCount / totalSteps) * 100);


  const covers = chapterCovers(project);
  const chapters: JourneyChapter[] = [
    {
      id: "overview",
      label: "Overview",
      beat: hero,
      children: (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl p-8 border border-[#E8E2D9] shadow-subtle space-y-5">
                  <div className="space-y-2">
                    <span className="text-brand-600 font-extrabold text-xs uppercase tracking-widest">
                      Robot Summary
                    </span>
                    <h3 className="text-2xl font-extrabold text-slate-900">What is this robot?</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {project.description}
                    </p>
                  </div>

                  {project.howItWorks && (
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <h4 className="text-sm font-extrabold text-slate-900">How it works in simple terms:</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {project.howItWorks}
                      </p>
                    </div>
                  )}

                  {project.assemblyVideoUrl && (
                    <div className="pt-4 border-t border-slate-100">
                      <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-500 block">
                            Want to see how it goes together?
                          </span>
                          <h4 className="text-sm font-extrabold text-slate-900">
                            Physical Drone Assembly Video
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Watch a step-by-step video demonstration of the physical drone build.
                          </p>
                        </div>
                        <a
                          href={project.assemblyVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-sm transition-colors shrink-0"
                        >
                          <span>Watch Assembly Video →</span>
                        </a>
                      </div>
                    </div>
                  )}
                
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <h4 className="text-sm font-extrabold text-slate-900">Sensors used on this robot:</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.sensors.map((s, idx) => (
                        <span key={idx} className="px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold">
                          {s}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      Sensors act as the robot&apos;s eyes and ears, helping it detect what is happening around it.
                    </p>
                  </div>
                </div>

                {project.projectNote && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-medium">{project.projectNote}</p>
                  </div>
                )}

                <div className="bg-white rounded-3xl p-8 border border-[#E8E2D9] shadow-subtle space-y-4">
                  <h3 className="text-xl font-extrabold text-slate-900">Main Robot Electronics Explained</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D9]">
                      <div className="font-extrabold text-slate-900 mb-1">Controller: {project.microcontroller}</div>
                      <div className="text-slate-600">The central microcomputer that serves as the robot&apos;s brain. It reads sensors, processes logic, and coordinates movement.</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D9]">
                      <div className="font-extrabold text-slate-900 mb-1">Actuation Driver: {project.motorDriver}</div>
                      <div className="text-slate-600">Special power circuits that safely deliver high current from the battery to the motors or actuators without damaging the controller.</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-[#E8E2D9] shadow-subtle space-y-4">
                  <h3 className="text-xl font-extrabold text-slate-900">What You Will Learn</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                    {(project.whatYouLearn && project.whatYouLearn.length > 0 ? project.whatYouLearn : [
                      "How to assemble a rigid mechanical chassis and mount motors securely.",
                      "How to wire power, ground, and signal cables safely without short circuits.",
                      "How to connect sensor inputs and use them to trigger robotic actions.",
                      "How to flash code to the microcontroller and calibrate movements."
                    ]).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* the assembled-robot photo (formerly beside the page title) */}
                <div className="relative w-full h-[260px] rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-brand-100">
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover object-center"
                    unoptimized
                  />
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#E8E2D9] flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Assembled Robot Platform
                    </span>
                    <span className="text-slate-500 font-medium">Ready to Build</span>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] shadow-subtle space-y-4">
                  <h4 className="font-extrabold text-slate-900 text-base">Quick Project Actions</h4>
                  <div className="space-y-2.5">
                    <JourneyLink
                      to="steps"
                      className="w-full text-left p-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center justify-between shadow-sm transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <ListChecks className="w-4 h-4" />
                        <span>Start Step-by-Step Build</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </JourneyLink>

                    {project.arduinoCode && (
                      <JourneyLink
                        to="code"
                        className="w-full text-left p-3.5 rounded-2xl bg-[#FAF7F2] hover:bg-brand-50 border border-[#E8E2D9] text-slate-800 font-bold text-xs flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-brand-600" />
                          <span>View Program Code</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </JourneyLink>
                    )}

                    <JourneyLink
                      to="bom"
                      className="w-full text-left p-3.5 rounded-2xl bg-[#FAF7F2] hover:bg-brand-50 border border-[#E8E2D9] text-slate-800 font-bold text-xs flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-brand-600" />
                        <span>Inspect Complete Parts List</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </JourneyLink>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] shadow-subtle space-y-4">
                  <h4 className="font-extrabold text-slate-900 text-base">Helpful Links</h4>
                  <ul className="space-y-2.5 text-xs font-semibold">
                    <li>
                      <Link href="/projects/line-follower" className="text-brand-600 hover:text-brand-700 flex items-center justify-between">
                        <span>View Line Follower (Best for Beginners)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </li>
                    <li>
                      <Link href="/components-catalog" className="text-slate-600 hover:text-brand-600 flex items-center justify-between">
                        <span>Explore All Robot Parts</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    </li>
                    <li>
                      <Link href={`/availability?project=${project.slug}`} className="text-slate-600 hover:text-brand-600 flex items-center justify-between">
                        <span>Find Where to Buy Parts</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
      ),
    },
    ...(project.bom && project.bom.length > 0
      ? [{
          id: "bom" as const,
          ...covers.bom,
          badge: String(project.bom.length),
          layout: "wide" as const,
          children: kit ? <WorkshopPartsChapter project={project} /> : (
                <ProjectBomSection 
                  items={project.bom ?? []} 
                  projectTitle={project.title} 
                  projectSlug={project.slug}
                />
          ),
        }]
      : []),
    {
      id: "wiring",
      ...covers.wiring,
      ...(kit ? { layout: "wide" as const } : {}),
      children: (
            <div className="space-y-8">
              <div className="space-y-2">
                <span className="text-brand-600 font-extrabold text-xs uppercase tracking-widest">
                  Circuit Connections
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900">
                  {project.title} Wiring Diagram
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm">
                  Follow this color-coded connection diagram. Every wire color and pin number is clearly shown so you can connect parts with confidence.
                </p>
              </div>

              {/* Beginner Guide Callout Box */}
              <div className="rounded-3xl bg-blue-50/80 border border-blue-200 p-6 space-y-3">
                <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Understanding the Connection Labels:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-blue-950">
                  <div className="p-3 bg-white/80 rounded-2xl border border-blue-100">
                    <div className="font-extrabold text-blue-900 mb-0.5">VCC / Power (Red)</div>
                    <div>Provides positive electrical power (5V or battery voltage) to turn on components.</div>
                  </div>
                  <div className="p-3 bg-white/80 rounded-2xl border border-blue-100">
                    <div className="font-extrabold text-blue-900 mb-0.5">GND / Ground (Black)</div>
                    <div>The electrical return path. All circuits and boards must share a common ground.</div>
                  </div>
                  <div className="p-3 bg-white/80 rounded-2xl border border-blue-100">
                    <div className="font-extrabold text-blue-900 mb-0.5">Digital &amp; Analog Pins</div>
                    <div>Listen to sensors or send on/off trigger commands to actuators and driver boards.</div>
                  </div>
                  <div className="p-3 bg-white/80 rounded-2xl border border-blue-100">
                    <div className="font-extrabold text-blue-900 mb-0.5">PWM / Speed Pins</div>
                    <div>Pulse Width Modulation: rapid pulses that control motor speed or servo angles.</div>
                  </div>
                </div>
              </div>

              {/* the 3D wires, circuit diagram and connection list (workshop projects) */}
              {kit && <WiringExplorer project={project} />}

              {/* Schematic Diagram Viewer */}
              <DiagramViewer
                src={
                  project.wiringImage ||
                  (project.slug === "line-follower"
                    ? "/robotics/wiring/line-follower/line-follower-wirring.jpeg"
                    : project.slug === "drone-explorer" || project.slug === "drone"
                    ? "/robotics/wiring/drone-explorer/drone-wiring.jpeg"
                    : `/robotics/wiring/${project.slug}/wiring.png`)
                }
                title={`${project.title} Wiring Diagram`}
                type="wiring"
                slug={project.slug}
              />

              {/* Ground Rule Callout */}
              <div className="rounded-3xl bg-amber-50 border-2 border-amber-200 p-6 flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-amber-900 text-sm">Important: Always Connect a Shared Ground</h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Make sure to connect a black ground wire between the controller ground (GND), motor driver ground, and battery negative lead. Without this shared ground wire, electrical signals have no return reference and the motors or sensors will glitch.
                  </p>
                </div>
              </div>
            </div>
      ),
    },
    {
      id: "pinout",
      ...covers.pinout,
      badge: project.pinout?.length ? String(project.pinout.length) : undefined,
      children: (
            <div className="space-y-8">
              <div className="space-y-2">
                <span className="text-brand-600 font-extrabold text-xs uppercase tracking-widest">
                  Pin Connections
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900">
                  {project.title} Pin Connections Table
                </h3>
                <p className="text-slate-600 text-sm">
                  Pins are the small connection points on the controller. Each component uses specific pins to send power, receive sensor feedback, or control motor speed.
                </p>
              </div>

              {/* Pinout Table */}
              {project.pinout && project.pinout.length > 0 && (
                <div className="bg-white rounded-3xl border border-[#E8E2D9] overflow-hidden shadow-subtle">
                  <div className="p-6 border-b border-[#E8E2D9] flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-base">Where Each Wire Goes</span>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-100 text-brand-800">
                      Color-Coded Guide ({project.pinout.length} Connections)
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#FAF7F2] border-b border-[#E8E2D9] text-xs font-extrabold text-slate-700 uppercase">
                        <tr>
                          <th className="py-3 px-6">Part Terminal</th>
                          <th className="py-3 px-6">Connect To Controller Pin</th>
                          <th className="py-3 px-4">Recommended Wire</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-6">What It Does</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E2D9]">
                        {project.pinout.map((pin, i) => (
                          <tr key={i} className="hover:bg-brand-50/30 transition-colors">
                            <td className="py-3.5 px-6 font-bold text-slate-900">{pin.componentPin}</td>
                            <td className="py-3.5 px-6 font-extrabold text-brand-600 font-mono">{pin.targetPin}</td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                                <span 
                                  className="w-2.5 h-2.5 rounded-full border border-slate-300" 
                                  style={{ 
                                    backgroundColor: pin.wireColor.toLowerCase() === "white" ? "#fff" : pin.wireColor.toLowerCase() 
                                  }} 
                                />
                                {pin.wireColor}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                pin.type === "PWM" ? "bg-purple-100 text-purple-700" :
                                pin.type === "Power" ? "bg-rose-100 text-rose-700" :
                                pin.type === "Ground" ? "bg-slate-800 text-white" :
                                "bg-blue-100 text-blue-700"
                              }`}>
                                {pin.type}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-xs text-slate-600">{pin.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pinout Schematic Graphic */}
              <DiagramViewer
                src={`/robotics/pinout/${project.slug}/pinout.png`}
                title={`${project.title} Pinout Guide`}
                type="pinout"
                slug={project.slug}
              />
            </div>
      ),
    },
    ...(project.steps && project.steps.length > 0
      ? [{
          id: "steps" as const,
          ...covers.steps,
          ...(kit ? { layout: "wide" as const } : {}),
          badge: `${completedStepsCount}/${totalSteps}`,
          children: kit ? (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-extrabold text-slate-900">Build It Step By Step</h3>
                      <p className="text-slate-600 text-sm">
                        Follow each step one at a time. Each step has a clear action, instructions, and what you should see.
                      </p>
                    </div>
                    <div className="bg-brand-50 border border-brand-200 px-4 py-2 rounded-2xl flex items-center gap-3">
                      <span className="text-xs font-bold text-brand-800">Progress: {progressPercent}% Done</span>
                      <div className="w-24 h-2.5 rounded-full bg-brand-200 overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  </div>
                  {/* every step, in its original order, with its 3D view */}
                  <StepGuide project={project} completedSteps={completedSteps} onToggleStep={toggleStep} />
                </div>
          ) : (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-extrabold text-slate-900">Build It Step By Step</h3>
                      <p className="text-slate-600 text-sm">
                        Follow each step one at a time. Each step has a clear action, instructions, and what you should see.
                      </p>
                    </div>
                    <div className="bg-brand-50 border border-brand-200 px-4 py-2 rounded-2xl flex items-center gap-3">
                      <span className="text-xs font-bold text-brand-800">Progress: {progressPercent}% Done</span>
                      <div className="w-24 h-2.5 rounded-full bg-brand-200 overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Beginner-friendly Step Cards */}
                  <div className="space-y-6">
                    {project.steps && project.steps.length > 0 ? (
                      project.steps.map((step) => {
                        const isDone = !!completedSteps[step.stepNumber];
                        return (
                          <div
                            key={step.stepNumber}
                            className={`bg-white rounded-3xl p-6 sm:p-8 border transition-all duration-300 shadow-subtle space-y-5 ${
                              isDone ? "border-emerald-300 bg-emerald-50/20" : "border-[#E8E2D9]"
                            }`}
                          >
                            {/* Top Row: Step Badge + Title + Button */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-2xl font-extrabold text-base flex items-center justify-center shrink-0 shadow-sm ${
                                  isDone ? "bg-emerald-600 text-white" : "bg-brand-500 text-white"
                                }`}>
                                  {step.stepNumber < 10 ? `0${step.stepNumber}` : step.stepNumber}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">{step.stage}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-xs text-slate-500 font-semibold">{step.time}</span>
                                  </div>
                                  <h4 className="text-xl font-extrabold text-slate-900">{step.title}</h4>
                                </div>
                              </div>

                              {/* Check off button */}
                              <button
                                onClick={() => toggleStep(step.stepNumber)}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                                  isDone
                                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                    : "bg-slate-100 text-slate-700 hover:bg-brand-100 hover:text-brand-800"
                                }`}
                              >
                                {isDone ? <Check className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-400" />}
                                <span>{isDone ? "Completed" : "Mark as Done"}</span>
                              </button>
                            </div>

                            {/* Step Content: What to do -> How -> What you should see */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D9] space-y-1">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">What to do</div>
                                <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                                  {step.whatToDo || step.description}
                                </p>
                              </div>

                              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D9] space-y-1">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">How to do it</div>
                                <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                                  {step.howToDo || step.description}
                                </p>
                              </div>

                              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">What you should see</div>
                                <p className="text-xs sm:text-sm text-emerald-950 font-medium leading-relaxed">
                                  {step.whatYouSee || "Check that this step is complete and firmly assembled."}
                                </p>
                              </div>
                            </div>

                            {/* Checkpoints */}
                            {step.checkpoints && step.checkpoints.length > 0 && (
                              <div className="pt-2 border-t border-slate-100 space-y-2">
                                <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Checkpoints to verify:</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  {step.checkpoints.map((cp, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-slate-600">
                                      <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                                      <span>{cp}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}


                            {/* Common Problems */}
                            {step.commonProblems && step.commonProblems.length > 0 && (
                              <div className="pt-2 border-t border-amber-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-700 uppercase tracking-wider">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  Common Problems
                                </div>
                                <div className="space-y-2">
                                  {step.commonProblems.map((cp, idx) => (
                                    <div key={idx} className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs space-y-1">
                                      <div className="font-semibold text-amber-900">⚠ Problem: {cp.problem}</div>
                                      <div className="text-amber-800"><span className="font-semibold">Why it happens:</span> {cp.reason}</div>
                                      <div className="text-amber-800"><span className="font-semibold">What to do:</span> {cp.solution}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {step.tip && (
                              <div className="p-3.5 rounded-2xl bg-brand-50/70 border border-brand-100 text-xs text-brand-800 flex items-start gap-2">
                                <Sparkles className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                                <div><strong>Helpful Tip:</strong> {step.tip}</div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center bg-white rounded-3xl border border-[#E8E2D9]">
                        <p className="text-slate-600 text-sm">Step-by-step instructions are loading for this project.</p>
                      </div>
                    )}
                  </div>
                </div>
          ),
        }]
      : []),
    {
      id: "view3d",
      ...covers.view3d,
      layout: "wide",
      children: (
            <Project3DComparison
              slug={project.slug}
              title={project.title}
              realImage={project.realImage}
              description={kit
                ? `The finished ${kit.noun}, fully assembled. Drag to turn it around, scroll or pinch to zoom, and tap any part to see what it does.`
                : "Explore the robot from every angle. Drag to rotate the model and use the controls to zoom in or out."}
              viewer={kit ? <AssembledShowcase project={project} /> : undefined}
            />
      ),
    },
    ...(project.arduinoCode
      ? [{
          id: "code" as const,
          ...covers.code,
          children: (() => {
                const isFlightController = 
                  project.slug === "drone-explorer" ||
                  project.microcontroller.toLowerCase().includes("flight controller") ||
                  project.category === "Aerial Robotics";

                return (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-extrabold text-slate-900">
                          {isFlightController ? "Flight Controller Configuration" : "Arduino Program Code"}
                        </h3>
                        <p className="text-slate-600 text-sm">
                          {isFlightController 
                            ? "Configure your flight controller using your computer and Betaflight Configurator."
                            : "Upload this program to your controller using your computer and the free Arduino app."}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={copyCodeToClipboard}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-sm transition-colors"
                        >
                          {codeCopied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                          <span>{codeCopied ? "Copied!" : (isFlightController ? "Copy Commands" : "Copy Code")}</span>
                        </button>
                        <button
                          onClick={downloadIno}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-brand-50 border border-brand-200 text-brand-700 font-bold text-xs shadow-sm transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          <span>{isFlightController ? "Download Config (.txt)" : "Download .ino File"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Beginner Explanation Card */}
                    <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D9] text-xs text-slate-700 space-y-2">
                      <div className="font-bold text-slate-900 text-sm">
                        {isFlightController ? "How to Apply This Configuration:" : "How to Upload This Code:"}
                      </div>
                      {isFlightController ? (
                        <ol className="list-decimal list-inside space-y-1 text-slate-600">
                          <li>Download and open the free <strong>Betaflight Configurator</strong> on your computer.</li>
                          <li>Connect your <strong>SpeedyBee F405 Mini</strong> to your computer using a USB-C cable (ensure all propellers are removed).</li>
                          <li>Open the <strong>CLI</strong> tab in Betaflight Configurator, paste the commands below into the input box, and press <strong>Enter</strong> to save and reboot.</li>
                        </ol>
                      ) : (
                        <ol className="list-decimal list-inside space-y-1 text-slate-600">
                          <li>Download and open the free <strong>Arduino IDE</strong> on your computer.</li>
                          <li>Connect your microcontroller board to your computer using a USB cable.</li>
                          <li>Copy the code below, paste it into the editor window, and click the <strong>Upload</strong> button (the right arrow icon).</li>
                        </ol>
                      )}
                    </div>

                    {/* Code Box */}
                    <div className="bg-slate-950 text-slate-100 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
                      {/* Code Header Bar */}
                      <div className="bg-slate-900 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-rose-500" />
                          <div className="w-3 h-3 rounded-full bg-amber-500" />
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="ml-3 font-mono text-xs text-slate-400">
                            {isFlightController 
                              ? `${project.title.replace(/\s+/g, '')}_CLI.txt`
                              : `${project.title.replace(/\s+/g, '')}.ino`}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                          {isFlightController ? "Betaflight / CLI" : "C++ / Arduino"}
                        </span>
                      </div>

                      {/* Code text */}
                      <div className="p-6 font-mono text-xs overflow-x-auto leading-relaxed max-h-[550px] scrollbar-thin">
                        <pre className="text-slate-200">
                          <code>{project.arduinoCode || "// Code is being prepared for this project."}</code>
                        </pre>
                      </div>
                    </div>

                    {project.codeNote && (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">{project.codeNote}</p>
                      </div>
                    )}
                  </div>
                );
          })(),
        }]
      : []),
    {
      id: "stores",
      ...covers.stores,
      layout: "wide",
      children: (() => {
            const storeBundles = getStoreBundlesForProject(project);
            const storePricing = getStorePricingForProject(project);

            return (
              <div className="space-y-10">
                <div className="space-y-2">
                  <span className="text-brand-600 font-extrabold text-xs uppercase tracking-wider">
                    Verified Store Pricing &amp; Stock
                  </span>
                  <h3 className="text-2xl font-extrabold text-slate-900">Where to Buy Parts in India</h3>
                  <p className="text-slate-600 text-sm">
                    Compare verified online hobby stores with direct links and estimated delivery times in Indian Rupees (₹) for all {project.bom?.length || 0} required components.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {storeBundles.map((store) => (
                    <div
                      key={store.id}
                      className={`bg-white rounded-3xl p-6 border shadow-subtle space-y-4 flex flex-col justify-between transition-all hover:shadow-lift ${
                        store.isTopStock ? "border-brand-500 ring-2 ring-brand-500/20" : "border-[#E8E2D9]"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-1">
                          {store.badge && (
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full truncate ${
                              store.isTopStock ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-700"
                            }`}>
                              {store.badge}
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-500 shrink-0">★ {store.rating}</span>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <h4 className="text-xl font-extrabold text-slate-900">{store.name}</h4>
                          <a
                            href={store.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-brand-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>Visit</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div className={`text-xs font-semibold ${store.availableParts === store.totalParts ? "text-emerald-600" : "text-amber-600"}`}>
                          ✓ {store.availableParts} / {store.totalParts} Parts Available
                        </div>

                        <div className="text-2xl font-extrabold text-slate-900">
                          {store.partsCost}
                          <span className="text-xs font-medium text-slate-400 ml-1">total kit est.</span>
                        </div>

                        <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                          <div>🚚 {store.shippingSpeed}</div>
                          <div>📦 {store.freeShippingThreshold}</div>
                          {store.missingItem && (
                            <div className="text-amber-600 text-[11px] pt-1">⚠️ {store.missingItem}</div>
                          )}
                        </div>
                      </div>

                      <a
                        href={store.checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs text-center transition-colors block"
                      >
                        Browse on {store.name}
                      </a>
                    </div>
                  ))}
                </div>

                {/* Granular Component Availability Table */}
                {storePricing.length > 0 && (
                  <div className="space-y-6 pt-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-brand-600 font-extrabold text-xs uppercase tracking-wider">
                          Component Price Comparison
                        </span>
                        <h4 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                          Compare Prices for {project.title} Components (INR ₹)
                        </h4>
                        <p className="text-sm text-slate-600">
                          Check prices and direct store search links for every part in {project.title} across 4 major Indian electronics stores.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-[#E8E2D9] overflow-hidden shadow-subtle">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-[#FAF7F2] border-b border-[#E8E2D9] text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                            <tr>
                              <th className="py-4 px-6 min-w-[200px]">Part Name &amp; Spec</th>
                              <th className="py-4 px-4">Part Code</th>
                              <th className="py-4 px-4">Qty</th>
                              <th className="py-4 px-5">
                                <a
                                  href="https://robu.in/"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-slate-900 hover:text-brand-600 font-extrabold"
                                >
                                  <span>Robu.in</span>
                                  <ExternalLink className="w-3 h-3 text-brand-500" />
                                </a>
                              </th>
                              <th className="py-4 px-5">
                                <a
                                  href="https://quartzcomponents.com/"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-slate-900 hover:text-brand-600 font-extrabold"
                                >
                                  <span>Quartz</span>
                                  <ExternalLink className="w-3 h-3 text-brand-500" />
                                </a>
                              </th>
                              <th className="py-4 px-5">
                                <a
                                  href="https://robocraze.com/"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-slate-900 hover:text-brand-600 font-extrabold"
                                >
                                  <span>Robocraze</span>
                                  <ExternalLink className="w-3 h-3 text-brand-500" />
                                </a>
                              </th>
                              <th className="py-4 px-5">
                                <a
                                  href="https://zbotic.in/"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-slate-900 hover:text-brand-600 font-extrabold"
                                >
                                  <span>Zbotic</span>
                                  <ExternalLink className="w-3 h-3 text-brand-500" />
                                </a>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E8E2D9]">
                            {storePricing.map((item, i) => (
                              <tr key={i} className="hover:bg-brand-50/30 transition-colors">
                                <td className="py-4 px-6">
                                  <div className="font-extrabold text-slate-900">{item.partName}</div>
                                  {item.spec && (
                                    <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{item.spec}</div>
                                  )}
                                </td>
                                <td className="py-4 px-4 font-mono text-xs text-slate-500">{item.sku}</td>
                                <td className="py-4 px-4 font-bold text-xs text-slate-700">{item.qty || 1}x</td>

                                {/* Robu.in */}
                                <td className="py-4 px-5">
                                  <a
                                    href={item.robu.url || "https://robu.in/"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group block hover:text-brand-600"
                                  >
                                    <div className="font-extrabold text-slate-900 group-hover:text-brand-600 inline-flex items-center gap-1">
                                      <span>{item.robu.price}</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="text-[11px] font-semibold text-emerald-600">{item.robu.stockNote}</div>
                                  </a>
                                </td>

                                {/* Quartz Components */}
                                <td className="py-4 px-5">
                                  <a
                                    href={item.quartz.url || "https://quartzcomponents.com/"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group block hover:text-brand-600"
                                  >
                                    <div className="font-extrabold text-slate-900 group-hover:text-brand-600 inline-flex items-center gap-1">
                                      <span>{item.quartz.price}</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="text-[11px] font-semibold text-emerald-600">{item.quartz.stockNote}</div>
                                  </a>
                                </td>

                                {/* Robocraze */}
                                <td className="py-4 px-5">
                                  <a
                                    href={item.robocraze.url || "https://robocraze.com/"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group block hover:text-brand-600"
                                  >
                                    <div className="font-extrabold text-slate-900 group-hover:text-brand-600 inline-flex items-center gap-1">
                                      <span>{item.robocraze.price}</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className={`text-[11px] font-semibold ${item.robocraze.inStock ? "text-emerald-600" : "text-rose-600"}`}>
                                      {item.robocraze.stockNote}
                                    </div>
                                  </a>
                                </td>

                                {/* Zbotic */}
                                <td className="py-4 px-5">
                                  <a
                                    href={item.zbotic.url || "https://zbotic.in/"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group block hover:text-brand-600"
                                  >
                                    <div className="font-extrabold text-slate-900 group-hover:text-brand-600 inline-flex items-center gap-1">
                                      <span>{item.zbotic.price}</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className={`text-[11px] font-semibold ${item.zbotic.inStock ? "text-emerald-600" : "text-rose-600"}`}>
                                      {item.zbotic.stockNote}
                                    </div>
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
      })(),
    },
    ...(project.faqs && project.faqs.length > 0
      ? [{
          id: "faq" as const,
          ...covers.faq,
          children: (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-extrabold text-slate-900">Frequently Asked Questions &amp; Troubleshooting</h3>
                    <p className="text-slate-600 text-sm">
                      Got stuck while building? Here are beginner-friendly answers to the most common questions and troubleshooting tips.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {(project.faqs && project.faqs.length > 0 ? project.faqs : [
                      {
                        q: "What should I do if the robot does not turn on?",
                        a: "Check that the battery is fully charged and that the power switch is in the ON position. Make sure positive (+) and negative (-) wires are connected tightly and not reversed."
                      },
                      {
                        q: "Why do the motors spin in the opposite direction?",
                        a: "DC motor direction depends on which way current flows. Simply swap the two motor wires connected to the motor driver terminals to reverse direction."
                      },
                      {
                        q: "Can I power the motors directly from the computer USB cable?",
                        a: "No. Computer USB ports only supply small amounts of current (around 0.5 Amps). Motors and solenoids require higher battery current to work without crashing the controller."
                      }
                    ]).map((faq, idx) => {
                      const isOpen = openFaq === idx;
                      return (
                        <div
                          key={idx}
                          className="bg-white rounded-3xl border border-[#E8E2D9] overflow-hidden shadow-subtle transition-all"
                        >
                          <button
                            onClick={() => setOpenFaq(isOpen ? null : idx)}
                            className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-brand-600 transition-colors"
                          >
                            <span className="text-base sm:text-lg">{faq.q}</span>
                            {isOpen ? (
                              <ChevronUp className="w-5 h-5 text-brand-600 shrink-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="px-6 pb-6 pt-1 text-slate-600 text-sm leading-relaxed border-t border-slate-100 bg-[#FAF7F2]/40">
                              {faq.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {project.tips && project.tips.length > 0 && (
                    <div className="bg-white rounded-3xl border border-[#E8E2D9] p-6 shadow-subtle space-y-4">
                      <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-500" />
                        <span>Important Project Tips &amp; Safety</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                        {project.tips.map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8E2D9]">
                            <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1" />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
          ),
        }]
      : []),
  ];

  const journey = (
    <ProjectJourney
      chapters={chapters}
      stage={stageDataFor(project)}
      completedSteps={completedSteps}
      stepNumbers={project.steps?.map((st) => st.stepNumber)}
    />
  );
  return kit ? <KitProvider kit={kit}>{journey}</KitProvider> : journey;
}
