import type { Project } from "@/data/projects";
import { getStoreBundlesForProject } from "@/data/stores";
import { getProject3DConfig } from "@/data/projects3D";
import type { StageData, StationKind } from "./stage";

const LOCAL_MODELS = ["line-follower", "drone-explorer", "robotic-arm", "robosoccer", "robomaze", "smart-agro-rover", "balancebot-pro", "vision-sorter"];

/* What the 3D stations show for a project, taken straight from its data. */
export function stageDataFor(project: Project): Omit<StageData, "kinds"> {
  const stores = getStoreBundlesForProject(project);
  return {
    // the Line Follower, drone and arm use their detailed, fully assembled models; other projects load their own file
    modelUrl: LOCAL_MODELS.includes(project.slug) ? undefined : getProject3DConfig(project.slug).modelUrl,
    localModel: LOCAL_MODELS.includes(project.slug) ? (project.slug as NonNullable<StageData["localModel"]>) : undefined,
    bomCategories: (project.bom ?? []).map((b) => b.category),
    bomParts: (project.bom ?? []).map((b) => ({ name: b.name, category: b.category, qty: b.qty })),
    wireColors: (project.pinout ?? []).map((p) => p.wireColor),
    wiring: (project.pinout ?? []).map((p) => ({ from: p.componentPin, to: p.targetPin, color: p.wireColor })),
    controller: project.microcontroller,
    pinCount: project.pinout?.length ?? 0,
    stepCount: project.steps?.length ?? 0,
    stepTitles: (project.steps ?? []).map((s) => s.title),
    codeLines: (project.arduinoCode ?? "").split("\n"),
    storeParts: stores.map((s) => s.availableParts),
    topStore: stores.findIndex((s) => s.isTopStock),
    storeList: stores.map((s) => ({ name: s.name, cost: s.partsCost, available: s.availableParts, total: s.totalParts, missing: s.missingItem, top: !!s.isTopStock })),
  };
}

export const isFlightControllerProject = (project: Project) =>
  project.slug === "drone-explorer" ||
  project.microcontroller.toLowerCase().includes("flight controller") ||
  project.category === "Aerial Robotics";

/* Chapter covers: the short title shown beside the 3D world as each chapter opens. */
export function chapterCovers(project: Project): Record<Exclude<StationKind, "overview" | "intro">, { label: string; title: string; lede: string }> {
  const parts = project.bom?.length ?? 0;
  const pins = project.pinout?.length ?? 0;
  const steps = project.steps?.length ?? 0;
  const flight = isFlightControllerProject(project);
  return {
    bom: {
      label: "Parts List (BOM)",
      title: "Every part, laid out.",
      lede: parts
        ? `The ${parts} parts that make the ${project.title}, with what each one is and why the robot needs it.`
        : `The parts that make the ${project.title}, with what each one is and why the robot needs it.`,
    },
    wiring: {
      label: "Wiring Diagram",
      title: "Follow every wire.",
      lede: "A color-coded map of how the controller, driver, sensors and battery connect.",
    },
    pinout: {
      label: "Pin Connections",
      title: "Where each wire lands.",
      lede: pins
        ? `${pins} connections on the ${project.microcontroller}, and what each pin does. Point at a row to light it up.`
        : `Which pin on the ${project.microcontroller} does what.`,
    },
    steps: {
      label: "Build Steps",
      title: "Build it, one step at a time.",
      lede: steps
        ? `${steps} steps from a bare chassis to a working robot. Check each one off as you finish it.`
        : "From a bare chassis to a working robot, one step at a time.",
    },
    view3d: {
      label: "3D View",
      title: "Turn it around. Look inside.",
      lede: "The finished robot in 3D. Drag to rotate, zoom in, and tap any part to see what it is.",
    },
    code: {
      label: "Program Code",
      title: flight ? "Set up the flight controller." : "Give it a brain.",
      lede: flight
        ? "The ready-made configuration, with copy and download, and how to apply it."
        : "The complete, ready-to-upload program, with copy and download, and how to upload it.",
    },
    stores: {
      label: "Where to Buy",
      title: "Get the parts.",
      lede: "Compare Indian electronics stores for every component, with prices and direct links.",
    },
    faq: {
      label: "FAQ & Tips",
      title: "Questions, answered.",
      lede: "Quick fixes for the problems beginners run into most often.",
    },
  };
}
