"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PROJECTS } from "@/data/projects";
import { getStoreBundlesForProject, getStorePricingForProject } from "@/data/stores";
import { 
  CheckCircle2, 
  Circle, 
  Copy, 
  Check, 
  Download, 
  Wrench, 
  Cpu, 
  Clock, 
  AlertTriangle, 
  ChevronRight, 
  ArrowRight, 
  ExternalLink, 
  HelpCircle, 
  Sparkles, 
  Layers, 
  Code2, 
  ListChecks, 
  ShoppingCart, 
  ChevronDown, 
  ChevronUp, 
  Box, 
  FileCode2, 
  Info 
} from "lucide-react";
import { DiagramViewer } from "@/components/DiagramViewer";
import { Project3DComparison } from "@/components/Project3DComparison";
import { ProjectBomSection } from "@/components/ProjectBomSection";
import { ProjectJourney, JourneyLink } from "@/components/journey/ProjectJourney";
import type { JourneyChapter } from "@/components/journey/ProjectJourney";
import { chapterCovers, stageDataFor } from "@/components/journey/chapters";
import { LineFollowerPartsChapter } from "@/components/workshop/PartsExplorer";
import { AssembledShowcase } from "@/components/workshop/AssembledShowcase";
import { WiringExplorer } from "@/components/workshop/WiringExplorer";
import { StepGuide } from "@/components/workshop/StepGuide";
import { BuildIntro } from "@/components/workshop/BuildIntro";

