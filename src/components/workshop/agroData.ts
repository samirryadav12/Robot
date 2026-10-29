import type { KitConnection, KitPart, KitStepHelp, KitStepVisual } from "./kit";

/* The Smart Agro Rover workshop's knowledge, kept separate from the 3D code so it can be checked against the project
   data. Every fact here comes from src/data/projects.ts (the Smart Agro Rover BOM, pinout, steps, code, FAQ):
   - parts point at BOM ids; names, specs, quantities and prices are read from the BOM at runtime
   - connections are the pinout table plus the wiring spelled out in steps 6, 10, 11 and 12 (the 5 V rail from the
     buck converter, the RS485 pair to the N-P-K sensor, the switched battery harness, the motor pairs)
   - each step's parts, tools and wires are taken from that step's own text
   Where the data is silent or doubtful, it says so (see OPEN_QUESTIONS) instead of guessing. */

export type AgroPartId =
  | "lowerPlate" | "upperPlate" | "cover" | "standoffs" | "brackets"
  | "motorFL" | "motorFR" | "motorRL" | "motorRR" | "wheelFL" | "wheelFR" | "wheelRL" | "wheelRR"
  | "driver" | "buck" | "max485" | "sonarL" | "sonarR" | "npk" | "servo"
  | "mega" | "battery" | "switch" | "mast" | "gps" | "cam" | "wires";

const MOTORS = ["motorFL", "motorFR", "motorRL", "motorRR"] as const;
const WHEELS = ["wheelFL", "wheelFR", "wheelRL", "wheelRR"] as const;
const CORNER: Record<string, string> = { FL: "front-left", FR: "front-right", RL: "rear-left", RR: "rear-right" };

