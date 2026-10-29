import type { KitConnection, WorkshopKit } from "./kit";
import { DASH, KIND_LABEL, WIDTH, strokeCss } from "./wiringStyle";
import {
  PARTS, CONNECTIONS, STEP_VISUALS, STEP_HELP, PART_GUIDE, CONNECTION_LEVEL, OPEN_QUESTIONS, TOOLS, INSTALLED_AT,
} from "./balData";

/* The BalanceBot Pro's workshop kit: its data (balData.ts), its model (balModel.ts) and its circuit diagram, in the
   shape the shared workshop components read. */

/* ---------- circuit diagram (SVG): motors and the power side on the left, the driver and modules in the middle,
   the Arduino Uno's pins down the right ---------- */
type P = { x: number; y: number };
const UNO_PINS = ["d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "d10", "d11", "a0", "a1", "a2", "a3", "a4", "a5", "5v", "vin", "gnd"];
const col = (pre: string, x: number, top: number, pins: string[], step = 14) => Object.fromEntries(pins.map((p, i) => [`${pre}.${p}`, { x, y: top + i * step }]));
const PINS: Record<string, P> = {
  ...Object.fromEntries(UNO_PINS.map((p, i) => [`uno.${p}`, { x: 580, y: 40 + i * 21 }])),
  ...col("drv", 380, 35, ["pwma", "ain1", "ain2", "pwmb", "bin1", "bin2", "stby", "vcc", "gnd"]),
  "drv.a01": { x: 260, y: 45 }, "drv.a02": { x: 260, y: 60 }, "drv.b01": { x: 260, y: 130 }, "drv.b02": { x: 260, y: 145 }, "drv.vm": { x: 300, y: 170 },
  ...col("motL", 150, 32, ["m1", "m2", "vcc", "gnd", "a", "b"], 13),
  ...col("motR", 150, 137, ["m1", "m2", "vcc", "gnd", "a", "b"], 13),
  ...col("imu", 380, 200, ["vcc", "gnd", "scl", "sda"]),
  ...col("bt", 380, 275, ["vcc", "gnd", "tx", "rx"]),
  "buck.out5": { x: 170, y: 280 }, "buck.outg": { x: 170, y: 300 }, "buck.inp": { x: 90, y: 330 }, "buck.ing": { x: 140, y: 330 },
  "cam.5v": { x: 260, y: 355 }, "cam.gnd": { x: 260, y: 368 },
  "bat.pos": { x: 100, y: 415 }, "bat.neg": { x: 100, y: 435 }, "sw.in": { x: 130, y: 415 }, "sw.out": { x: 200, y: 415 },
};
const PIN_TEXT: Record<string, string> = Object.fromEntries(Object.keys(PINS).map((k) => {
  const [pre, p] = k.split(".");
  const named: Record<string, string> = { "buck.out5": "5V out", "buck.outg": "GND", "buck.inp": "IN+", "buck.ing": "IN−", "bat.pos": "+", "bat.neg": "−", "sw.in": "in", "sw.out": "out", "uno.5v": "5V", "cam.5v": "5V" };
  if (named[k]) return [k, named[k]];
  if (pre === "motL" || pre === "motR") return [k, p.toUpperCase()];
  return [k, p.toUpperCase()];
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

function BalDiagram({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const box = (x: number, y: number, w: number, h: number, title: string, sub: string, fill: string) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke="#1f2937" strokeOpacity={0.15} />
      <text x={x + 9} y={y + 15} fontSize={10.5} fontWeight={800} fill="#ffffff">{title}</text>
      {sub && <text x={x + 9} y={y + 27} fontSize={8} fontWeight={600} fill="#ffffff" opacity={0.85}>{sub}</text>}
    </g>
  );
  return (
    <svg viewBox="0 0 720 470" className="w-full h-auto" role="img" aria-label="Circuit diagram of the BalanceBot Pro wiring">
      <rect x={0} y={0} width={720} height={470} fill="#FBF8F3" />
      {box(580, 20, 120, 420, "Arduino", "Uno R3", "#0b6e99")}
      {box(260, 20, 120, 150, "TB6612FNG", "motor driver", "#b3241f")}
      {box(30, 20, 120, 98, "Left motor", "with encoder", "#6b7280")}
      {box(30, 125, 120, 98, "Right motor", "with encoder", "#6b7280")}
      {box(260, 190, 120, 62, "MPU6050", "gyro + accel", "#2a5fb0")}
      {box(260, 265, 120, 62, "HC-05", "Bluetooth", "#2a7fd0")}
      {box(260, 345, 120, 35, "ESP32-CAM", "", "#2a2d33")}
      {box(60, 260, 110, 70, "LM2596", "5.0 V for camera", "#1d4f9c")}
      {box(20, 400, 80, 50, "3S Li-Po", "11.1 V", "#2a2d33")}
      {box(130, 400, 70, 30, "Switch", "", "#7a2a22")}
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
        const below = ["drv.vm", "buck.inp", "buck.ing"].includes(k);
        const anchorEnd = p.x === 380 || p.x === 150 || p.x === 170 || p.x === 100 || p.x === 200;
        return (
          <g key={k}>
            <circle cx={p.x} cy={p.y} r={3} fill="#151B22" />
            {t && (
              <text x={below ? p.x : p.x >= 580 ? p.x + 7 : anchorEnd ? p.x - 6 : p.x + 6} y={below ? p.y - 7 : p.y + 3.2} fontSize={8} fontWeight={700}
                textAnchor={below ? "middle" : p.x >= 580 ? "start" : anchorEnd ? "end" : "start"} fill="#ffffff">{t}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export const BAL_KIT: WorkshopKit = {
  id: "bb",
  noun: "robot",
  title: "BalanceBot Pro",
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
  wireAnchorConn: "c-ain1",
  basePart: "basePlate",
  oneOfSet: (id) => ["motorL", "motorR", "wheelL", "wheelR", "basePlate", "midPlate", "brainPlate", "topPlate"].includes(id),
  partForBom: (bomId) => PARTS.find((x) => x.bomId === bomId),
  offRobotNote: () => "",
  partFeatures: [{ key: "switch", text: "Toggle switch (power off here)", part: "switch", feature: "switch" }],
  stepDetails: {
    usb: [{ key: "usb", text: "USB port faces the back", feature: "usb" }],
    switch: [{ key: "switch", text: "Switch OFF while wiring", feature: "switch" }],
  },
  wiringOverview: ["uno", "driver", "imu", "motorL", "motorR", "battery"],
  stepOverview: ["uno", "driver", "imu", "battery"],
  wiringGroups: [
    { title: "Motor driver → Uno (step 10)", ids: ["c-pwma", "c-ain1", "c-ain2", "c-pwmb", "c-bin1", "c-bin2", "c-stby", "c-drvv", "c-drvg"] },
    { title: "MPU6050 → Uno (step 10)", ids: ["c-sda", "c-scl", "c-imuv", "c-imug"] },
    { title: "Wheel encoders → Uno (step 10)", ids: ["c-ela", "c-elb", "c-elv", "c-elg", "c-era", "c-erb", "c-erv", "c-erg"] },
    { title: "HC-05 Bluetooth → Uno (steps 10, 12)", ids: ["c-btx", "c-brx", "c-btv", "c-btg"] },
    { title: "Battery, switch, camera power and common ground (steps 11, 12)", ids: ["c-bat", "c-svm", "c-svin", "c-sbuck", "c-batg", "c-bgnd", "c-camv", "c-camg"] },
    { title: "Motors → motor driver (step 7)", ids: ["c-ml1", "c-ml2", "c-mr1", "c-mr2"] },
  ],
  pinText: PIN_TEXT,
  Diagram: BalDiagram,
  camera: {
    target: [0, 11, 0], dir: [0.62, 0.45, 0.65], dist: 66,
    explodedTarget: [0, 18, 0], explodedDist: 1.45, explodedFit: 0.95,
    // under the base plate (motors, brackets): look from low on its own side
    lowView: (c) => (c.y < 6.2 ? [c.x < -1 ? -0.7 : c.x > 1 ? 0.7 : 0.3, 0.2, 0.7] : null),
  },
  stepSpread: [1.2, 1.1, 1.2],
  intro: { spread: [1.3, 1.3, 1.3], zoom: 0.8, title: "Meet your BalanceBot Pro." },
  loadModel: () => import("./balModel").then((m) => m.buildBalModel),
};
