import type { WorkshopKit } from "./kit";
import { DASH, KIND_LABEL, WIDTH, strokeCss } from "./wiringStyle";
import {
  PARTS, CONNECTIONS, STEP_VISUALS, STEP_HELP, PART_GUIDE, CONNECTION_LEVEL, OPEN_QUESTIONS, TOOLS, INSTALLED_AT,
} from "./droneData";
import type { KitConnection } from "./kit";

/* The Drone Explorer Quad's workshop kit: its data (droneData.ts), its model (droneModel.ts) and its circuit
   diagram, in the shape the shared workshop components read. */

/* ---------- circuit diagram (SVG): front at the top, motors at their corners, the stack in the middle ---------- */
type P = { x: number; y: number };
const PINS: Record<string, P> = {
  // motors (inner corner of each box)
  "m4.w": { x: 130, y: 62 }, "m1.w": { x: 510, y: 62 }, "m3.w": { x: 130, y: 330 }, "m2.w": { x: 510, y: 330 },
  // 4-in-1 ESC: motor pads on its corners, harness on the top edge, power pads on the bottom edge
  "esc.m4": { x: 250, y: 222 }, "esc.m1": { x: 390, y: 222 }, "esc.m3": { x: 250, y: 300 }, "esc.m2": { x: 390, y: 300 },
  "esc.s1": { x: 270, y: 200 }, "esc.s2": { x: 295, y: 200 }, "esc.s3": { x: 320, y: 200 }, "esc.s4": { x: 345, y: 200 }, "esc.vbat": { x: 370, y: 200 },
  "esc.bat+": { x: 345, y: 322 }, "esc.bat-": { x: 295, y: 322 },
  // flight controller: harness on the bottom edge, UART1 + power on the left edge
  "fc.s1": { x: 270, y: 150 }, "fc.s2": { x: 295, y: 150 }, "fc.s3": { x: 320, y: 150 }, "fc.s4": { x: 345, y: 150 }, "fc.vbat": { x: 370, y: 150 },
  "fc.rx1": { x: 250, y: 78 }, "fc.tx1": { x: 250, y: 94 }, "fc.5v": { x: 250, y: 110 }, "fc.gnd": { x: 250, y: 126 },
  // receiver (right edge)
  "rx.tx": { x: 150, y: 150 }, "rx.rx": { x: 150, y: 166 }, "rx.5v": { x: 150, y: 182 }, "rx.gnd": { x: 150, y: 198 },
  // power lead and battery
  "lead.pos": { x: 345, y: 358 }, "lead.neg": { x: 295, y: 358 }, "lead.xt": { x: 250, y: 388 }, "lipo.lead": { x: 180, y: 396 },
};
const PIN_TEXT: Record<string, string> = {
  "m1.w": "", "m2.w": "", "m3.w": "", "m4.w": "",
  "esc.m1": "M1", "esc.m2": "M2", "esc.m3": "M3", "esc.m4": "M4",
  "esc.s1": "S1", "esc.s2": "S2", "esc.s3": "S3", "esc.s4": "S4", "esc.vbat": "VBAT", "esc.bat+": "+", "esc.bat-": "−",
  "fc.s1": "S1", "fc.s2": "S2", "fc.s3": "S3", "fc.s4": "S4", "fc.vbat": "VBAT",
  "fc.rx1": "RX1", "fc.tx1": "TX1", "fc.5v": "5V", "fc.gnd": "GND",
  "rx.tx": "TX", "rx.rx": "RX", "rx.5v": "5V", "rx.gnd": "GND",
  "lead.pos": "", "lead.neg": "", "lead.xt": "", "lipo.lead": "XT60",
};