export const PARTS: (KitPart & { id: AgroPartId })[] = [
  { id: "lowerPlate", bomId: "ag-chs-01", label: "Lower carbon plate", labelled: true, onRobot: true,
    where: "The bottom deck: the motor brackets hang under it; the driver, buck converter and MAX485 sit on top (steps 1, 2, 5)." },
  { id: "upperPlate", bomId: "ag-chs-01", label: "Upper carbon plate", labelled: true, onRobot: true,
    where: "The top deck, on 40 mm standoffs: it carries the Arduino Mega, the battery and the toggle switch (step 9)." },
  { id: "cover", bomId: "ag-cov-01", label: "Clear protective cover", labelled: true, onRobot: true,
    where: "Closes the top of the rover; the mast passes through its cut-out (step 12)." },
  { id: "standoffs", bomId: "ag-hw-01", label: "M3 standoffs & fasteners", labelled: true, onRobot: true,
    where: "Six 40 mm pillars between the decks and six more under the cover (steps 1, 9, 12)." },
  { id: "brackets", bomId: "ag-brk-01", label: "Motor brackets + suspension", labelled: true, onRobot: true,
    where: "One at each corner under the lower plate, each with a spring-damper (step 2)." },
  ...MOTORS.map((id) => ({ id, bomId: "ag-mot-01", label: `${id.slice(5)} gear motor`, labelled: true, onRobot: true,
    where: `Clamped in the ${CORNER[id.slice(5)]} bracket, shaft pointing outward (step 3).` })),
  ...WHEELS.map((id) => ({ id, bomId: "ag-whl-01", label: `${id.slice(5)} off-road wheel`, labelled: true, onRobot: true,
    where: `On the ${CORNER[id.slice(5)]} motor's shaft, held by a hex coupler (step 4).` })),
  { id: "driver", bomId: "ag-drv-01", label: "L298N motor driver", labelled: true, onRobot: true,
    where: "In the middle of the lower deck on 10 mm standoffs (step 5)." },
  { id: "buck", bomId: "ag-buck-01", label: "LM2596 buck converter (5 V)", labelled: true, onRobot: true,
    where: "On the right of the lower deck; its output is the 5 V rail for the sensors, servo, GPS and camera (steps 5, 10)." },
  { id: "max485", bomId: "ag-485-01", label: "MAX485 RS485 module", labelled: true, onRobot: true,
    where: "On the left of the lower deck, between the Mega and the N-P-K sensor (steps 5, 10)." },
  { id: "sonarL", bomId: "ag-son-01", label: "Left HC-SR04 (D22/D23)", labelled: true, onRobot: true,
    where: "On the front bracket, angled a little left (step 7)." },
  { id: "sonarR", bomId: "ag-son-01", label: "Right HC-SR04 (D24/D25)", labelled: true, onRobot: true,
    where: "On the front bracket, angled a little right (step 7)." },
  { id: "npk", bomId: "ag-npk-01", label: "N-P-K soil sensor", labelled: true, onRobot: true,
    where: "Clamped to the bottom of the rack on the right-side rail, prongs pointing down (step 8)." },
  { id: "servo", bomId: "ag-srv-01", label: "MG996R probe actuator", labelled: true, onRobot: true,
    where: "At the top of the right-side rail; its pinion drives the rack that lowers the probe (step 8)." },
  { id: "mega", bomId: "ag-mcu-01", label: "Arduino Mega 2560", labelled: true, onRobot: true,
    where: "In the middle of the upper deck on 10 mm standoffs, USB port facing the rear (step 9)." },
  { id: "battery", bomId: "ag-bat-01", label: "3S Li-Po battery", labelled: true, onRobot: true,
    where: "Strapped down at the rear of the upper deck (step 9)." },
  { id: "switch", bomId: "ag-swt-01", label: "Toggle switch + XT60 lead", labelled: true, onRobot: true,
    where: "On the right edge of the upper deck, in reach from outside (steps 9, 11)." },
  { id: "mast", bomId: "ag-mst-01", label: "Camera & GPS mast", labelled: true, onRobot: true,
    where: "Bolted to the centre-rear of the upper deck, through the cover's cut-out (step 12)." },
  { id: "gps", bomId: "ag-gps-01", label: "NEO-6M GPS + antenna", labelled: true, onRobot: true,
    where: "On top of the mast, antenna facing the sky (step 12)." },
  { id: "cam", bomId: "ag-cam-01", label: "ESP32-CAM (OV2640)", labelled: true, onRobot: true,
    where: "On the mast just under the GPS, lens facing forward (step 12)." },
  { id: "wires", bomId: "ag-wir-01", label: "Jumpers & silicone wire", labelled: true, onRobot: true,
    where: "Jumpers from every module up to the Mega; silicone wire for the battery harness and motors (steps 6, 10, 11, 12)." },
];

/* ---------- connections ---------- */
const sig = (id: string, part: string, t: string, name: string, pin: string, pinName: string, color: string, purpose: string, source: string, kind: "Digital" | "PWM" = "Digital", warning?: string): KitConnection => ({
  id, from: { part, terminal: t, name }, to: { part: "mega", terminal: `mega.${pin}`, name: `Mega ${pinName}` }, color, kind, jumper: true, purpose, warning, source,
});
const rail = (part: string, pre: string, key: string, name: string, vcc: string, gnd: string, source: string): KitConnection[] => [
  { id: `c-${key}v`, from: { part, terminal: `${pre}.${vcc}`, name: `${name} ${vcc.toUpperCase()}` }, to: { part: "buck", terminal: "buck.out5", name: "Buck 5 V out" },
    color: "Red", colorNote: "the guide doesn't give the 5 V rail wire colours", kind: "Power", jumper: true, purpose: `Powers the ${name} from the 5 V rail.`, source },
  { id: `c-${key}g`, from: { part, terminal: `${pre}.${gnd}`, name: `${name} GND` }, to: { part: "buck", terminal: "buck.outg", name: "Buck GND out" },
    color: "Black", colorNote: "the guide doesn't give the 5 V rail wire colours", kind: "Ground", jumper: true, purpose: `Ground for the ${name}.`, source },
];
const drv = (id: string, inp: string, pin: string, pinName: string, color: string, purpose: string, kind: "Digital" | "PWM" = "Digital") =>
  sig(id, "driver", `drv.${inp.toLowerCase()}`, `L298N ${inp}`, pin, pinName, color, purpose, "Pinout table · step 10", kind,
    kind === "PWM" ? "Remove the ENA/ENB jumper caps so the Mega controls the speed (step 10)." : undefined);
