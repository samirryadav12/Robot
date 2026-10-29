import type { KitConnection, WorkshopKit } from "./kit";
import { DASH, KIND_LABEL, WIDTH, strokeCss } from "./wiringStyle";
import {
  PARTS, CONNECTIONS, STEP_VISUALS, STEP_HELP, PART_GUIDE, CONNECTION_LEVEL, OPEN_QUESTIONS, TOOLS, INSTALLED_AT,
} from "./armData";

/* The Robotic Arm 4-DOF's workshop kit: its data (armData.ts), its model (armModel.ts) and its circuit diagram,
   in the shape the shared workshop components read. */

/* ---------- circuit diagram (SVG): servos on the left, the Arduino on the right, the 5 V supply below ---------- */
type P = { x: number; y: number };
const SERVO_ROWS: [string, string, number][] = [["sBase", "Base servo", 40], ["sShoulder", "Shoulder servo", 120], ["sElbow", "Elbow servo", 200], ["sGrip", "Gripper servo", 280]];
const PINS: Record<string, P> = {
  ...Object.fromEntries(SERVO_ROWS.map(([id, , y]) => [`${id}.lead`, { x: 160, y: y + 30 }])),
  "uno.d3": { x: 470, y: 70 }, "uno.d5": { x: 470, y: 150 }, "uno.d6": { x: 470, y: 230 }, "uno.d9": { x: 470, y: 310 }, "uno.gnd": { x: 470, y: 380 },
  "psu.out": { x: 250, y: 360 }, "psu.gnd": { x: 330, y: 380 },
};
const PIN_TEXT: Record<string, string> = {
  "sBase.lead": "", "sShoulder.lead": "", "sElbow.lead": "", "sGrip.lead": "",
  "uno.d3": "D3 ~", "uno.d5": "D5 ~", "uno.d6": "D6 ~", "uno.d9": "D9 ~", "uno.gnd": "GND",
  "psu.out": "+5V / GND", "psu.gnd": "GND",
};

function route(c: KitConnection): string {
  const a = PINS[c.from.terminal], b = PINS[c.to.terminal];
  if (c.kind === "PWM") return `M${a.x} ${a.y} H${b.x}`;
  if (c.id === "c-gnd") return `M${a.x} ${a.y} H${b.x}`;
  // servo power: down a lane each, into the supply's terminal
  const lane = 190 + ["sBase.lead", "sShoulder.lead", "sElbow.lead", "sGrip.lead"].indexOf(c.from.terminal) * 14;
  return `M${a.x} ${a.y + 8} H${lane} V${b.y - 10} H${b.x}`;
}

