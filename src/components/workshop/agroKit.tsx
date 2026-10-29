import type { KitConnection, WorkshopKit } from "./kit";
import { DASH, KIND_LABEL, WIDTH, strokeCss } from "./wiringStyle";
import {
  PARTS, CONNECTIONS, STEP_VISUALS, STEP_HELP, PART_GUIDE, CONNECTION_LEVEL, OPEN_QUESTIONS, TOOLS, INSTALLED_AT,
} from "./agroData";

/* The Smart Agro Rover's workshop kit: its data (agroData.ts), its model (agroModel.ts) and its circuit diagram, in
   the shape the shared workshop components read. */

/* ---------- circuit diagram (SVG): motors and the power side on the left, the modules in a column in the middle,
   the Arduino Mega's pin header down the right ---------- */
type P = { x: number; y: number };
const MEGA_PINS = ["d3", "d4", "d5", "d6", "d8", "d9", "d10", "d11", "d22", "d23", "d24", "d25", "rx1", "tx1", "rx2", "tx2", "rx3", "tx3", "vin", "gnd"];
const MEGA_TEXT: Record<string, string> = { rx1: "RX1", tx1: "TX1", rx2: "RX2", tx2: "TX2", rx3: "RX3", tx3: "TX3", vin: "VIN", gnd: "GND" };
const mod = (pre: string, top: number, right: string[], left: string[]) => ({
  ...Object.fromEntries(right.map((p, i) => [`${pre}.${p}`, { x: 380, y: top + 10 + i * 14 }])),
  ...Object.fromEntries(left.map((p, i) => [`${pre}.${p}`, { x: 260, y: top + 10 + i * 14 }])),
});
const PINS: Record<string, P> = {
  ...Object.fromEntries(MEGA_PINS.map((p, i) => [`mega.${p}`, { x: 580, y: 40 + i * 20 }])),
  ...Object.fromEntries(["ena", "in1", "in2", "in3", "in4", "enb"].map((p, i) => [`drv.${p}`, { x: 380, y: 40 + i * 20 }])),
  "drv.out1": { x: 260, y: 45 }, "drv.out2": { x: 260, y: 65 }, "drv.out3": { x: 260, y: 115 }, "drv.out4": { x: 260, y: 135 },
  "drv.12v": { x: 290, y: 160 }, "drv.gnd": { x: 340, y: 160 },
  "motFL.a": { x: 130, y: 30 }, "motFL.b": { x: 130, y: 42 }, "motRL.a": { x: 130, y: 66 }, "motRL.b": { x: 130, y: 78 },
  "motFR.a": { x: 130, y: 110 }, "motFR.b": { x: 130, y: 122 }, "motRR.a": { x: 130, y: 146 }, "motRR.b": { x: 130, y: 158 },
  ...mod("sonarL", 180, ["trig", "echo"], ["vcc", "gnd"]),
  ...mod("sonarR", 225, ["trig", "echo"], ["vcc", "gnd"]),
  ...mod("gps", 270, ["tx", "rx"], ["vcc", "gnd"]),
  ...mod("m485", 315, ["ro", "di", "de"], ["vcc", "gnd", "a", "b"]),
  ...mod("cam", 385, ["u0t", "u0r"], ["5v", "gnd"]),
  ...mod("servo", 430, ["sig"], ["vplus", "gnd"]),
  "buck.out5": { x: 170, y: 250 }, "buck.outg": { x: 170, y: 270 }, "buck.inp": { x: 90, y: 300 }, "buck.ing": { x: 140, y: 300 },
  "npk.a": { x: 150, y: 350 }, "npk.b": { x: 150, y: 364 }, "npk.vplus": { x: 60, y: 380 }, "npk.gnd": { x: 100, y: 380 },
  "bat.pos": { x: 100, y: 435 }, "bat.neg": { x: 100, y: 455 }, "sw.in": { x: 130, y: 435 }, "sw.out": { x: 200, y: 435 },
};
const PIN_TEXT: Record<string, string> = Object.fromEntries(Object.keys(PINS).map((k) => {
  const [pre, p] = k.split(".");
  if (pre === "mega") return [k, MEGA_TEXT[p] ?? p.toUpperCase()];
  if (pre.startsWith("mot")) return [k, ""];
  const named: Record<string, string> = { "buck.out5": "5V out", "buck.outg": "GND", "buck.inp": "IN+", "buck.ing": "IN−", "bat.pos": "+", "bat.neg": "−", "sw.in": "in", "sw.out": "out", "npk.vplus": "V+", "drv.12v": "12V", "servo.vplus": "V+", "cam.5v": "5V" };
  return [k, named[k] ?? p.toUpperCase()];
}));