const motor = (id: string, m: string, out: number, color: string): KitConnection => ({
  id, from: { part: `motor${m}`, terminal: `mot${m}.${out % 2 ? "a" : "b"}`, name: `${m} motor wire` },
  to: { part: "driver", terminal: `drv.out${out}`, name: `L298N OUT${out}` },
  color, colorNote: "motor wire colour varies by supplier", kind: "Motor", jumper: false,
  purpose: `Drives the ${CORNER[m]} wheel, in parallel with the other ${m.endsWith("L") ? "left" : "right"} motor.`,
  warning: out % 2 ? "Wire the front and rear motor on each side the same way round (step 6)." : undefined,
  source: "Step 6",
});

export const CONNECTIONS: KitConnection[] = [
  drv("c-ena", "ENA", "d5", "D5 (PWM)", "White", "Sets the speed of the left motor pair.", "PWM"),
  drv("c-in1", "IN1", "d8", "D8", "Blue", "Left pair forward."),
  drv("c-in2", "IN2", "d9", "D9", "Purple", "Left pair backward."),
  drv("c-in3", "IN3", "d10", "D10", "Orange", "Right pair forward."),
  drv("c-in4", "IN4", "d11", "D11", "Brown", "Right pair backward."),
  drv("c-enb", "ENB", "d6", "D6 (PWM)", "Gray", "Sets the speed of the right motor pair.", "PWM"),
  sig("c-tl", "sonarL", "sonarL.trig", "Left sonar Trig", "d22", "D22", "Yellow", "Sends the left sensor's sound pulse.", "Pinout table · step 10"),
  sig("c-el", "sonarL", "sonarL.echo", "Left sonar Echo", "d23", "D23", "Green", "Times the left sensor's echo.", "Pinout table · step 10"),
  sig("c-tr", "sonarR", "sonarR.trig", "Right sonar Trig", "d24", "D24", "Yellow", "Sends the right sensor's sound pulse.", "Pinout table · step 10"),
  sig("c-er", "sonarR", "sonarR.echo", "Right sonar Echo", "d25", "D25", "Green", "Times the right sensor's echo.", "Pinout table · step 10"),
  sig("c-gtx", "gps", "gps.tx", "GPS TX", "rx1", "RX1 (D19)", "Yellow", "Position data from the GPS at 9600 baud.", "Pinout table · step 12"),
  sig("c-grx", "gps", "gps.rx", "GPS RX", "tx1", "TX1 (D18)", "Blue", "Optional configuration commands to the GPS.", "Pinout table · step 12"),
  sig("c-ro", "max485", "m485.ro", "MAX485 RO", "rx2", "RX2 (D17)", "Green", "Soil readings coming back from the N-P-K sensor.", "Pinout table · step 10"),
  sig("c-di", "max485", "m485.di", "MAX485 DI", "tx2", "TX2 (D16)", "White", "Read requests going out to the N-P-K sensor.", "Pinout table · step 10"),
  sig("c-de", "max485", "m485.de", "MAX485 DE + RE", "d4", "D4", "Orange", "HIGH to send, LOW to listen.", "Pinout table · step 10", "Digital", "Join DE and RE on the module so one pin switches both."),
  sig("c-ctx", "cam", "cam.u0t", "ESP32-CAM U0T", "rx3", "RX3 (D15)", "Yellow", "Photo confirmations from the camera.", "Pinout table · step 12"),
  sig("c-crx", "cam", "cam.u0r", "ESP32-CAM U0R", "tx3", "TX3 (D14)", "Blue", "The SNAP command that triggers a photo.", "Pinout table · step 12", "Digital",
    "The ESP32 is a 3.3 V part: put a 1 kΩ/2 kΩ voltage divider in this wire (step 12)."),
  sig("c-srv", "servo", "servo.sig", "Probe servo signal", "d3", "D3 (PWM)", "Orange", "Lowers and lifts the N-P-K probe.", "Pinout table · step 10", "PWM"),
  // the RS485 pair between the sensor and the MAX485
  { id: "c-a", from: { part: "npk", terminal: "npk.a", name: "N-P-K A (yellow)" }, to: { part: "max485", terminal: "m485.a", name: "MAX485 A" }, color: "Yellow", kind: "Digital", jumper: false,
    purpose: "RS485 data line A.", warning: "A to A and B to B: swapped, the sensor never answers.", source: "Step 10" },
  { id: "c-b", from: { part: "npk", terminal: "npk.b", name: "N-P-K B (blue)" }, to: { part: "max485", terminal: "m485.b", name: "MAX485 B" }, color: "Blue", kind: "Digital", jumper: false,
    purpose: "RS485 data line B.", source: "Step 10" },
  // the 5 V rail from the buck converter
  ...rail("sonarL", "sonarL", "l5", "left sonar", "vcc", "gnd", "Step 10"),
  ...rail("sonarR", "sonarR", "r5", "right sonar", "vcc", "gnd", "Step 10"),
  ...rail("max485", "m485", "m5", "MAX485", "vcc", "gnd", "Step 10"),
  ...rail("servo", "servo", "s5", "probe servo", "vplus", "gnd", "Step 10"),
  ...rail("gps", "gps", "g5", "GPS", "vcc", "gnd", "Step 12"),
  ...rail("cam", "cam", "c5", "ESP32-CAM", "5v", "gnd", "Step 12"),
  // the switched battery harness
  { id: "c-bat", from: { part: "battery", terminal: "bat.pos", name: "Battery + (XT60)" }, to: { part: "switch", terminal: "sw.in", name: "Toggle switch in" }, color: "Red", kind: "Power", jumper: false,
    purpose: "Battery positive into the toggle switch.", warning: "Switch OFF and battery unplugged while wiring (step 11).", source: "Step 11" },
  { id: "c-sdrv", from: { part: "switch", terminal: "sw.out", name: "Switched +" }, to: { part: "driver", terminal: "drv.12v", name: "L298N 12V In" }, color: "Red", kind: "Power", jumper: false,
    purpose: "Battery power for the motors.", source: "Pinout table · step 11" },
  { id: "c-svin", from: { part: "switch", terminal: "sw.out", name: "Switched +" }, to: { part: "mega", terminal: "mega.vin", name: "Mega VIN" }, color: "Red", kind: "Power", jumper: false,
    purpose: "11.1 V into the Mega's own regulator.", source: "Pinout table · step 11" },
  { id: "c-sbuck", from: { part: "switch", terminal: "sw.out", name: "Switched +" }, to: { part: "buck", terminal: "buck.inp", name: "Buck IN+" }, color: "Red", kind: "Power", jumper: false,
    purpose: "Feeds the buck converter that makes the 5 V rail.", warning: "Set the buck to 5.0 V before connecting anything to its output (step 5).", source: "Step 11" },
  { id: "c-snpk", from: { part: "npk", terminal: "npk.vplus", name: "N-P-K V+ (brown)" }, to: { part: "switch", terminal: "sw.out", name: "Switched +" }, color: "Brown", kind: "Power", jumper: false,
    purpose: "The N-P-K sensor needs 9–24 V, so it runs straight from the battery.", source: "Step 11" },
  // one common ground, at the driver's GND terminal
  { id: "c-batg", from: { part: "battery", terminal: "bat.neg", name: "Battery − (XT60)" }, to: { part: "driver", terminal: "drv.gnd", name: "Common GND" }, color: "Black", kind: "Ground", jumper: false,
    purpose: "Battery negative onto the common ground.", source: "Pinout table · step 11" },
  { id: "c-mgnd", from: { part: "mega", terminal: "mega.gnd", name: "Mega GND" }, to: { part: "driver", terminal: "drv.gnd", name: "Common GND" }, color: "Black", kind: "Ground", jumper: true,
    purpose: "The Mega's ground on the common point.", warning: "CRITICAL: every board must share this ground (step 11).", source: "Pinout table · step 11" },
  { id: "c-bgnd", from: { part: "buck", terminal: "buck.ing", name: "Buck GND in" }, to: { part: "driver", terminal: "drv.gnd", name: "Common GND" }, color: "Black", kind: "Ground", jumper: false,
    purpose: "The buck converter's ground (shared by its 5 V rail) on the common point.", source: "Pinout table · step 11" },
  { id: "c-ngnd", from: { part: "npk", terminal: "npk.gnd", name: "N-P-K GND (black)" }, to: { part: "driver", terminal: "drv.gnd", name: "Common GND" }, color: "Black", kind: "Ground", jumper: false,
    purpose: "The sensor's ground on the common point.", source: "Step 11" },
  // the motor pairs
  motor("c-mFL1", "FL", 1, "Red"), motor("c-mFL2", "FL", 2, "Black"), motor("c-mRL1", "RL", 1, "Red"), motor("c-mRL2", "RL", 2, "Black"),
  motor("c-mFR1", "FR", 3, "Red"), motor("c-mFR2", "FR", 4, "Black"), motor("c-mRR1", "RR", 3, "Red"), motor("c-mRR2", "RR", 4, "Black"),
];