function ArmDiagram({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const box = (x: number, y: number, w: number, h: number, title: string, sub: string, fill: string) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} stroke="#1f2937" strokeOpacity={0.15} />
      <text x={x + 10} y={y + 20} fontSize={11.5} fontWeight={800} fill="#ffffff">{title}</text>
      <text x={x + 10} y={y + 33} fontSize={8.5} fontWeight={600} fill="#ffffff" opacity={0.85}>{sub}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 640 430" className="w-full h-auto" role="img" aria-label="Circuit diagram of the Robotic Arm 4-DOF wiring">
      <rect x={0} y={0} width={640} height={430} fill="#FBF8F3" />
      {SERVO_ROWS.map(([id, name, y]) => <g key={id}>{box(30, y, 130, 56, name, "signal · + · GND", "#1d2a44")}</g>)}
      {box(470, 30, 140, 370, "Arduino Uno", "the controller", "#0b6e99")}
      {box(230, 350, 120, 56, "", "", "#2a2d33")}
      <text x={290} y={384} fontSize={11.5} fontWeight={800} fill="#ffffff" textAnchor="middle">5V supply</text>
      {CONNECTIONS.map((c) => {
        const on = selected === c.id, dim = !!selected && !on;
        const d = route(c);
        const pair = c.id.startsWith("c-pwr");
        return (
          <g key={c.id} onClick={() => onSelect(on ? null : c.id)} style={{ cursor: "pointer" }} opacity={dim ? 0.18 : 1}>
            <title>{`${c.from.name} → ${c.to.name} (${KIND_LABEL[c.kind]})`}</title>
            <path d={d} fill="none" stroke="#ffffff" strokeWidth={WIDTH[c.kind] + (pair ? 6 : 3)} strokeLinejoin="round" />
            {pair ? (
              <>
                <path d={d} fill="none" stroke={strokeCss("Red")} strokeWidth={on ? 3.6 : 2.4} strokeLinejoin="round" transform="translate(-1.6 -1.6)" />
                <path d={d} fill="none" stroke={strokeCss("Black")} strokeWidth={on ? 3.6 : 2.4} strokeDasharray={DASH.Ground} strokeLinejoin="round" transform="translate(1.6 1.6)" />
              </>
            ) : (
              <path d={d} fill="none" stroke={strokeCss(c.color)} strokeWidth={on ? WIDTH[c.kind] + 1.6 : WIDTH[c.kind]} strokeDasharray={DASH[c.kind]} strokeLinejoin="round" />
            )}
            <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
          </g>
        );
      })}
      {Object.entries(PINS).map(([k, p]) => (
        <g key={k}>
          <circle cx={p.x} cy={p.y} r={3.4} fill="#151B22" />
          {PIN_TEXT[k] && k.startsWith("uno") && <text x={p.x + 7} y={p.y + 3.5} fontSize={9.5} fontWeight={700} fill="#ffffff">{PIN_TEXT[k]}</text>}
        </g>
      ))}
    </svg>
  );
}

export const ARM_KIT: WorkshopKit = {
  id: "arm",
  noun: "arm",
  title: "Robotic Arm 4-DOF",
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
  wireAnchorConn: "c-d5",
  basePart: "base",
  oneOfSet: (id) => ["sBase", "sShoulder", "sElbow", "sGrip"].includes(id),
  partForBom: (bomId) => PARTS.find((x) => x.bomId === bomId && !["turret", "upperArm", "forearm"].includes(x.id)),
  offRobotNote: () => "",
  partFeatures: [
    { key: "horn", text: "Servo horn (shoulder)", part: "horns", feature: "horn" },
    { key: "psu", text: "5V output terminal (+ / −)", part: "psu", feature: "psu" },
  ],
  stepDetails: {
    horn: [{ key: "horn", text: "Horn fixes the arm to the shaft", feature: "horn" }],
    claw: [{ key: "claw", text: "Claw opens and closes", feature: "claw" }],
    psu: [{ key: "psu", text: "Servo + to 5V, − to GND", feature: "psu" }],
    usb: [{ key: "usb", text: "USB-B port → computer", feature: "usb" }],
  },
  wiringOverview: ["sBase", "sShoulder", "sElbow", "sGrip", "arduino", "psu"],
  stepOverview: ["sBase", "sShoulder", "sElbow", "sGrip"],
  wiringGroups: [
    { title: "Servo signals → Arduino (step 6)", ids: ["c-d3", "c-d5", "c-d6", "c-d9"] },
    { title: "Servo power → external 5V supply (step 7)", ids: ["c-pwr-sBase", "c-pwr-sShoulder", "c-pwr-sElbow", "c-pwr-sGrip"] },
    { title: "Common ground (step 8)", ids: ["c-gnd"] },
  ],
  pinText: PIN_TEXT,
  Diagram: ArmDiagram,
  camera: {
    target: [-1.5, 9, 5], dir: [-0.62, 0.42, 0.66], dist: 70,
    explodedTarget: [-2, 11, 5], explodedDist: 1.4, explodedFit: 0.95,
  },
  stepSpread: [1.1, 1.1, 1.1],
  intro: { spread: [1.2, 1.25, 1.2], zoom: 0.8, title: "Meet your Robotic Arm 4-DOF." },
  loadModel: () => import("./armModel").then((m) => m.buildArmModel),
};
