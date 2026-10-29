import type { KitModel, WorkshopKit } from "./kit";
import { DASH, KIND_LABEL, WIDTH, strokeCss } from "./wiringStyle";
import {
  PARTS, CONNECTIONS, STEP_VISUALS, STEP_HELP, PART_GUIDE, CONNECTION_LEVEL, OPEN_QUESTIONS, TOOLS,
} from "./lineFollowerData";
import type { Connection } from "./lineFollowerData";

/* The Line Follower's workshop kit: its data (lineFollowerData.ts), its model (lineFollowerModel.ts) and its
   circuit diagram, in the shape the shared workshop components read. */

/* ---------- circuit diagram (SVG), laid out from the same connections ---------- */
type P = { x: number; y: number };
const PINS: Record<string, P> = {
  // TCRT5000 dual module (right edge)
  "sen.vcc": { x: 330, y: 52 }, "sen.gnd": { x: 330, y: 72 }, "sen.out1": { x: 330, y: 92 }, "sen.out2": { x: 330, y: 112 },
  // Arduino Uno (left edge)
  "uno.d2": { x: 520, y: 70 }, "uno.d4": { x: 520, y: 92 }, "uno.d5": { x: 520, y: 166 }, "uno.d6": { x: 520, y: 188 },
  "uno.d7": { x: 520, y: 210 }, "uno.d8": { x: 520, y: 232 }, "uno.d9": { x: 520, y: 254 }, "uno.d10": { x: 520, y: 276 },
  "uno.5v": { x: 520, y: 118 }, "uno.gnd": { x: 520, y: 140 }, "uno.gnd2": { x: 520, y: 318 },
  // L298N (right edge: logic, left edge: outputs, bottom: power)
  "drv.ena": { x: 340, y: 166 }, "drv.enb": { x: 340, y: 188 }, "drv.in1": { x: 340, y: 210 }, "drv.in2": { x: 340, y: 232 }, "drv.in3": { x: 340, y: 254 }, "drv.in4": { x: 340, y: 276 },
  "drv.out1": { x: 200, y: 190 }, "drv.out2": { x: 200, y: 212 }, "drv.out3": { x: 200, y: 268 }, "drv.out4": { x: 200, y: 290 },
  "drv.12v": { x: 240, y: 330 }, "drv.gnd": { x: 290, y: 330 },
  // motors and battery
  "motL.a": { x: 120, y: 190 }, "motL.b": { x: 120, y: 212 }, "motR.a": { x: 120, y: 268 }, "motR.b": { x: 120, y: 290 },
  "bat.pos": { x: 150, y: 372 }, "bat.neg": { x: 150, y: 396 },
};
const PIN_TEXT: Record<string, string> = {
  "sen.vcc": "VCC", "sen.gnd": "GND", "sen.out1": "OUT1 (L)", "sen.out2": "OUT2 (R)",
  "uno.d2": "D2", "uno.d4": "D4", "uno.d5": "D5 ~", "uno.d6": "D6 ~", "uno.d7": "D7", "uno.d8": "D8", "uno.d9": "D9", "uno.d10": "D10 ~", "uno.5v": "5V", "uno.gnd": "GND", "uno.gnd2": "GND",
  "drv.ena": "ENA", "drv.enb": "ENB", "drv.in1": "IN1", "drv.in2": "IN2", "drv.in3": "IN3", "drv.in4": "IN4",
  "drv.out1": "OUT1", "drv.out2": "OUT2", "drv.out3": "OUT3", "drv.out4": "OUT4", "drv.12v": "+12V", "drv.gnd": "GND",
  "motL.a": "", "motL.b": "", "motR.a": "", "motR.b": "", "bat.pos": "+", "bat.neg": "−",
};

function route(c: Connection, i: number): string {
  const a = PINS[c.from.terminal], b = PINS[c.to.terminal];
  if (c.kind === "Motor") return `M${a.x} ${a.y} H${b.x}`;
  if (c.id === "c-bat+" || c.id === "c-bat-") return `M${a.x} ${a.y} H${b.x + (c.id === "c-bat-" ? 0 : 0)} V${b.y}`;
  if (c.id === "c-gnd") return `M${a.x} ${a.y} V${a.y + 22} H460 V${b.y} H${b.x}`;
  // sensor and logic wires: across the channel between the boards, each in its own lane
  const lane = 400 + (i % 10) * 10;
  return `M${a.x} ${a.y} H${lane} V${b.y} H${b.x}`;
}