function route(c: KitConnection): string {
  const a = PINS[c.from.terminal], b = PINS[c.to.terminal];
  if (c.kind === "Motor") { const x = a.x < 320 ? 205 : 435; return `M${a.x} ${a.y} H${x} V${b.y} H${b.x}`; }
  if (c.from.part === "receiver") { const lane = 170 + ["rx.tx", "rx.rx", "rx.5v", "rx.gnd"].indexOf(c.from.terminal) * 8; return `M${a.x} ${a.y} H${lane} V${b.y} H${b.x}`; }
  if (c.id === "c-batt") return `M${a.x} ${a.y} H${b.x}`;
  return `M${a.x} ${a.y} V${b.y}`;     // harness and power lead: straight between the stacked boards
}

function DroneDiagram({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  // ty: where the title sits (boards with pins along their top edge carry it lower down)
  const box = (x: number, y: number, w: number, h: number, title: string, sub: string, fill: string, ty = 19, tx = 10) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} stroke="#1f2937" strokeOpacity={0.15} />
      <text x={x + tx} y={y + ty} fontSize={11.5} fontWeight={800} fill="#ffffff">{title}</text>
      <text x={x + tx} y={y + ty + 13} fontSize={8.5} fontWeight={600} fill="#ffffff" opacity={0.85}>{sub}</text>
    </g>
  );
  const labelAt = (k: string, p: P) => {
    const t = PIN_TEXT[k];
    if (!t) return null;
    const right = k.startsWith("fc.rx") || k.startsWith("fc.tx") || k === "fc.5v" || k === "fc.gnd" || k === "lead.xt";
    const below = k.startsWith("esc.s") || k === "esc.vbat";
    const above = k.startsWith("fc.s") || k === "fc.vbat" || k === "esc.bat+" || k === "esc.bat-";
    const under = k === "lead.pos" || k === "lead.neg";
    const corner = k.startsWith("esc.m");
    return (
      <text x={right ? p.x + 7 : below || above || under ? p.x : corner ? p.x + (p.x < 320 ? 7 : -7) : p.x - 7}
        y={below ? p.y + 14 : above ? p.y - 8 : under ? p.y + 15 : corner ? p.y + (p.y < 260 ? 14 : -7) : p.y + 3.5}
        fontSize={9} fontWeight={700} textAnchor={right ? "start" : below || above || under ? "middle" : corner ? (p.x < 320 ? "start" : "end") : "end"}
        fill="#ffffff">{t}</text>
    );
  };
  return (
    <svg viewBox="0 0 640 430" className="w-full h-auto" role="img" aria-label="Circuit diagram of the Drone Explorer Quad wiring">
      <rect x={0} y={0} width={640} height={430} fill="#FBF8F3" />
      <text x={320} y={20} fontSize={10} fontWeight={800} fill="#94a3b8" textAnchor="middle">▲ FRONT</text>
      {box(20, 30, 110, 56, "Motor 4", "front left", "#3a3f46")}
      {box(510, 30, 110, 56, "Motor 1", "front right", "#3a3f46")}
      {box(20, 300, 110, 56, "Motor 3", "rear left", "#3a3f46")}
      {box(510, 300, 110, 56, "Motor 2", "rear right", "#3a3f46")}
      {box(250, 34, 140, 116, "SpeedyBee F405", "flight controller", "#1d2229", 18, 42)}
      {box(250, 200, 140, 122, "4-in-1 ESC", "drives all four motors", "#2c3138", 58, 26)}
      {box(30, 132, 120, 80, "ELRS receiver", "radio link, UART1", "#1c3d6b")}
      {box(250, 358, 140, 50, "Power lead", "XT60 + capacitor", "#b8921c", 30)}
      {box(40, 372, 140, 46, "LiPo battery", "", "#d2572c")}
      {CONNECTIONS.map((c) => {
        const on = selected === c.id, dim = !!selected && !on;
        return (
          <g key={c.id} onClick={() => onSelect(on ? null : c.id)} style={{ cursor: "pointer" }} opacity={dim ? 0.18 : 1}>
            <title>{`${c.from.name} → ${c.to.name} (${KIND_LABEL[c.kind]})`}</title>
            <path d={route(c)} fill="none" stroke="#ffffff" strokeWidth={WIDTH[c.kind] + 3} strokeLinejoin="round" />
            <path d={route(c)} fill="none" stroke={strokeCss(c.color)} strokeWidth={on ? WIDTH[c.kind] + 1.6 : WIDTH[c.kind]} strokeDasharray={DASH[c.kind]} strokeLinejoin="round" />
            <path d={route(c)} fill="none" stroke="transparent" strokeWidth={12} />
          </g>
        );
      })}
      {Object.entries(PINS).map(([k, p]) => (
        <g key={k}>
          <circle cx={p.x} cy={p.y} r={3.4} fill="#151B22" />
          {labelAt(k, p)}
        </g>
      ))}
    </svg>
  );
}

