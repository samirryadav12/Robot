import type { KitConnection, WorkshopKit } from "./kit";
import { DASH, KIND_LABEL, WIDTH, strokeCss } from "./wiringStyle";
import {
  PARTS, CONNECTIONS, STEP_VISUALS, STEP_HELP, PART_GUIDE, CONNECTION_LEVEL, OPEN_QUESTIONS, TOOLS, INSTALLED_AT,
} from "./mazeData";

/* The RoboMaze Ultrasonic Solver's workshop kit: its data (mazeData.ts), its model (mazeModel.ts) and its circuit
   diagram, in the shape the shared workshop components read. */

/* ---------- circuit diagram (SVG): sensors along the top, the breadboard rails below them, the Nano on the right,
   the driver, motors and battery below ---------- */
type P = { x: number; y: number };
const SX = { sensorL: 40, sensorC: 220, sensorR: 400 } as const;
const PINS: Record<string, P> = {
  ...Object.fromEntries(Object.entries(SX).flatMap(([id, x]) => (["vcc", "trig", "echo", "gnd"] as const).map((p, i) => [`${id}.${p}`, { x: x + 18 + i * 32, y: 76 }]))),
  "bb.5v": { x: 470, y: 110 }, "bb.gnd": { x: 470, y: 128 },
  "nano.d2": { x: 530, y: 150 }, "nano.d3": { x: 530, y: 166 }, "nano.d4": { x: 530, y: 182 }, "nano.d5": { x: 530, y: 198 }, "nano.d6": { x: 530, y: 214 }, "nano.d7": { x: 530, y: 230 },
  "nano.d8": { x: 530, y: 252 }, "nano.d9": { x: 530, y: 268 }, "nano.d10": { x: 530, y: 284 }, "nano.d11": { x: 530, y: 300 },
  "nano.5v": { x: 530, y: 324 }, "nano.gnd": { x: 530, y: 340 }, "nano.vin": { x: 530, y: 356 },
  "drv.in1": { x: 330, y: 252 }, "drv.in2": { x: 330, y: 268 }, "drv.in3": { x: 330, y: 284 }, "drv.in4": { x: 330, y: 300 },
  "drv.out1": { x: 190, y: 232 }, "drv.out2": { x: 190, y: 250 }, "drv.out3": { x: 190, y: 298 }, "drv.out4": { x: 190, y: 316 },
  "drv.12v": { x: 220, y: 356 }, "drv.gnd": { x: 260, y: 356 }, "drv.5v": { x: 300, y: 356 },
  "motL.a": { x: 110, y: 232 }, "motL.b": { x: 110, y: 250 }, "motR.a": { x: 110, y: 298 }, "motR.b": { x: 110, y: 316 },
  "bat.pos": { x: 150, y: 384 }, "bat.neg": { x: 150, y: 402 },
};
const PIN_TEXT: Record<string, string> = {
  ...Object.fromEntries(Object.keys(SX).flatMap((id) => [[`${id}.vcc`, "VCC"], [`${id}.trig`, "TRIG"], [`${id}.echo`, "ECHO"], [`${id}.gnd`, "GND"]])),
  "bb.5v": "5V rail", "bb.gnd": "GND rail",
  "nano.d2": "D2", "nano.d3": "D3", "nano.d4": "D4", "nano.d5": "D5", "nano.d6": "D6", "nano.d7": "D7", "nano.d8": "D8", "nano.d9": "D9", "nano.d10": "D10", "nano.d11": "D11",
  "nano.5v": "5V", "nano.gnd": "GND", "nano.vin": "VIN",
  "drv.in1": "IN1", "drv.in2": "IN2", "drv.in3": "IN3", "drv.in4": "IN4", "drv.out1": "OUT1", "drv.out2": "OUT2", "drv.out3": "OUT3", "drv.out4": "OUT4",
  "drv.12v": "12V", "drv.gnd": "GND", "drv.5v": "5V",
  "motL.a": "", "motL.b": "", "motR.a": "", "motR.b": "", "bat.pos": "+", "bat.neg": "−",
};

