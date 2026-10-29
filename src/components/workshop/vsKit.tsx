import type { KitConnection, WorkshopKit } from "./kit";
import { DASH, KIND_LABEL, WIDTH, strokeCss } from "./wiringStyle";
import {
  PARTS, CONNECTIONS, STEP_VISUALS, STEP_HELP, PART_GUIDE, CONNECTION_LEVEL, OPEN_QUESTIONS, TOOLS, INSTALLED_AT,
} from "./vsData";

/* The Vision Sorter Station's workshop kit: its data (vsData.ts), its model (vsModel.ts) and its circuit diagram, in
   the shape the shared workshop components read. */

/* ---------- circuit diagram (SVG): loads and power on the left, the boards in the middle, the Raspberry Pi's
   header down the right ---------- */
type P = { x: number; y: number };
const PI_PINS = ["gpio18", "gpio23", "gpio24", "gpio2", "gpio3", "gpio17", "gpio27", "3v3", "5v", "gnd", "csi", "dsi"];
const PI_TEXT: Record<string, string> = { gpio18: "GPIO18", gpio23: "GPIO23", gpio24: "GPIO24", gpio2: "GPIO2 SDA", gpio3: "GPIO3 SCL", gpio17: "GPIO17", gpio27: "GPIO27", "3v3": "3.3V", "5v": "5V", gnd: "GND", csi: "CSI", dsi: "DSI" };
const col = (pre: string, x: number, top: number, pins: string[], step = 13) => Object.fromEntries(pins.map((p, i) => [`${pre}.${p}`, { x, y: top + i * step }]));
const row = (pre: string, y: number, left: number, pins: string[], step = 12) => Object.fromEntries(pins.map((p, i) => [`${pre}.${p}`, { x: left + i * step, y }]));
const PINS: Record<string, P> = {
  ...Object.fromEntries(PI_PINS.map((p, i) => [`pi.${p}`, { x: 580, y: 40 + i * 22 }])),
  ...col("drv", 380, 35, ["ena", "in1", "in2"], 14),
  "drv.out1": { x: 260, y: 45 }, "drv.out2": { x: 260, y: 60 }, "drv.12v": { x: 290, y: 120 }, "drv.gnd": { x: 340, y: 120 },
  "mot.a": { x: 130, y: 45 }, "mot.b": { x: 130, y: 60 },
  ...col("pca", 380, 150, ["sda", "scl", "vcc", "gnd"], 14),
  "pca.vplus": { x: 260, y: 160 }, "pca.vminus": { x: 260, y: 175 },
  ...row("pca", 230, 270, ["ch0s", "ch0v", "ch0g"]), ...row("pca", 230, 320, ["ch1s", "ch1v", "ch1g"]),
  ...row("servoA", 250, 240, ["sig", "v", "g"]), ...row("servoB", 250, 310, ["sig", "v", "g"]),
  ...col("ir", 380, 312, ["out", "vcc", "gnd"]),
  ...col("mos", 380, 368, ["sig", "gnd"]),
  ...col("mos", 260, 365, ["vin", "pgnd", "vplus", "vminus"]),
  "leds.pos": { x: 130, y: 392 }, "leds.neg": { x: 130, y: 406 },
  "cam.ribbon": { x: 520, y: 35 },
  ...col("hmi", 520, 432, ["ribbon", "5v", "gnd"]),
  "buck.out5": { x: 170, y: 255 }, "buck.outg": { x: 170, y: 275 }, "buck.inp": { x: 90, y: 300 }, "buck.ing": { x: 140, y: 300 },
  "psu.pos": { x: 100, y: 452 }, "psu.neg": { x: 100, y: 468 }, "estop.in": { x: 130, y: 455 }, "estop.out": { x: 200, y: 455 },
};
const PIN_TEXT: Record<string, string> = Object.fromEntries(Object.keys(PINS).map((k) => {
  const [pre, p] = k.split(".");
  if (pre === "pi") return [k, PI_TEXT[p]];
  const named: Record<string, string> = {
    "buck.out5": "5V out", "buck.outg": "GND", "buck.inp": "IN+", "buck.ing": "IN−", "psu.pos": "+12V", "psu.neg": "0V", "estop.in": "in", "estop.out": "out",
    "pca.vplus": "V+", "pca.vminus": "V−", "mos.vplus": "V+", "mos.vminus": "V−", "mos.pgnd": "GND", "drv.12v": "12V", "cam.ribbon": "ribbon", "hmi.ribbon": "ribbon",
    "leds.pos": "+", "leds.neg": "−", "mot.a": "", "mot.b": "",
  };
  if (k in named) return [k, named[k]];
  if (/ch\d[svg]$/.test(p) || pre.startsWith("servo")) return [k, ""];
  return [k, p.toUpperCase()];
}));

function route(c: KitConnection, i: number): string {
  const a = PINS[c.from.terminal], b = PINS[c.to.terminal];
  if (!a || !b) return "";
  const gap = Math.abs(b.x - a.x);
  if (gap < 24) { const lane = Math.min(a.y, b.y) + Math.abs(b.y - a.y) / 2; return `M${a.x} ${a.y} V${lane} H${b.x} V${b.y}`; }
  const lo = Math.min(a.x, b.x), room = Math.max(20, gap - 28);
  const lane = lo + 14 + ((i * 13) % room);
  return `M${a.x} ${a.y} H${lane} V${b.y} H${b.x}`;
}