export const DRONE_KIT: WorkshopKit = {
  id: "dr",
  noun: "drone",
  title: "Drone Explorer Quad",
  parts: PARTS,
  connections: CONNECTIONS,
  stepVisuals: STEP_VISUALS,
  stepHelp: STEP_HELP,
  partGuide: PART_GUIDE,
  connectionLevel: CONNECTION_LEVEL,
  openQuestions: OPEN_QUESTIONS,
  tools: TOOLS,
  installedAt: INSTALLED_AT,
  wiresPart: "wires",
  wireAnchorConn: "c-s2",
  basePart: "frame",
  oneOfSet: (id) => ["m1", "m2", "m3", "m4"].includes(id),
  partForBom: (bomId) => PARTS.find((x) => x.bomId === bomId && x.id !== "topPlate"),
  offRobotNote: () => "It isn't wired to the drone: it talks to the ELRS receiver over the 2.4 GHz radio link (step 11).",
  partFeatures: [
    { key: "arrow", text: "Forward arrow (points to the front)", part: "fc", feature: "arrow" },
    { key: "capacitor", text: "Low-ESR capacitor", part: "powerLead", feature: "capacitor" },
    { key: "antenna", text: "Receiver antenna", part: "receiver", feature: "antenna" },
  ],
  stepDetails: {
    arrow: [{ key: "arrow", text: "Arrow points forward", feature: "arrow" }],
    antenna: [{ key: "antenna", text: "Antenna tied away from the props", feature: "antenna" }],
    capacitor: [{ key: "capacitor", text: "Capacitor across + and −", feature: "capacitor" }],
    usb: [{ key: "usb", text: "USB-C port → computer", feature: "usb" }],
    strap: [{ key: "strap", text: "Battery strap (tighten before flight)", feature: "strap" }],
  },
  wiringOverview: ["fc", "esc", "receiver", "powerLead", "m1", "m3"],
  stepOverview: ["fc", "esc", "receiver", "battery"],
  wiringGroups: [
    { title: "Motors → ESC (step 5)", ids: ["c-m1", "c-m2", "c-m3", "c-m4"] },
    { title: "ESC harness → flight controller (step 6)", ids: ["c-s1", "c-s2", "c-s3", "c-s4", "c-vbat"] },
    { title: "Receiver → flight controller (step 7)", ids: ["c-rxtx", "c-rxrx", "c-rx5v", "c-rxgnd"] },
    { title: "Power lead → ESC (step 8) and battery (step 10)", ids: ["c-bat+", "c-bat-", "c-batt"] },
  ],
  pinText: PIN_TEXT,
  Diagram: DroneDiagram,
  camera: {
    target: [0, 2.6, 0], dir: [0.62, 0.52, 0.6], dist: 44,
    explodedTarget: [0, 6.5, -1.5], explodedDist: 1.12, explodedFit: 0.95,
  },
  stepSpread: [1.15, 1.2, 1.15],
  intro: { spread: [1.25, 1.35, 1.25], zoom: 0.78, title: "Meet your Drone Explorer Quad." },
  loadModel: () => import("./droneModel").then((m) => m.buildDroneModel),
};