function CircuitDiagram({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const box = (x: number, y: number, w: number, h: number, title: string, sub: string, fill: string) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} stroke="#1f2937" strokeOpacity={0.15} />
      <text x={x + 12} y={y + 20} fontSize={12} fontWeight={800} fill="#ffffff">{title}</text>
      <text x={x + 12} y={y + 34} fontSize={9} fontWeight={600} fill="#ffffff" opacity={0.85}>{sub}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 640 430" className="w-full h-auto" role="img" aria-label="Circuit diagram of the Line Follower wiring">
      <rect x={0} y={0} width={640} height={430} fill="#FBF8F3" />
      {box(190, 30, 140, 100, "TCRT5000", "dual IR line sensor", "#1f4fa8")}
      {box(200, 150, 140, 180, "L298N motor driver", "", "#b3241f")}
      {box(520, 14, 104, 326, "Arduino", "Uno R3", "#0b6e99")}
      {box(20, 170, 100, 60, "Left motor", "TT gear motor", "#c79a12")}
      {box(20, 248, 100, 60, "Right motor", "TT gear motor", "#c79a12")}
      {box(20, 350, 130, 64, "2× 18650", "holder + switch, 7.4 V", "#2a2d33")}
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
          <circle cx={p.x} cy={p.y} r={3.4} fill="#151B22" />
          {PIN_TEXT[k] && (
            <text x={k.startsWith("uno") ? p.x + 7 : k.startsWith("drv.out") ? p.x + 6 : k.startsWith("drv.12v") || k === "drv.gnd" ? p.x - 10 : k.startsWith("bat") ? p.x - 14 : p.x - 6}
              y={k === "drv.12v" || k === "drv.gnd" ? p.y - 8 : p.y + 3.5} fontSize={9.5} fontWeight={700}
              textAnchor={k.startsWith("uno") || k.startsWith("drv.out") || k === "drv.12v" || k === "drv.gnd" ? "start" : "end"}
              fill={k.startsWith("bat") ? "#ffffff" : "#ffffff"}>{PIN_TEXT[k]}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

export const LINE_FOLLOWER_KIT: WorkshopKit = {
  id: "lf",
  noun: "robot",
  title: "Line Follower Robot",
  parts: PARTS,
  connections: CONNECTIONS,
  stepVisuals: STEP_VISUALS,
  stepHelp: STEP_HELP,
  partGuide: PART_GUIDE,
  connectionLevel: CONNECTION_LEVEL,
  openQuestions: OPEN_QUESTIONS,
  tools: TOOLS,
  installedAt: { chassis: 1, motorL: 3, motorR: 3, brackets: 3, wheelL: 4, wheelR: 4, caster: 4, sensors: 5, arduino: 6, driver: 6, hardware: 6, holder: 2, cells: 2, wires: 8, usb: 99 },
  wiresPart: "wires",
  wireAnchorConn: "c-in1",
  basePart: "chassis",
  oneOfSet: (id) => id === "motorL" || id === "motorR" || id === "wheelL" || id === "wheelR",
  partForBom: (bomId) => PARTS.find((x) => x.bomId === bomId && x.id !== "brackets"),
  offRobotNote: () => "Plugs into the Arduino's USB-B port and your computer.",
  partFeatures: [
    // two features worth naming on their own: the holder's switch and a jumper's DuPont connector
    { key: "switch", text: "Power switch (on the holder)", part: "holder", feature: "switch" },
    { key: "plug", text: "DuPont connector", part: "wires", feature: "plug" },
  ],
  stepDetails: {
    trimmers: [{ key: "trim0", text: "Left sensitivity dial", feature: "trim0" }, { key: "trim1", text: "Right sensitivity dial", feature: "trim1" }],
    usb: [{ key: "usb", text: "USB-B port → computer", feature: "usb" }],
    switch: [{ key: "switch", text: "Battery switch (OFF while wiring)", feature: "switch" }],
  },
  wiringOverview: ["sensors", "arduino", "driver", "holder", "motorL", "motorR"],
  stepOverview: ["sensors", "arduino", "driver", "wheelL", "wheelR", "caster"],
  wiringGroups: [
    { title: "Line sensor → Arduino (step 9)", ids: ["c-d2", "c-d4", "c-sen5v", "c-sengnd"] },
    { title: "Motor driver → Arduino (step 8)", ids: ["c-in1", "c-in2", "c-in3", "c-in4", "c-ena", "c-enb"] },
    { title: "Shared ground (step 10)", ids: ["c-gnd"] },
    { title: "Battery → motor driver (step 11)", ids: ["c-bat+", "c-bat-"] },
    { title: "Motors → motor driver (step 7)", ids: ["c-motL1", "c-motL2", "c-motR1", "c-motR2"] },
  ],
  pinText: PIN_TEXT,
  Diagram: CircuitDiagram,
  camera: {
    target: [0, 3.6, 0.6], dir: [0.62, 0.5, 0.6], dist: 36,
    explodedTarget: [-1.5, 5.2, 2.5], explodedDist: 1.78,
    // under the plate (motors, caster, battery): look from low on its own side, so it isn't hidden behind the boards
    lowView: (c) => (c.y < 3.9 ? [c.x < -0.5 ? -0.42 : c.x > 0.5 ? 0.42 : 0.3, 0.17, c.z < -1.5 ? -0.9 : 0.9] : null), // behind the battery holder → from the rear
  },
  stepSpread: [1.35, 1.8, 1.35],
  // the full-window exploded layout: boards lift well clear of the plate, motors and wheels slide out along the axle
  intro: { spread: [1.45, 2.1, 1.45], zoom: 0.74, title: "Meet your Line Follower Robot." },
  loadModel: () => import("./lineFollowerModel").then((m) => () => m.buildLineFollowerModel() as unknown as KitModel),
};