export const OPEN_QUESTIONS = [
  "This build guide was written for the Smart Agro Rover concept images; prices and part choices are estimates, so check them against your suppliers.",
  "A full 3S Li-Po is 12.6 V, close to the top of the Mega's 7–12 V VIN range. It works, but the Mega's regulator runs warm; feeding the Mega's 5 V pin from the buck converter instead is a common alternative.",
  "The ESP32-CAM runs at 3.3 V. The Mega's TX3 is 5 V, so the guide puts a 1 kΩ/2 kΩ divider in that wire. The ESP32-CAM also needs its own photo sketch, which isn't part of this project's code.",
  "The N-P-K register addresses (0x1E, 0x1F, 0x20 at address 1, 4800 baud) are the common JXCT defaults; other sensor brands use different ones.",
  "Four 25GA370 motors can draw more than the L298N's 2 A per channel when stalling in heavy soil. A beefier driver (e.g. BTS7960 pair) suits rough ground better.",
];

const SIG = ["c-tl", "c-el", "c-tr", "c-er"];
const RAIL_10 = ["c-l5v", "c-l5g", "c-r5v", "c-r5g", "c-m5v", "c-m5g", "c-s5v", "c-s5g"];
export const STEP_VISUALS: Record<number, KitStepVisual> = {
  1: { parts: ["lowerPlate", "upperPlate", "cover", "standoffs"], focus: ["lowerPlate"], exploded: true, tools: ["A clean table", "Dust mask"] },
  2: { parts: ["brackets", "lowerPlate"], focus: ["brackets"], tools: ["Screwdriver", "M3 screws and lock nuts"] },
  3: { parts: [...MOTORS, "brackets"], focus: [...MOTORS], tools: ["Screwdriver", "Marker or tape labels"] },
  4: { parts: [...WHEELS], focus: [...WHEELS], tools: ["Hex key", "Thread-lock"] },
  5: { parts: ["driver", "buck", "max485", "lowerPlate"], focus: ["driver", "buck", "max485"], tools: ["Screwdriver", "Multimeter (to set 5.0 V)", "10 mm standoffs"] },
  6: { parts: [...MOTORS, "driver"], connections: ["c-mFL1", "c-mFL2", "c-mRL1", "c-mRL2", "c-mFR1", "c-mFR2", "c-mRR1", "c-mRR2"], focus: ["driver"], tools: ["Small flathead screwdriver", "Wire stripper"] },
  7: { parts: ["sonarL", "sonarR"], focus: ["sonarL", "sonarR"], tools: ["Screwdriver"] },
  8: { parts: ["npk", "servo"], focus: ["npk", "servo"], tools: ["Screwdriver", "Servo tester or the Arduino (to centre the servo)"] },
  9: { parts: ["upperPlate", "standoffs", "mega", "battery", "switch"], focus: ["upperPlate", "mega", "battery"], detail: "usb", tools: ["Screwdriver", "Velcro battery strap"] },
  10: { parts: ["mega", "driver", "sonarL", "sonarR", "max485", "servo", "npk", "buck", "wires"],
    connections: ["c-ena", "c-in1", "c-in2", "c-in3", "c-in4", "c-enb", ...SIG, "c-ro", "c-di", "c-de", "c-srv", "c-a", "c-b", ...RAIL_10],
    focus: ["mega", "driver"], tools: ["Small cable ties"], seeThrough: ["upperPlate"] },
  11: { parts: ["battery", "switch", "driver", "mega", "buck", "npk", "wires"], connections: ["c-bat", "c-sdrv", "c-svin", "c-sbuck", "c-snpk", "c-batg", "c-mgnd", "c-bgnd", "c-ngnd"], focus: ["switch", "battery"], detail: "switch", seeThrough: ["upperPlate"] },
  12: { parts: ["mast", "gps", "cam", "cover", "wires"], connections: ["c-gtx", "c-grx", "c-ctx", "c-crx", "c-g5v", "c-g5g", "c-c5v", "c-c5g"], focus: ["mast", "gps", "cam"], tools: ["1 kΩ and 2 kΩ resistors", "Screwdriver"] },
  13: { parts: [], track: true, tools: ["Computer with the Arduino app", "USB cable", "A watered test patch of soil"] },
};