export default function LineFollowerDetailPage() {
  const project = PROJECTS.find((p) => p.slug === "line-follower")!;

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [codeCopied, setCodeCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [introOpen, setIntroOpen] = useState(false);

  const toggleBomItem = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // steps marked as done are kept for this browser session (only ever set by "Mark as Done")
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("lf:completed-steps") || "{}");
      if (saved && typeof saved === "object") setCompletedSteps(saved);
    } catch { /* storage unavailable */ }
  }, []);

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps((prev) => {
      const next = { ...prev, [stepNumber]: !prev[stepNumber] };
      try { sessionStorage.setItem("lf:completed-steps", JSON.stringify(next)); } catch { /* storage unavailable */ }
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
    const element = document.createElement("a");
    const file = new Blob([project.arduinoCode || ""], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "RoboNest_LineFollower.ino";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const completedStepsCount = Object.values(completedSteps).filter(Boolean).length;
  const totalSteps = project.steps?.length || 14;
  const progressPercent = Math.round((completedStepsCount / totalSteps) * 100);

  const covers = chapterCovers(project);

  /* the opening is the journey's first chapter: copy on the left, the 3D world on the right */
  const hero = (
    <div className="journey-beat min-h-[calc(100svh-5rem)] flex flex-col pt-8 pb-12 lg:pb-16">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 lg:pr-24 flex-1 flex flex-col space-y-6">
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/" className="hover:text-brand-600 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/projects" className="hover:text-brand-600 transition-colors">Projects</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-brand-600 font-bold">Line Follower Bot</span>
        </nav>

        <div className="flex-1 flex items-end lg:items-center pt-[34svh] lg:pt-0">
        <div className="lg:w-[56%] space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-brand-500 text-white font-extrabold text-xs tracking-wider uppercase">
              Great For Beginners
            </span>
            <span className="px-3 py-1 rounded-full bg-brand-100 text-brand-800 font-bold text-xs">
              Autonomous Driving
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> ~4 Hours to Build
            </span>
          </div>

          <h1 id="overview-title" className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Line Follower Bot
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
            A small two-wheeled robot that follows a black line on the floor. It uses light sensors to look at the ground and steers its motors to stay on track.
          </p>

          {/* Quick specs pill row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white rounded-2xl p-3 border border-[#E8E2D9] shadow-subtle">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Controller</div>
              <div className="text-xs font-bold text-slate-800 truncate">Arduino Uno (the brain)</div>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-[#E8E2D9] shadow-subtle">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Sensors</div>
              <div className="text-xs font-bold text-slate-800 truncate">2x Light Sensors</div>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-[#E8E2D9] shadow-subtle">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Motors</div>
              <div className="text-xs font-bold text-slate-800 truncate">2x Gear Motors</div>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-[#E8E2D9] shadow-subtle">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Battery</div>
              <div className="text-xs font-bold text-slate-800 truncate">7.4V Rechargeable Pack</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap gap-3">
            {/* opens the full-window intro (complete robot → exploded view), which then leads into the Build Steps */}
            <button
              type="button"
              onClick={() => setIntroOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-md transition-colors"
            >
              <ListChecks className="w-4 h-4" />
              <span>Start Step-by-Step Guide</span>
            </button>
            <BuildIntro project={project} open={introOpen} onClose={() => setIntroOpen(false)} />

            <JourneyLink
              to="code"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white hover:bg-brand-50 border border-brand-200 text-brand-700 font-bold text-sm shadow-sm transition-colors"
            >
              <Code2 className="w-4 h-4 text-brand-500" />
              <span>View Program Code</span>
            </JourneyLink>

            <Link
              href="/assistant"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-brand-100 hover:bg-brand-200 text-brand-800 font-bold text-sm transition-colors"
            >
              <Wrench className="w-4 h-4 text-brand-600" />
              <span>Ask the Assistant</span>
            </Link>

            <Link
              href="/projects/line-follower/journey"
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

  const chapters: JourneyChapter[] = [
    {
      id: "overview",
      label: "Overview",
      beat: hero,
      children: (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-8 border border-[#E8E2D9] shadow-subtle space-y-4">
                <h3 className="text-2xl font-extrabold text-slate-900">What Is This Robot?</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  A small two-wheeled robot that can follow a black line on the floor. It drives completely on its own without needing a remote control.
                </p>
                  
                <h4 className="text-lg font-bold text-slate-900 pt-2">How Does It Work in Simple Terms?</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Two light sensors point down at the floor from the front of the robot. The white floor reflects light back, while the black tape absorbs the light.
                </p>
                <p className="text-slate-600 text-sm leading-relaxed">
                  When both sensors see white floor, the robot drives straight ahead. When one sensor sees the black tape, the controller knows the robot is drifting off path, and it immediately slows down that wheel to turn the robot back onto the line.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-[#E8E2D9] shadow-subtle space-y-4">
                <h3 className="text-xl font-extrabold text-slate-900">What You Will Learn</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-brand-50/60 border border-brand-100">
                    <CheckCircle2 className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">How to Control Motors</div>
                      <div className="text-[11px] text-slate-600">Learn how electric signals make wheels go forward, backward, and turn.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-brand-50/60 border border-brand-100">
                    <CheckCircle2 className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">How Sensors Work</div>
                      <div className="text-[11px] text-slate-600">Discover how light sensors see the floor and send signals to the computer.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-brand-50/60 border border-brand-100">
                    <CheckCircle2 className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">How to Program a Robot</div>
                      <div className="text-[11px] text-slate-600">Upload simple code that tells the robot what to do when it sees the line.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-brand-50/60 border border-brand-100">
                    <CheckCircle2 className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Safe Wiring Skills</div>
                      <div className="text-[11px] text-slate-600">Connect batteries and boards together correctly without loose wires or short circuits.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Quick Cards */}
            <div className="space-y-6">
              <div className="relative">
                <div className="relative w-full h-[300px] rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-brand-100">
                  <Image
                    src={project.image}
                    alt="Line Follower Bot Complete Hardware"
                    fill
                    priority
                    className="object-cover object-center"
                    unoptimized
                  />
                
                  {/* Hotspot 1: Front IR Sensors */}
                  <div className="absolute top-[28%] left-[24%] group">
                    <div className="w-6 h-6 rounded-full bg-brand-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-lg animate-pulse cursor-pointer">
                      1
                    </div>
                    <div className="hidden group-hover:block absolute bottom-8 left-1/2 -translate-x-1/2 w-48 bg-slate-900/95 backdrop-blur-md text-white text-xs p-2.5 rounded-xl shadow-2xl z-20 pointer-events-none">
                      <div className="font-bold text-brand-300">Front Light Sensors</div>
                      <div className="text-[11px] text-slate-300">Points down to see the black line on the floor.</div>
                    </div>
                  </div>

                  {/* Hotspot 2: Microcontroller & Driver */}
                  <div className="absolute top-[52%] left-[55%] group">
                    <div className="w-6 h-6 rounded-full bg-brand-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-lg animate-pulse cursor-pointer">
                      2
                    </div>
                    <div className="hidden group-hover:block absolute bottom-8 left-1/2 -translate-x-1/2 w-52 bg-slate-900/95 backdrop-blur-md text-white text-xs p-2.5 rounded-xl shadow-2xl z-20 pointer-events-none">
                      <div className="font-bold text-brand-300">Controller &amp; Motor Board</div>
                      <div className="text-[11px] text-slate-300">The Arduino computer tells the motor board how to steer.</div>
                    </div>
                  </div>

                  {/* Bottom image pill */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#E8E2D9] flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Assembled Robot Platform
                    </span>
                    <span className="text-slate-500 font-medium">Ready to Build</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] shadow-subtle space-y-4">
                <h4 className="font-extrabold text-slate-900 text-base">Your Build Progress</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">Steps Finished</span>
                    <span className="text-brand-600">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className="h-full bg-brand-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {completedStepsCount} of {totalSteps} steps completed
                  </div>
                </div>
                <JourneyLink
                  to="steps"
                  className="w-full py-2.5 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-500 hover:text-white font-bold text-xs transition-colors"
                >
                  Open Build Steps
                </JourneyLink>
              </div>

              <div className="bg-brand-500 text-white rounded-3xl p-6 shadow-md space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-100 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" /> Helpful Tip for Beginners
                </div>
                <p className="text-xs text-brand-50 leading-relaxed">
                  Always connect the black ground wire between the Arduino and the motor driver board so both boards share the same power reference.
                </p>
                <Link
                  href="/assistant"
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white underline pt-1"
                >
                  <span>Need help? Ask the Build Assistant</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "bom",
      ...covers.bom,
      badge: project.bom?.length ? String(project.bom.length) : undefined,
      layout: "wide",
      children: (
        <LineFollowerPartsChapter project={project} />
      ),
    },
    {
      id: "wiring",
      ...covers.wiring,
      layout: "wide",
      children: (
        <div className="space-y-8">
          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-slate-900">Wiring Connections</h3>
            <p className="text-slate-600 text-sm">
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
                <div className="font-extrabold text-blue-900 mb-0.5">5V (Power)</div>
                <div>Provides 5-volt electrical power to turn on the sensors.</div>
              </div>
              <div className="p-3 bg-white/80 rounded-2xl border border-blue-100">
                <div className="font-extrabold text-blue-900 mb-0.5">GND (Ground)</div>
                <div>The return path for electricity. All boards must share GND.</div>
              </div>
              <div className="p-3 bg-white/80 rounded-2xl border border-blue-100">
                <div className="font-extrabold text-blue-900 mb-0.5">D2 &amp; D4 (Signals)</div>
                <div>Pins that listen to what the left and right sensors see.</div>
              </div>
              <div className="p-3 bg-white/80 rounded-2xl border border-blue-100">
                <div className="font-extrabold text-blue-900 mb-0.5">D5 &amp; D6 (Speed)</div>
                <div>Special pins that control how fast the left and right wheels turn.</div>
              </div>
            </div>
          </div>

          <WiringExplorer project={project} />

          {/* External Wiring Schematic Diagram */}
          <DiagramViewer
            src={project.wiringImage || "/robotics/wiring/line-follower/line-follower-wirring.jpeg"}
            title="Line Follower Color-Coded Wiring Diagram"
            type="wiring"
            slug="line-follower"
          />

          {/* Ground Rule Callout */}
          <div className="rounded-3xl bg-amber-50 border-2 border-amber-200 p-6 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-amber-900 text-sm">Important: Connect the Shared Ground Wire</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Make sure to connect a black wire between the <strong>L298N GND</strong> terminal and an <strong>Arduino GND</strong> pin. Without this wire, signals cannot travel between the boards and the motors will not work properly.
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
            <h3 className="text-2xl font-extrabold text-slate-900">Pin Connections Table</h3>
            <p className="text-slate-600 text-sm">
              Pins are the small connection points on the controller. Each component uses specific pins to send power or information.
            </p>
          </div>

          {/* Pinout Table */}
          <div className="bg-white rounded-3xl border border-[#E8E2D9] overflow-hidden shadow-subtle">
            <div className="p-6 border-b border-[#E8E2D9] flex items-center justify-between">
              <span className="font-extrabold text-slate-900 text-base">Where Each Wire Goes</span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-100 text-brand-800">
                Color-Coded Guide
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
                  {project.pinout?.map((pin, i) => (
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
        </div>
      ),
    },
    {
      id: "steps",
      ...covers.steps,
      layout: "wide",
      badge: `${completedStepsCount}/${totalSteps}`,
      children: (
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
                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          {/* every step, in its original order, with its 3D view */}
          <StepGuide project={project} completedSteps={completedSteps} onToggleStep={toggleStep} />
        </div>
      ),
    },
    {
      id: "view3d",
      ...covers.view3d,
      layout: "wide",
      children: (
        <Project3DComparison
          slug="line-follower"
          title={project.title}
          realImage={project.realImage}
          description="The finished robot, fully assembled. Drag to turn it around, scroll or pinch to zoom, and tap any part to see what it does."
          viewer={<AssembledShowcase project={project} />}
        />
      ),
    },
    {
      id: "code",
      ...covers.code,
      children: (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900">Arduino Program Code</h3>
              <p className="text-slate-600 text-sm">
                Upload this program to your Arduino using your computer and the free Arduino app.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyCodeToClipboard}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-sm transition-colors"
              >
                {codeCopied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{codeCopied ? "Copied!" : "Copy Code"}</span>
              </button>
              <button
                onClick={downloadIno}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-brand-50 border border-brand-200 text-brand-700 font-bold text-xs shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download .ino File</span>
              </button>
            </div>
          </div>

          {/* Beginner Explanation Card */}
          <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D9] text-xs text-slate-700 space-y-2">
            <div className="font-bold text-slate-900 text-sm">How to Upload This Code:</div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Download and open the free <strong>Arduino IDE</strong> on your computer.</li>
              <li>Connect the Arduino to your computer using a USB cable.</li>
              <li>Copy the code below, paste it into the Arduino window, and click the <strong>Upload</strong> button (the arrow icon).</li>
            </ol>
          </div>

          {/* Code Box */}
          <div className="bg-slate-950 text-slate-100 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            {/* Code Header Bar */}
            <div className="bg-slate-900 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-3 font-mono text-xs text-slate-400">LineFollower.ino</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">Arduino C++</span>
            </div>

            {/* Code text */}
            <div className="p-6 font-mono text-xs overflow-x-auto leading-relaxed max-h-[550px] scrollbar-thin">
              <pre className="text-slate-200">
                <code>{project.arduinoCode}</code>
              </pre>
            </div>
          </div>
        </div>
      ),
    },
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
                    className="w-full py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs text-center transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>Open Store on {store.name}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
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
                      Check prices and stock levels for every part in {project.title} across 4 major Indian electronics stores.
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
    {
      id: "faq",
      ...covers.faq,
      children: (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="text-center space-y-2 mb-8">
            <h3 className="text-2xl font-extrabold text-slate-900">Frequently Asked Questions</h3>
            <p className="text-slate-600 text-sm">
              Simple answers to common beginner questions.
            </p>
          </div>

          {[
            {
              q: "Why does my robot spin in circles when turned on?",
              a: "One motor is connected backward. Turn the battery switch off, swap the two wires for that motor on the green terminal, and turn the power back on."
            },
            {
              q: "Can I use a regular 9V rectangular battery?",
              a: "No. Standard rectangular 9V alkaline batteries cannot provide enough power for electric motors. The Arduino will restart repeatedly. Use two rechargeable 18650 batteries (7.4V) instead."
            },
            {
              q: "What kind of black tape should I use for the track?",
              a: "Use standard 1-inch black electrical tape on white cardboard or poster board. Avoid shiny or glossy tape because bright room lights can bounce off it and confuse the sensors."
            },
            {
              q: "What should I do if the robot drives off the line?",
              a: "Check that both sensor lights switch on over white paper and turn off over black tape. If needed, turn the tiny blue dial on the sensor board with a small screwdriver until it switches reliably."
            }
          ].map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="bg-white rounded-2xl border border-[#E8E2D9] overflow-hidden shadow-subtle">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left font-extrabold text-slate-900 text-sm flex items-center justify-between gap-4 hover:bg-brand-50/50 transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-brand-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ),
    },
  ];

  return (
    <div className="pb-24">
      <ProjectJourney
        chapters={chapters}
        stage={stageDataFor(project)}
        completedSteps={completedSteps}
        stepNumbers={project.steps?.map((st) => st.stepNumber)}
      />

      {/* 4. FOOTER CALLOUT BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1">
            <span className="text-brand-400 font-bold text-xs uppercase tracking-wider">Ready for the Next Challenge?</span>
            <h4 className="text-2xl font-extrabold">Finished Your Line Follower?</h4>
            <p className="text-sm text-slate-300 max-w-xl">
              Now that you understand motors, sensors, and controllers, explore our other projects like the RoboMaze Solver or the Robotic Arm.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link
              href="/projects"
              className="px-6 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md transition-colors"
            >
              Browse More Robots
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
