import type { KitConnection, WorkshopKit } from "./kit";
import { DASH, KIND_LABEL, WIDTH, strokeCss } from "./wiringStyle";
import {
  PARTS, CONNECTIONS, STEP_VISUALS, STEP_HELP, PART_GUIDE, CONNECTION_LEVEL, OPEN_QUESTIONS, TOOLS, INSTALLED_AT,
} from "./soccerData";

/* The RoboSoccer Bot's workshop kit: its data (soccerData.ts), its model (soccerModel.ts) and its circuit diagram,
   in the shape the shared workshop components read. */

/* ---------- circuit diagram (SVG) ---------- */
type P = { x: number; y: number };
const PINS: Record<string, P> = {
  // HC-05 (right edge)
  "bt.vcc": { x: 170, y: 52 }, "bt.gnd": { x: 170, y: 72 }, "bt.txd": { x: 170, y: 92 }, "bt.rxd": { x: 170, y: 112 },
  // Arduino (left edge)
  "uno.d2": { x: 500, y: 92 }, "uno.d3": { x: 500, y: 112 }, "uno.5v": { x: 500, y: 52 }, "uno.gnd": { x: 500, y: 72 },
  "uno.d5": { x: 500, y: 166 }, "uno.d6": { x: 500, y: 188 }, "uno.d7": { x: 500, y: 210 }, "uno.d8": { x: 500, y: 232 }, "uno.d9": { x: 500, y: 254 }, "uno.d10": { x: 500, y: 276 }, "uno.gnd2": { x: 500, y: 318 },
  // L298N
  "drv.ena": { x: 340, y: 166 }, "drv.enb": { x: 340, y: 188 }, "drv.in1": { x: 340, y: 210 }, "drv.in2": { x: 340, y: 232 }, "drv.in3": { x: 340, y: 254 }, "drv.in4": { x: 340, y: 276 },
  "drv.out1": { x: 200, y: 190 }, "drv.out2": { x: 200, y: 212 }, "drv.out3": { x: 200, y: 268 }, "drv.out4": { x: 200, y: 290 },
  "drv.12v": { x: 240, y: 330 }, "drv.gnd": { x: 290, y: 330 },
  // motors, battery, switch
  "motL.a": { x: 120, y: 190 }, "motL.b": { x: 120, y: 212 }, "motR.a": { x: 120, y: 268 }, "motR.b": { x: 120, y: 290 },
  "bat.pos": { x: 150, y: 372 }, "bat.neg": { x: 150, y: 396 }, "sw.in": { x: 200, y: 372 }, "sw.out": { x: 240, y: 360 },
};
const PIN_TEXT: Record<string, string> = {
  "bt.vcc": "VCC", "bt.gnd": "GND", "bt.txd": "TXD", "bt.rxd": "RXD",
  "uno.d2": "D2", "uno.d3": "D3", "uno.5v": "5V", "uno.gnd": "GND", "uno.d5": "D5 ~", "uno.d6": "D6 ~", "uno.d7": "D7", "uno.d8": "D8", "uno.d9": "D9 ~", "uno.d10": "D10 ~", "uno.gnd2": "GND",
  "drv.ena": "ENA", "drv.enb": "ENB", "drv.in1": "IN1", "drv.in2": "IN2", "drv.in3": "IN3", "drv.in4": "IN4",
  "drv.out1": "OUT1", "drv.out2": "OUT2", "drv.out3": "OUT3", "drv.out4": "OUT4", "drv.12v": "+12V", "drv.gnd": "GND",
  "motL.a": "", "motL.b": "", "motR.a": "", "motR.b": "", "bat.pos": "+", "bat.neg": "−", "sw.in": "", "sw.out": "",
};

function route(c: KitConnection, i: number): string {
  const a = PINS[c.from.terminal], b = PINS[c.to.terminal];
  if (c.kind === "Motor") return `M${a.x} ${a.y} H${b.x}`;
  if (c.id === "c-bat+") return `M${a.x} ${a.y} H${b.x}`;
  if (c.id === "c-sw") return `M${a.x} ${a.y} V${b.y}`;
  if (c.id === "c-bat-") return `M${a.x} ${a.y} H${b.x} V${b.y}`;
  if (c.id === "c-gnd") return `M${a.x} ${a.y} V${a.y + 22} H460 V${b.y} H${b.x}`;
  if (c.from.part === "bt") return `M${a.x} ${a.y} H${b.x}`;
  const lane = 400 + (i % 8) * 10;
  return `M${a.x} ${a.y} H${lane} V${b.y} H${b.x}`;
}