export const INSTALLED_AT: Record<AgroPartId, number> = {
  lowerPlate: 1, upperPlate: 9, cover: 12, standoffs: 9, brackets: 2,
  motorFL: 3, motorFR: 3, motorRL: 3, motorRR: 3, wheelFL: 4, wheelFR: 4, wheelRL: 4, wheelRR: 4,
  driver: 5, buck: 5, max485: 5, sonarL: 7, sonarR: 7, npk: 8, servo: 8,
  mega: 9, battery: 9, switch: 9, mast: 12, gps: 12, cam: 12, wires: 6,
};

/* ---------- beginner guidance, every line traced back to the project data ---------- */

export const CONNECTION_LEVEL: Record<string, string> = Object.fromEntries([
  ...["c-in1", "c-in2", "c-in3", "c-in4", "c-de", ...SIG].map((id) => [id, "5 V logic signal (the Mega is a 5 V board)."]),
  ...["c-ena", "c-enb", "c-srv"].map((id) => [id, "5 V PWM signal from the Mega."]),
  ["c-gtx", "Serial data at 9600 baud into RX1."], ["c-grx", "Serial data from TX1 (optional)."],
  ["c-ro", "Serial data at 4800 baud into RX2."], ["c-di", "Serial data from TX2."],
  ["c-ctx", "3.3 V serial data into RX3 (the Mega reads it fine)."], ["c-crx", "5 V serial data from TX3: divide it down to 3.3 V."],
  ["c-a", "RS485 differential pair, line A."], ["c-b", "RS485 differential pair, line B."],
  ...CONNECTIONS.filter((c) => c.to.terminal === "buck.out5").map((c) => [c.id, "5 V from the buck converter. Polarity matters."]),
  ...CONNECTIONS.filter((c) => c.to.terminal === "buck.outg" || c.to.terminal === "drv.gnd").map((c) => [c.id, "0 V common ground."]),
  ...["c-bat", "c-sdrv", "c-svin", "c-sbuck", "c-snpk"].map((id) => [id, "Battery positive: 11.1 V nominal, 12.6 V when full. Polarity matters."]),
  ...CONNECTIONS.filter((c) => c.kind === "Motor").map((c) => [c.id, "Motor output from the driver. Swapping a pair reverses that side."]),
]);