function route(c: KitConnection, i: number): string {
  const a = PINS[c.from.terminal], b = PINS[c.to.terminal];
  if (c.to.terminal === "bb.5v" && c.from.part.startsWith("sensor")) return `M${a.x} ${a.y} V110 H${b.x}`;
  if (c.to.terminal === "bb.gnd" && c.from.part.startsWith("sensor")) return `M${a.x} ${a.y} V128 H${b.x}`;
  if (c.from.part.startsWith("sensor")) { const lane = 488 + (i % 6) * 6; return `M${a.x} ${a.y} V${140 + (i % 6) * 2} H${lane} V${b.y} H${b.x}`; }
  if (c.kind === "Motor") return `M${a.x} ${a.y} H${b.x}`;
  if (c.id === "c-bat+") return `M${a.x} ${a.y} H${b.x} V${b.y}`;
  if (c.id === "c-bat-") return `M${a.x} ${a.y} H${b.x} V${b.y}`;
  if (c.id === "c-5v") return `M${a.x} ${a.y} V372 H510 V${b.y} H${b.x}`;
  if (c.id === "c-dgnd") return `M${a.x} ${a.y} V380 H500 V${b.y} H${b.x}`;
  if (c.id === "c-rail" || c.id === "c-ngnd") return `M${a.x} ${a.y} H${515 - (c.id === "c-rail" ? 0 : 8)} V${b.y} H${b.x}`;
  const lane = 360 + (i % 8) * 8;
  return `M${a.x} ${a.y} H${lane} V${b.y} H${b.x}`;
}