function SoccerDiagram({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const box = (x: number, y: number, w: number, h: number, title: string, sub: string, fill: string) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} stroke="#1f2937" strokeOpacity={0.15} />
      <text x={x + 12} y={y + 20} fontSize={12} fontWeight={800} fill="#ffffff">{title}</text>
      <text x={x + 12} y={y + 34} fontSize={9} fontWeight={600} fill="#ffffff" opacity={0.85}>{sub}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 640 430" className="w-full h-auto" role="img" aria-label="Circuit diagram of the RoboSoccer Bot wiring">
      <rect x={0} y={0} width={640} height={430} fill="#FBF8F3" />
      {box(40, 30, 130, 100, "HC-05", "Bluetooth module", "#1f4fa8")}
      {box(200, 150, 140, 180, "L298N", "", "#b3241f")}
      {box(500, 2, 110, 338, "Arduino Uno", "", "#0b6e99")}
      {box(20, 170, 100, 60, "Left motor", "DC gear motor", "#7c828a")}
      {box(20, 248, 100, 60, "Right motor", "DC gear motor", "#7c828a")}
      {box(20, 350, 130, 64, "Battery", "", "#2a2d33")}
      <rect x={186} y={362} width={30} height={22} rx={5} fill="#d8322a" />
      <text x={201} y={398} fontSize={8.5} fontWeight={700} fill="#64748b" textAnchor="middle">switch</text>
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
            <text x={k.startsWith("uno") ? p.x + 7 : k.startsWith("drv.out") ? p.x + 6 : k === "drv.12v" || k === "drv.gnd" ? p.x - 10 : k.startsWith("bat") ? p.x - 14 : p.x - 6}
              y={k === "drv.12v" || k === "drv.gnd" ? p.y - 8 : p.y + 3.5} fontSize={9.5} fontWeight={700}
              textAnchor={k.startsWith("uno") || k.startsWith("drv.out") || k === "drv.12v" || k === "drv.gnd" ? "start" : "end"}
              fill="#ffffff">{PIN_TEXT[k]}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

export const SOCCER_KIT: WorkshopKit = {
  id: "soc",
  noun: "robot",
  title: "RoboSoccer Bot",
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
  oneOfSet: (id) => ["motorL", "motorR", "wheelL", "wheelR"].includes(id),
  partForBom: (bomId) => PARTS.find((x) => x.bomId === bomId && x.id !== "topPlate"),
  offRobotNote: () => "",
  partFeatures: [{ key: "switch", text: "Power switch (on the top plate)", part: "switch", feature: "switch" }],
  stepDetails: {
    usb: [{ key: "usb", text: "USB-B port → computer", feature: "usb" }],
    switch: [{ key: "switch", text: "Switch OFF while wiring", feature: "switch" }],
  },
  wiringOverview: ["bt", "arduino", "driver", "battery", "motorL", "motorR"],
  stepOverview: ["arduino", "driver", "bt", "wheelL", "wheelR", "battery"],
  wiringGroups: [
    { title: "Motor driver → Arduino (step 7)", ids: ["c-ena", "c-in1", "c-in2", "c-enb", "c-in3", "c-in4", "c-gnd"] },
    { title: "Bluetooth → Arduino (step 8)", ids: ["c-bttx", "c-btrx", "c-bt5v", "c-btgnd"] },
    { title: "Battery → switch → motor driver (step 9)", ids: ["c-bat+", "c-sw", "c-bat-"] },
    { title: "Motors → motor driver (step 6)", ids: ["c-motL1", "c-motL2", "c-motR1", "c-motR2"] },
  ],
  pinText: PIN_TEXT,
  Diagram: SoccerDiagram,
  camera: {
    target: [0, 4.6, 0.5], dir: [0.62, 0.52, 0.6], dist: 52,
    explodedTarget: [0, 10, 1], explodedDist: 1.45, explodedFit: 0.95,
  },
  stepSpread: [1.2, 1.25, 1.2],
  intro: { spread: [1.3, 1.4, 1.3], zoom: 0.8, title: "Meet your RoboSoccer Bot." },
  loadModel: () => import("./soccerModel").then((m) => m.buildSoccerModel),
};