const motorGuide = { need: "Each motor drives one wheel; the two on each side are wired together, so the rover steers like a tank.", tip: "Label each motor's wires (FL, FR, RL, RR) as you mount it.", tipSource: "Step 3 tip" };
const wheelGuide = { need: "Deep tread grips loose soil and grass where smooth wheels would spin.", tip: "Thread-lock the coupler grub screws: field vibration loosens them.", tipSource: "Step 4 tip" };
const sonarGuide = (side: string) => ({ need: `It watches ahead-${side} so the rover stops before plants, stakes or people.`, tip: "Mount it high enough not to see the ground or short grass.", tipSource: "Step 7 tip" });
export const PART_GUIDE: Record<AgroPartId, { need: string; tip: string; tipSource: string }> = {
  lowerPlate: { need: "The bottom deck carries the drive electronics and holds the motor brackets.", tip: "Never sand carbon fibre without a mask.", tipSource: "Step 1 tip" },
  upperPlate: { need: "The top deck carries the Mega and the battery above the drive electronics.", tip: "Pass every wire from below up through the slot before fitting it.", tipSource: "Step 9" },
  cover: { need: "It keeps dust, dew and leaves off the electronics in the field.", tip: "Fit it last, after the mast and its wiring.", tipSource: "Step 12" },
  standoffs: { need: "They stack the decks and hold each board clear of the carbon plates.", tip: "Sort the 40 mm and 10 mm standoffs before you start.", tipSource: "Step 1 checkpoints" },
  brackets: { need: "Each wheel can follow uneven ground on its own spring.", tip: "Fit all four springs the same way round so the rover sits level.", tipSource: "Step 2 tip" },
  motorFL: motorGuide, motorFR: motorGuide, motorRL: motorGuide, motorRR: motorGuide,
  wheelFL: wheelGuide, wheelFR: wheelGuide, wheelRL: wheelGuide, wheelRR: wheelGuide,
  driver: { need: "The Mega can't power the motors; the driver switches battery current to each side.", tip: "Remove the ENA/ENB caps so the Mega controls the speed.", tipSource: "Step 10 checkpoints" },
  buck: { need: "It turns the 11.1 V battery into the 5 V rail for the servo, sensors, GPS and camera.", tip: "Set it to 5.0 V with a multimeter before connecting anything to it.", tipSource: "Step 5 tip" },
  max485: { need: "It converts the Mega's serial signals to the RS485 the N-P-K sensor speaks.", tip: "Join DE and RE so one pin switches between sending and listening.", tipSource: "Step 10" },
  sonarL: sonarGuide("left"), sonarR: sonarGuide("right"),
  npk: { need: "The rover's main instrument: it measures nitrogen, phosphorus and potassium in the soil.", tip: "It only reads well in moist soil: water a test patch first.", tipSource: "Step 13 tip, FAQ" },
  servo: { need: "It pushes the probe into the soil at each stop and lifts it before driving on.", tip: "Centre the servo at 90° before fitting the pinion.", tipSource: "Step 8 tip" },
  mega: { need: "It runs the rover: driving, obstacle stops, sampling, GPS tagging and photo commands.", tip: "It needs its three spare serial ports, which is why it's a Mega, not an Uno.", tipSource: "FAQ" },
  battery: { need: "It powers the motors directly and everything else through VIN and the buck converter.", tip: "Mount it at the rear to balance the probe actuator.", tipSource: "Step 9 tip" },
  switch: { need: "One flick cuts all power, so the rover can be stopped fast in the field.", tip: "Keep it OFF while wiring.", tipSource: "Step 11 checkpoints" },
  mast: { need: "Height gives the camera a view over the crop and the GPS a clear sky.", tip: "Nothing metal above the GPS antenna.", tipSource: "Step 12 checkpoints" },
  gps: { need: "It tags each soil reading and photo with where it was taken.", tip: "The first fix outdoors can take a few minutes.", tipSource: "Step 12 tip" },
  cam: { need: "It photographs the crop at every stop.", tip: "Its RX needs a voltage divider: it's a 3.3 V part.", tipSource: "Step 12 checkpoints" },
  wires: { need: "Jumpers carry the signals; silicone wire carries battery and motor current.", tip: "Keep sensor wires away from motor wires to avoid noise.", tipSource: "Step 10 tip" },
};