function VsDiagram({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const box = (x: number, y: number, w: number, h: number, title: string, sub: string, fill: string) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke="#1f2937" strokeOpacity={0.15} />
      <text x={x + 9} y={y + 15} fontSize={10.5} fontWeight={800} fill="#ffffff">{title}</text>
      {sub && <text x={x + 9} y={y + 27} fontSize={8} fontWeight={600} fill="#ffffff" opacity={0.85}>{sub}</text>}
    </g>
  );
  return (
    <svg viewBox="0 0 720 500" className="w-full h-auto" role="img" aria-label="Circuit diagram of the Vision Sorter Station wiring">
      <rect x={0} y={0} width={720} height={500} fill="#FBF8F3" />
      {box(580, 20, 120, 290, "Raspberry Pi 4", "GPIO header", "#1f7a3a")}
      {box(260, 20, 120, 100, "L298N", "conveyor", "#b3241f")}
      {box(30, 30, 100, 40, "Conveyor motor", "", "#6b7280")}
      {box(260, 140, 120, 90, "PCA9685", "servo driver", "#1d4f9c")}
      {box(230, 250, 60, 30, "Pusher A", "", "#1d2024")}
      {box(300, 250, 60, 30, "Pusher B", "", "#1d2024")}
      {box(260, 300, 120, 45, "E18-D80NK", "item sensor", "#4b5563")}
      {box(260, 355, 120, 58, "MOSFET", "LED switch", "#1f6aa3")}
      {box(30, 380, 100, 40, "LED bars", "12 V", "#2a2d33")}
      {box(420, 20, 100, 30, "Pi Camera 3", "", "#0f5a24")}
      {box(420, 420, 100, 50, "7\" touch display", "HMI", "#17191c")}
      {box(60, 240, 110, 60, "Buck", "5.1 V", "#1d4f9c")}
      {box(20, 440, 80, 40, "12 V adapter", "jack", "#2a2d33")}
      {box(130, 440, 70, 30, "E-stop", "", "#b71c1c")}
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
        const below = ["drv.12v", "drv.gnd", "buck.inp", "buck.ing"].includes(k);
        const end = [380, 130, 170, 100, 200, 520].includes(p.x) && !k.startsWith("pi.");
        return (
          <g key={k}>
            <circle cx={p.x} cy={p.y} r={3} fill="#151B22" />
            {t && (
              <text x={below ? p.x : k.startsWith("pi.") ? p.x + 7 : end ? p.x - 6 : p.x + 6} y={below ? p.y - 7 : p.y + 3.2} fontSize={8} fontWeight={700}
                textAnchor={below ? "middle" : k.startsWith("pi.") ? "start" : end ? "end" : "start"} fill="#ffffff">{t}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export const VS_KIT: WorkshopKit = {
  id: "vs",
  noun: "station",
  title: "Vision Sorter Station",
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
  basePart: "frame",
  oneOfSet: (id) => ["servoA", "servoB", "frame", "arch"].includes(id),
  partForBom: (bomId) => PARTS.find((x) => x.bomId === bomId),
  offRobotNote: () => "",
  partFeatures: [{ key: "estop", text: "Emergency stop (press to stop everything)", part: "estop", feature: "estop" }],
  stepDetails: {
    usb: [{ key: "usb", text: "Pi ports face the door", feature: "usb" }],
    estop: [{ key: "estop", text: "E-stop: test it before powering up", feature: "estop" }],
  },
  wiringOverview: ["pi", "driver", "pca", "mosfet", "buck", "camera", "hmi"],
  stepOverview: ["pi", "camera", "belt", "cabinet", "hmi"],
  wiringGroups: [
    { title: "Conveyor driver → Pi (step 11)", ids: ["c-ena", "c-in1", "c-in2"] },
    { title: "Servo driver and pushers (step 11)", ids: ["c-sda", "c-scl", "c-pcav", "c-pcag", "c-sas", "c-sav", "c-sag", "c-sbs", "c-sbv", "c-sbg"] },
    { title: "Item sensor, lights, camera and display → Pi (step 11)", ids: ["c-irs", "c-irv", "c-irg", "c-mos", "c-mosg", "c-cam", "c-dsi", "c-hmiv", "c-hmig"] },
    { title: "12 V through the E-stop, 5 V and common ground (step 12)", ids: ["c-jack", "c-e12d", "c-e12b", "c-e12m", "c-psug", "c-bgnd", "c-mpg", "c-pcavp", "c-pcavm", "c-pi5", "c-pig"] },
    { title: "Motor and LED bars (step 10)", ids: ["c-m1", "c-m2", "c-ledp", "c-ledn"] },
  ],
  pinText: PIN_TEXT,
  Diagram: VsDiagram,
  camera: {
    target: [8, 30, 2], dir: [0.45, 0.5, 0.75], dist: 150,
    explodedTarget: [10, 36, 4], explodedDist: 1.45, explodedFit: 0.95,
    // inside the cabinet: look from in front of its open door
    lowView: (c) => (c.x > 35 && c.y > 10 && c.y < 40 ? [0.15, 0.15, 1] : null),
  },
  stepSpread: [1.15, 1.1, 1.15],
  intro: { spread: [1.25, 1.25, 1.25], zoom: 0.8, title: "Meet your Vision Sorter Station." },
  loadModel: () => import("./vsModel").then((m) => m.buildVsModel),
};