function route(c: KitConnection, i: number): string {
  const a = PINS[c.from.terminal], b = PINS[c.to.terminal];
  if (!a || !b) return "";
  const gap = Math.abs(b.x - a.x);
  if (gap < 24) { const lane = Math.max(a.x, b.x) + 14 + (i % 5) * 6; return `M${a.x} ${a.y} H${lane} V${b.y} H${b.x}`; }
  const lo = Math.min(a.x, b.x), room = Math.max(20, gap - 28);
  const lane = lo + 14 + ((i * 13) % room);
  return `M${a.x} ${a.y} H${lane} V${b.y} H${b.x}`;
}

function AgroDiagram({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const box = (x: number, y: number, w: number, h: number, title: string, sub: string, fill: string) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke="#1f2937" strokeOpacity={0.15} />
      <text x={x + 9} y={y + 15} fontSize={10.5} fontWeight={800} fill="#ffffff">{title}</text>
      {sub && <text x={x + 9} y={y + 27} fontSize={8} fontWeight={600} fill="#ffffff" opacity={0.85}>{sub}</text>}
    </g>
  );
  return (
    <svg viewBox="0 0 720 490" className="w-full h-auto" role="img" aria-label="Circuit diagram of the Smart Agro Rover wiring">
      <rect x={0} y={0} width={720} height={490} fill="#FBF8F3" />
      {box(580, 20, 120, 420, "Arduino", "Mega 2560", "#0b6e99")}
      {box(260, 20, 120, 140, "L298N", "", "#b3241f")}
      {box(30, 20, 100, 32, "FL motor", "", "#6b7280")}
      {box(30, 56, 100, 32, "RL motor", "", "#6b7280")}
      {box(30, 100, 100, 32, "FR motor", "", "#6b7280")}
      {box(30, 136, 100, 32, "RR motor", "", "#6b7280")}
      {box(260, 180, 120, 35, "Left HC-SR04", "", "#1f4fa8")}
      {box(260, 225, 120, 35, "Right HC-SR04", "", "#1f4fa8")}
      {box(260, 270, 120, 35, "NEO-6M GPS", "", "#34557a")}
      {box(260, 315, 120, 62, "MAX485", "RS485", "#1f6aa3")}
      {box(260, 385, 120, 35, "ESP32-CAM", "", "#2a2d33")}
      {box(260, 430, 120, 32, "MG996R servo", "", "#1d2024")}
      {box(60, 230, 110, 70, "LM2596", "5.0 V rail", "#1d4f9c")}
      {box(30, 330, 120, 50, "N-P-K sensor", "RS485, 9–24 V", "#3b3f45")}
      {box(20, 420, 80, 50, "3S Li-Po", "11.1 V", "#2a2d33")}
      {box(130, 420, 70, 30, "Switch", "", "#7a2a22")}
      {CONNECTIONS.map((c, i) => {
        const on = selected === c.id, dim = !!selected && !on;
        const d = route(c, i);
        if (!d) return null;
        return (
          <g key={c.id} onClick={() => onSelect(on ? null : c.id)} style={{ cursor: "pointer" }} opacity={dim ? 0.18 : 1}>
            <title>{`${c.from.name} → ${c.to.name} (${KIND_LABEL[c.kind]})`}</title>
            <path d={d} fill="none" stroke="#ffffff" strokeWidth={WIDTH[c.kind] + 3} strokeLinejoin="round" />
            <path d={d} fill="none" stroke={strokeCss(c.color)} strokeWidth={on ? WIDTH[c.kind] + 1.6 : WIDTH[c.kind]} strokeDasharray={DASH[c.kind]} strokeLinejoin="round" />
            <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
          </g>
        );
      })}
      {Object.entries(PINS).map(([k, p]) => {
        const t = PIN_TEXT[k];
        const right = p.x >= 580 || (p.x === 380);
        const below = ["drv.12v", "drv.gnd", "buck.inp", "buck.ing", "npk.vplus", "npk.gnd"].includes(k);
        return (
          <g key={k}>
            <circle cx={p.x} cy={p.y} r={3} fill="#151B22" />
            {t && (
              <text x={below ? p.x : right ? p.x + (p.x >= 580 ? 7 : -6) : p.x + 6} y={below ? p.y - 7 : p.y + 3.2} fontSize={8} fontWeight={700}
                textAnchor={below ? "middle" : p.x >= 580 ? "start" : right ? "end" : "start"} fill="#ffffff">{t}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const MOTORS = ["motorFL", "motorFR", "motorRL", "motorRR"], WHEELS = ["wheelFL", "wheelFR", "wheelRL", "wheelRR"];

export const AGRO_KIT: WorkshopKit = {
  id: "ag",
  noun: "rover",
  title: "Smart Agro Rover",
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
  wireAnchorConn: "c-in1",
  basePart: "lowerPlate",
  oneOfSet: (id) => [...MOTORS, ...WHEELS, "sonarL", "sonarR", "lowerPlate", "upperPlate"].includes(id),
  partForBom: (bomId) => PARTS.find((x) => x.bomId === bomId),
  offRobotNote: () => "",
  partFeatures: [{ key: "switch", text: "Toggle switch (power off here)", part: "switch", feature: "switch" }],
  stepDetails: {
    usb: [{ key: "usb", text: "USB port faces the rear", feature: "usb" }],
    switch: [{ key: "switch", text: "Switch OFF while wiring", feature: "switch" }],
  },
  wiringOverview: ["mega", "driver", "buck", "max485", "npk", "gps", "cam", "battery"],
  stepOverview: ["mega", "driver", "npk", "gps", "cam", "battery"],
  wiringGroups: [
    { title: "Motor driver → Mega (step 10)", ids: ["c-ena", "c-in1", "c-in2", "c-in3", "c-in4", "c-enb"] },
    { title: "Sensors, servo and RS485 → Mega (step 10)", ids: ["c-tl", "c-el", "c-tr", "c-er", "c-ro", "c-di", "c-de", "c-srv", "c-a", "c-b"] },
    { title: "5 V rail from the buck converter (steps 10, 12)", ids: CONNECTIONS.filter((c) => c.to.terminal.startsWith("buck.out")).map((c) => c.id) },
    { title: "GPS and camera → Mega (step 12)", ids: ["c-gtx", "c-grx", "c-ctx", "c-crx"] },
    { title: "Battery, switch and common ground (step 11)", ids: ["c-bat", "c-sdrv", "c-svin", "c-sbuck", "c-snpk", "c-batg", "c-mgnd", "c-bgnd", "c-ngnd"] },
    { title: "Motor pairs → motor driver (step 6)", ids: CONNECTIONS.filter((c) => c.kind === "Motor").map((c) => c.id) },
  ],
  pinText: PIN_TEXT,
  Diagram: AgroDiagram,
  camera: {
    target: [0, 9, 0], dir: [0.62, 0.5, 0.6], dist: 70,
    explodedTarget: [0, 14, 0], explodedDist: 1.45, explodedFit: 0.95,
    // under the lower deck (motors, brackets, sensors, probe): look from low on its own side
    lowView: (c) => (c.y < 6 ? [c.x < -2 ? -0.6 : c.x > 2 ? 0.6 : 0.3, 0.2, c.z < -2 ? -0.8 : 0.8] : null),
  },
  stepSpread: [1.2, 1.15, 1.2],
  intro: { spread: [1.3, 1.35, 1.3], zoom: 0.8, title: "Meet your Smart Agro Rover." },
  loadModel: () => import("./agroModel").then((m) => m.buildAgroModel),
};