export const STEP_HELP: Record<number, KitStepHelp> = {
  1: { mistake: "Mixing up the 40 mm and 10 mm standoffs.", check: "Mast cut-out not lined up with the top plate slot? Turn the cover.", source: "Step 1" },
  2: { mistake: "Fitting the springs in different directions, so the rover leans.", check: "A bracket won't spring back? Loosen its pivot screw slightly.", source: "Step 2 checkpoints" },
  3: { mistake: "Forgetting to label the motor wires.", check: "Shafts not square to the plate? Re-tighten the clamp evenly.", source: "Step 3" },
  4: { mistake: "Tightening the grub screw on the round part of the shaft.", check: "Wheel wobbles? Re-seat the coupler on the D-flat.", source: "Step 4 checkpoints" },
  5: { mistake: "Connecting the buck converter before setting it to 5.0 V.", safety: "An unset buck converter can put out far more than 5 V and destroy the sensors.", check: "Driver crowded? Leave air around its heatsink.", source: "Step 5 tip" },
  6: { mistake: "Wiring the front and rear motor on one side opposite ways round.", safety: "Battery unplugged while wiring.", check: "One wheel fights the other later? Swap that motor's two wires.", source: "Step 6" },
  7: { mistake: "Mounting the sensors so low they see the ground.", check: "Wires can't reach? Turn the sensors pins-up.", source: "Step 7" },
  8: { mistake: "Fitting the pinion before centring the servo.", check: "Rack catches? Check the rail is straight and the pinion meshes fully.", source: "Step 8 checkpoints" },
  9: { mistake: "Fitting the upper plate before passing the wires up through the slot.", check: "Battery loose? Tighten the strap.", source: "Step 9" },
  10: { mistake: "Leaving the ENA/ENB caps on, so the speed pins do nothing.", check: "N-P-K always -1? Check A/B, DE+RE on D4, and the sensor's 12 V.", source: "Step 10 checkpoints, FAQ" },
  11: { mistake: "Missing the common ground between the boards.", safety: "Switch OFF and battery unplugged while wiring.", check: "Mega resets when the motors start? Check the ground joints.", source: "Step 11" },
  12: { mistake: "Wiring the ESP32-CAM's RX straight to the 5 V TX3.", check: "No GPS fix? Go outside under open sky and wait a few minutes.", source: "Step 12 checkpoints, FAQ" },
  13: { mistake: "Testing in dry soil, where N-P-K reads near zero.", safety: "General: test on open ground, away from roads, with the switch in reach.", check: "No readings? Open the Serial Monitor at 115200 baud and check the wiring of the failing device.", source: "Step 13, FAQ" },
};

export const TOOLS: string[] = Array.from(new Set(Object.values(STEP_VISUALS).flatMap((v) => v.tools ?? [])));