function MazeDiagram({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const box = (x: number, y: number, w: number, h: number, title: string, sub: string, fill: string) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} stroke="#1f2937" strokeOpacity={0.15} />
      <text x={x + 10} y={y + 19} fontSize={11.5} fontWeight={800} fill="#ffffff">{title}</text>
      <text x={x + 10} y={y + 32} fontSize={8.5} fontWeight={600} fill="#ffffff" opacity={0.85}>{sub}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 640 430" className="w-full h-auto" role="img" aria-label="Circuit diagram of the RoboMaze Ultrasonic Solver wiring">
      <rect x={0} y={0} width={640} height={430} fill="#FBF8F3" />
      {box(SX.sensorL, 22, 140, 54, "Left HC-SR04", "points left", "#1f4fa8")}
      {box(SX.sensorC, 22, 140, 54, "Front HC-SR04", "points ahead", "#1f4fa8")}
      {box(SX.sensorR, 22, 140, 54, "Right HC-SR04", "points right", "#1f4fa8")}
      <line x1={30} y1={110} x2={480} y2={110} stroke="#d8432f" strokeWidth={1} strokeDasharray="2 3" opacity={0.6} />
      <line x1={30} y1={128} x2={480} y2={128} stroke="#2f6fd6" strokeWidth={1} strokeDasharray="2 3" opacity={0.6} />
      <text x={30} y={105} fontSize={8.5} fontWeight={700} fill="#64748b">breadboard 5V rail</text>
      <text x={30} y={140} fontSize={8.5} fontWeight={700} fill="#64748b">breadboard GND rail</text>
      {box(530, 140, 96, 226, "Arduino", "Nano", "#0b6e99")}
      {box(190, 222, 140, 134, "L298N", "", "#b3241f")}
      {box(20, 218, 90, 48, "Left motor", "TT gear", "#c79a12")}
      {box(20, 284, 90, 48, "Right motor", "TT gear", "#c79a12")}
      {box(20, 372, 130, 46, "2× 18650", "holder + switch", "#2a2d33")}
      {CONNECTIONS.map((c, i) => {
        const on = selected === c.id, dim = !!selected && !on;
        return (
          <g key={c.id} onClick={() => onSelect(on ? null : c.id)} style={{ cursor: "pointer" }} opacity={dim ? 0.18 : 1}>
            <title>{`${c.from.name} → ${c.to.name} (${KIND_LABEL[c.kind]})`}</title>
            <path d={route(c, i)} fill="none" stroke="#ffffff" strokeWidth={WIDTH[c.kind] + 3} strokeLinejoin="round" />
            <path d={route(c, i)} fill="none" stroke={strokeCss(c.color)} strokeWidth={on ? WIDTH[c.kind] + 1.6 : WIDTH[c.kind]} strokeDasharray={DASH[c.kind]} strokeLinejoin="round" />
            <path d={route(c, i)} fill="none" stroke="transparent" strokeWidth={12} />
          </g>
        );
      })}
      {Object.entries(PINS).map(([k, p]) => (
        <g key={k}>
          <circle cx={p.x} cy={p.y} r={3.2} fill="#151B22" />
          {PIN_TEXT[k] && !k.startsWith("bb") && (
            <text x={k.startsWith("nano") ? p.x + 7 : k.startsWith("drv.out") ? p.x + 6 : k.startsWith("drv.in") ? p.x - 6 : k.startsWith("bat") ? p.x - 12 : p.x}
              y={k.startsWith("sensor") ? p.y - 6 : ["drv.12v", "drv.gnd", "drv.5v"].includes(k) ? p.y - 8 : p.y + 3.5} fontSize={k.startsWith("sensor") ? 7.5 : 9} fontWeight={700}
              textAnchor={k.startsWith("sensor") || ["drv.12v", "drv.gnd", "drv.5v"].includes(k) ? "middle" : k.startsWith("nano") || k.startsWith("drv.out") ? "start" : "end"}
              fill="#ffffff">{PIN_TEXT[k]}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

export const MAZE_KIT: WorkshopKit = {
  id: "mz",
  noun: "robot",
  title: "RoboMaze Ultrasonic Solver",
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
  basePart: "chassis",
  oneOfSet: (id) => ["motorL", "motorR", "wheelL", "wheelR", "sensorL", "sensorC", "sensorR"].includes(id),
  partForBom: (bomId) => PARTS.find((x) => x.bomId === bomId),
  offRobotNote: () => "",
  partFeatures: [{ key: "switch", text: "Slide switch (on the holder)", part: "holder", feature: "switch" }],
  stepDetails: {
    usb: [{ key: "usb", text: "USB port faces the rear", feature: "usb" }],
    switch: [{ key: "switch", text: "Switch OFF while wiring", feature: "switch" }],
  },
  wiringOverview: ["sensorL", "sensorC", "sensorR", "nano", "driver", "holder"],
  stepOverview: ["sensorL", "sensorC", "sensorR", "nano", "driver", "holder"],
  wiringGroups: [
    { title: "Sensors → Nano and rails (step 10)", ids: ["c-tl", "c-el", "c-tc", "c-ec", "c-tr", "c-er", "c-vl", "c-gl", "c-vc", "c-gc", "c-vr", "c-gr", "c-rail"] },
    { title: "Motor driver → Nano (step 11)", ids: ["c-in1", "c-in2", "c-in3", "c-in4", "c-5v"] },
    { title: "Common ground and battery (step 11)", ids: ["c-ngnd", "c-dgnd", "c-bat+", "c-bat-"] },
    { title: "Motors → motor driver (step 9)", ids: ["c-motL1", "c-motL2", "c-motR1", "c-motR2"] },
  ],
  pinText: PIN_TEXT,
  Diagram: MazeDiagram,
  camera: {
    target: [0, 4.2, 0.6], dir: [0.62, 0.5, 0.6], dist: 40,
    explodedTarget: [0, 7, 0.5], explodedDist: 1.45, explodedFit: 0.95,
    // under the plate (motors, casters): look from low on its own side
    lowView: (c) => (c.y < 3.9 ? [c.x < -0.5 ? -0.5 : c.x > 0.5 ? 0.5 : 0.35, 0.2, 0.9] : null),
  },
  stepSpread: [1.25, 1.3, 1.2],
  intro: { spread: [1.35, 1.45, 1.3], zoom: 0.8, title: "Meet your RoboMaze Ultrasonic Solver." },
  loadModel: () => import("./mazeModel").then((m) => m.buildMazeModel),
};
