import type { KitConnection, KitPart, KitStepHelp, KitStepVisual } from "./kit";

/* The RoboMaze Ultrasonic Solver workshop's knowledge, kept separate from the 3D code so it can be checked against
   the project data. Every fact here comes from src/data/projects.ts (the RoboMaze BOM, pinout, steps, code, FAQ):
   - parts point at BOM ids; names, specs, quantities and prices are read from the BOM at runtime
   - connections are the pinout table plus the wiring spelled out in steps 9–11 (sensor power rails, battery,
     motors, the common ground)
   - each step's parts, tools and wires are taken from that step's own text
   Where the data is silent or doubtful, it says so (see OPEN_QUESTIONS) instead of guessing. */

export type MazePartId =
  | "chassis" | "casters" | "motorL" | "motorR" | "wheelL" | "wheelR" | "brackets" | "sensorL" | "sensorC" | "sensorR"
  | "breadboard" | "nano" | "driver" | "holder" | "cells" | "wires";

export const PARTS: (KitPart & { id: MazePartId })[] = [
  { id: "chassis", bomId: "mz-chs-01", label: "Narrow acrylic chassis", labelled: true, onRobot: true,
    where: "The base: a slim 3 mm clear plate (about 140 × 90 mm). Motors hang underneath; the breadboard, driver and battery box sit on top (steps 1, 3, 7, 8)." },
  { id: "casters", bomId: "mz-cst-01", label: "Front & rear ball casters", labelled: true, onRobot: true,
    where: "One under the front centre and one under the rear centre, so the narrow robot rests on four points (step 2)." },
  { id: "motorL", bomId: "mz-mot-01", label: "Left TT gear motor", labelled: true, onRobot: true,
    where: "Under the plate at the centre on the left, axle pointing out through the wheel cutout (step 3)." },
  { id: "motorR", bomId: "mz-mot-01", label: "Right TT gear motor", labelled: true, onRobot: true,
    where: "Under the plate at the centre on the right, axle pointing out through the wheel cutout (step 3)." },
  { id: "wheelL", bomId: "mz-whl-01", label: "Left 65 mm wheel", labelled: true, onRobot: true,
    where: "Press-fitted onto the left motor's flat-sided axle (step 4)." },
  { id: "wheelR", bomId: "mz-whl-01", label: "Right 65 mm wheel", labelled: true, onRobot: true,
    where: "Press-fitted onto the right motor's flat-sided axle (step 4)." },
  { id: "brackets", bomId: "mz-brk-01", label: "Sensor brackets ×3", labelled: true, onRobot: true,
    where: "On the front nose: centre bracket straight ahead, left and right brackets angled outward (step 5)." },
  { id: "sensorL", bomId: "mz-sen-01", label: "Left HC-SR04 (D2/D3)", labelled: true, onRobot: true,
    where: "In the left bracket, measuring the distance to the left wall (step 6)." },
  { id: "sensorC", bomId: "mz-sen-01", label: "Front HC-SR04 (D4/D5)", labelled: true, onRobot: true,
    where: "In the centre bracket, looking straight ahead for dead ends (step 6)." },
  { id: "sensorR", bomId: "mz-sen-01", label: "Right HC-SR04 (D6/D7)", labelled: true, onRobot: true,
    where: "In the right bracket, measuring the distance to the right wall (step 6)." },
  { id: "breadboard", bomId: "mz-bb-01", label: "Mini breadboard", labelled: true, onRobot: true,
    where: "Stuck to the middle of the top deck; its rails share 5V and GND with all three sensors (steps 7 and 10)." },
  { id: "nano", bomId: "mz-mcu-01", label: "Arduino Nano", labelled: true, onRobot: true,
    where: "Plugged into the breadboard across its centre trench, USB port facing the rear (step 7)." },
  { id: "driver", bomId: "mz-drv-01", label: "L298N motor driver", labelled: true, onRobot: true,
    where: "On M3 standoffs behind the breadboard (step 8)." },
  { id: "holder", bomId: "mz-pwr-01", label: "2× 18650 holder + switch", labelled: true, onRobot: true,
    where: "Screwed down at the rear of the top plate, its slide switch within reach (step 8)." },
  { id: "cells", bomId: "mz-bat-01", label: "18650 Li-ion cells", labelled: true, onRobot: true,
    where: "Inside the battery holder, two in series for 7.4 V." },
  { id: "wires", bomId: "mz-wir-01", label: "DuPont jumper wires", labelled: true, onRobot: true,
    where: "From the three sensors and the driver to the breadboard and the Nano (steps 10 and 11)." },
];

type Side = { id: "sensorL" | "sensorC" | "sensorR"; key: string; name: string; trig: string; echo: string };
const SENSORS: Side[] = [
  { id: "sensorL", key: "l", name: "Left sensor", trig: "D2", echo: "D3" },
  { id: "sensorC", key: "c", name: "Front sensor", trig: "D4", echo: "D5" },
  { id: "sensorR", key: "r", name: "Right sensor", trig: "D6", echo: "D7" },
];
const where: Record<string, string> = { l: "the left wall", c: "obstacles ahead", r: "the right wall" };
const drv = (id: string, inp: string, pin: string, color: string, purpose: string): KitConnection => ({
  id, from: { part: "driver", terminal: `drv.${inp.toLowerCase()}`, name: `L298N ${inp}` }, to: { part: "nano", terminal: `nano.${pin.toLowerCase()}`, name: `Nano ${pin}` },
  color, kind: "Digital", jumper: true, purpose, source: "Pinout table · step 11",
});
const motor = (id: string, side: "L" | "R", out: number, color: string): KitConnection => ({
  id, from: { part: side === "L" ? "motorL" : "motorR", terminal: `mot${side}.${out % 2 ? "a" : "b"}`, name: `${side === "L" ? "Left" : "Right"} motor wire` },
  to: { part: "driver", terminal: `drv.out${out}`, name: `L298N OUT${out}` },
  color, colorNote: "motor wire colour varies by supplier", kind: "Motor", jumper: false,
  purpose: `Drives the ${side === "L" ? "left" : "right"} wheel.`,
  warning: out % 2 ? "Clamp bare copper, not insulation, and let no loose strand touch the next terminal (step 9)." : undefined,
  source: "Step 9",
});

export const CONNECTIONS: KitConnection[] = [
  ...SENSORS.flatMap((s): KitConnection[] => [
    { id: `c-t${s.key}`, from: { part: s.id, terminal: `${s.id}.trig`, name: `${s.name} Trig` }, to: { part: "nano", terminal: `nano.${s.trig.toLowerCase()}`, name: `Nano ${s.trig}` },
      color: "Yellow", kind: "Digital", jumper: true, purpose: `Sends the 10 µs sound pulse from the ${s.name.toLowerCase()}.`, source: "Pinout table · step 10" },
    { id: `c-e${s.key}`, from: { part: s.id, terminal: `${s.id}.echo`, name: `${s.name} Echo` }, to: { part: "nano", terminal: `nano.${s.echo.toLowerCase()}`, name: `Nano ${s.echo}` },
      color: "Green", kind: "Digital", jumper: true, purpose: `Listens for the sound echo returning from ${where[s.key]}.`,
      warning: s.key === "l" ? "Trig and Echo are easy to swap: check each pair against the pin table (step 10)." : undefined, source: "Pinout table · step 10" },
    { id: `c-v${s.key}`, from: { part: s.id, terminal: `${s.id}.vcc`, name: `${s.name} VCC` }, to: { part: "breadboard", terminal: "bb.5v", name: "Breadboard 5V rail" },
      color: "Red", colorNote: "the guide doesn't give the sensor power wire colours", kind: "Power", jumper: true, purpose: "Powers the sensor from the shared 5V rail.", source: "Step 10" },
    { id: `c-g${s.key}`, from: { part: s.id, terminal: `${s.id}.gnd`, name: `${s.name} GND` }, to: { part: "breadboard", terminal: "bb.gnd", name: "Breadboard GND rail" },
      color: "Black", colorNote: "the guide doesn't give the sensor power wire colours", kind: "Ground", jumper: true, purpose: "Ground for the sensor, on the shared GND rail.", source: "Step 10" },
  ]),
  drv("c-in1", "IN1", "D8", "Blue", "Drives the left wheel forward."),
  drv("c-in2", "IN2", "D9", "Purple", "Drives the left wheel backward."),
  drv("c-in3", "IN3", "D10", "Blue", "Drives the right wheel forward."),
  drv("c-in4", "IN4", "D11", "Purple", "Drives the right wheel backward."),
  { id: "c-5v", from: { part: "driver", terminal: "drv.5v", name: "L298N +5V out" }, to: { part: "nano", terminal: "nano.vin", name: "Nano VIN" }, color: "Red", kind: "Power", jumper: true,
    purpose: "Supplies regulated power from the driver to the Nano.", warning: "The driver's 5V regulator jumper must be fitted (step 11). See the note below about VIN.", source: "Pinout table · step 11" },
  { id: "c-rail", from: { part: "nano", terminal: "nano.5v", name: "Nano 5V" }, to: { part: "breadboard", terminal: "bb.5v", name: "Breadboard 5V rail" }, color: "Red",
    colorNote: "the guide doesn't say what feeds the 5V rail", kind: "Power", jumper: true, purpose: "Feeds the breadboard's 5V rail that the three sensors share.", source: "Step 10 (implied)" },
  { id: "c-ngnd", from: { part: "nano", terminal: "nano.gnd", name: "Nano GND" }, to: { part: "breadboard", terminal: "bb.gnd", name: "Breadboard GND rail" }, color: "Black", kind: "Ground", jumper: true,
    purpose: "The Nano's ground on the common rail.", source: "Pinout table · step 11" },
  { id: "c-dgnd", from: { part: "driver", terminal: "drv.gnd", name: "L298N GND" }, to: { part: "breadboard", terminal: "bb.gnd", name: "Breadboard GND rail" }, color: "Black", kind: "Ground", jumper: true,
    purpose: "Joins the driver's ground to the common rail.", warning: "CRITICAL: battery (−), driver GND and Nano GND must all be joined (step 11).", source: "Pinout table · step 11" },
  { id: "c-bat+", from: { part: "holder", terminal: "bat.pos", name: "Battery + (red, via switch)" }, to: { part: "driver", terminal: "drv.12v", name: "L298N 12V In" }, color: "Red", kind: "Power", jumper: false,
    purpose: "Switched 7.4 V battery power into the driver.", warning: "Switch OFF while wiring. Red to 12V In, black to GND.", source: "Step 11" },
  { id: "c-bat-", from: { part: "holder", terminal: "bat.neg", name: "Battery − (black)" }, to: { part: "driver", terminal: "drv.gnd", name: "L298N GND" }, color: "Black", kind: "Ground", jumper: false,
    purpose: "Battery negative, joined to the common ground.", source: "Pinout table · step 11" },
  motor("c-motL1", "L", 1, "Red"), motor("c-motL2", "L", 2, "Black"), motor("c-motR1", "R", 3, "Red"), motor("c-motR2", "R", 4, "Black"),
];

export const OPEN_QUESTIONS = [
  "The guide wires the driver's +5V out to the Nano's VIN pin. VIN normally expects 7–12 V; a regulated 5 V supply usually goes to the Nano's 5V pin instead. Check your Nano's documentation before powering it this way.",
  "The guide puts all three sensors on the breadboard's 5V and GND rails but doesn't say what feeds the 5V rail. A jumper from the Nano's 5V pin is shown.",
  "ENA and ENB aren't in the pinout, and the program only switches IN1–IN4 on and off, so the driver's ENA/ENB jumper caps stay fitted (full speed).",
  "The project lists 15 parts, but its BOM has 12 lines. Screws, nuts and standoffs (steps 2, 3, 8) aren't listed.",
];

const SENSOR_IDS = ["sensorL", "sensorC", "sensorR"];
const SIG = ["c-tl", "c-el", "c-tc", "c-ec", "c-tr", "c-er"];
export const STEP_VISUALS: Record<number, KitStepVisual> = {
  1: { parts: ["chassis"], focus: ["chassis"], tools: ["A clean table"] },
  2: { parts: ["casters", "chassis"], focus: ["casters"], tools: ["Screwdriver", "M3 screws and nuts"] },
  3: { parts: ["motorL", "motorR", "chassis"], focus: ["motorL", "motorR"], tools: ["Screwdriver", "M3 bolts and lock nuts"] },
  4: { parts: ["wheelL", "wheelR"], focus: ["wheelL", "wheelR"] },
  5: { parts: ["brackets"], focus: ["brackets"], tools: ["Screwdriver"] },
  6: { parts: SENSOR_IDS, focus: SENSOR_IDS, tools: ["Drop of glue or zip ties"] },
  7: { parts: ["breadboard", "nano"], focus: ["breadboard", "nano"], detail: "usb" },
  8: { parts: ["driver", "holder", "cells"], focus: ["driver", "holder"], detail: "switch", tools: ["Screwdriver", "M3 standoffs"] },
  9: { parts: ["motorL", "motorR", "driver"], connections: ["c-motL1", "c-motL2", "c-motR1", "c-motR2"], focus: ["driver"], tools: ["Small flathead screwdriver", "Wire stripper"] },
  10: { parts: [...SENSOR_IDS, "breadboard", "nano", "wires"], connections: [...SIG, "c-vl", "c-gl", "c-vc", "c-gc", "c-vr", "c-gr", "c-rail"], focus: ["breadboard", "sensorC"], tools: ["Small cable ties"] },
  11: { parts: ["driver", "nano", "holder", "wires"], connections: ["c-in1", "c-in2", "c-in3", "c-in4", "c-5v", "c-ngnd", "c-dgnd", "c-bat+", "c-bat-"], focus: ["driver", "nano"], detail: "switch" },
  12: { parts: [], track: true, tools: ["Computer with the Arduino app", "USB cable", "Cardboard maze walls (25–30 cm corridors)"] },
};

export const INSTALLED_AT: Record<MazePartId, number> = {
  chassis: 1, casters: 2, motorL: 3, motorR: 3, wheelL: 4, wheelR: 4, brackets: 5, sensorL: 6, sensorC: 6, sensorR: 6,
  breadboard: 7, nano: 7, driver: 8, holder: 8, cells: 8, wires: 10,
};

/* ---------- beginner guidance, every line traced back to the project data ---------- */

export const CONNECTION_LEVEL: Record<string, string> = Object.fromEntries([
  ...SIG.map((id) => [id, "5 V logic signal (the Nano is a 5 V board)."]),
  ...["c-vl", "c-vc", "c-vr", "c-rail"].map((id) => [id, "5 V supply on the breadboard rail. Polarity matters."]),
  ...["c-gl", "c-gc", "c-gr", "c-ngnd", "c-dgnd"].map((id) => [id, "0 V common ground."]),
  ...["c-in1", "c-in2", "c-in3", "c-in4"].map((id) => [id, "5 V logic signal from the Nano."]),
  ["c-5v", "Regulated 5 V from the driver's onboard regulator."],
  ["c-bat+", "Battery positive: 7.4 V nominal, about 8.4 V when full. Polarity matters."],
  ["c-bat-", "Battery negative (0 V). Polarity matters."],
  ...["c-motL1", "c-motL2", "c-motR1", "c-motR2"].map((id) => [id, "Motor output from the driver. Swapping a pair reverses that wheel."]),
]);

const sensorGuide = (side: string) => ({ need: `It measures the distance to ${side} by timing a sound echo, so the program can pick an open corridor.`, tip: "Keep wires and brackets clear of the two metal cylinders: they must face the walls unobstructed.", tipSource: "Step 6 checkpoints" });
export const PART_GUIDE: Record<MazePartId, { need: string; tip: string; tipSource: string }> = {
  chassis: { need: "A narrow base lets the robot pivot in tight maze turns without clipping walls.", tip: "Peel the protective film from both sides and check for hairline cracks near the wheel cutouts.", tipSource: "Step 1" },
  casters: { need: "Two casters keep the narrow robot level, so the sensors don't tilt in sharp turns.", tip: "Check both balls spin freely by hand, and no screw pokes above the plate.", tipSource: "Step 2 checkpoints" },
  motorL: { need: "It drives the left wheel; turning the motors opposite ways makes the robot spin in place.", tip: "Mount the motors at the centre so the robot can turn on the spot.", tipSource: "Step 3 tip" },
  motorR: { need: "It drives the right wheel; turning the motors opposite ways makes the robot spin in place.", tip: "Mount the motors at the centre so the robot can turn on the spot.", tipSource: "Step 3 tip" },
  wheelL: { need: "Grippy tyres stop slip, so turns stay close to 90°.", tip: "Line up the flat faces and press straight on.", tipSource: "Step 4" },
  wheelR: { need: "Grippy tyres stop slip, so turns stay close to 90°.", tip: "Line up the flat faces and press straight on.", tipSource: "Step 4" },
  brackets: { need: "They hold the sensors at fixed angles, so each one points where the program expects.", tip: "Angle the side brackets outward so they watch the side walls while the centre looks ahead.", tipSource: "Step 5 tip" },
  sensorL: sensorGuide("the left wall"),
  sensorC: sensorGuide("the wall ahead"),
  sensorR: sensorGuide("the right wall"),
  breadboard: { need: "The Nano plugs into it, and its rails share 5V and GND with all three sensors, with no soldering.", tip: "The Nano must straddle the centre trench so its two rows of pins stay separate.", tipSource: "Step 7 checkpoints" },
  nano: { need: "It runs the maze program: reads three distances, then steers into the most open corridor.", tip: "Keep the USB port facing the rear so the cable reaches it.", tipSource: "Step 7" },
  driver: { need: "The Nano can't power the motors directly; the driver switches battery current to them.", tip: "Keep the regulator jumper fitted so it can supply 5 V.", tipSource: "Step 11 checkpoints" },
  holder: { need: "It holds the cells and lets you switch the robot off fast when it's stuck in a dead end.", tip: "Mount it at the rear to balance the three sensors at the front.", tipSource: "Step 8 tip" },
  cells: { need: "They supply steady power, so the sensors read consistently.", tip: "Charge them fully before a maze run.", tipSource: "BOM" },
  wires: { need: "They carry 12 sensor wires plus the driver signals, all push-in.", tip: "Bundle the sensor wires with small ties so nothing blocks the sensors.", tipSource: "Step 10 tip" },
};

export const STEP_HELP: Record<number, KitStepHelp> = {
  1: { mistake: "Skipping the bracket-slot check before mounting anything.", check: "Cracked near a wheel cutout? Replace the plate before going on.", source: "Step 1 checkpoints" },
  2: { mistake: "Over-long screws poking above the top plate.", check: "A caster sticks? Loosen its screws slightly and re-seat it.", source: "Step 2 checkpoints" },
  3: { mistake: "Mounting the motors off-centre, which stops clean on-the-spot turns.", check: "Axle rubs the acrylic? Re-seat the motor so it spins freely.", source: "Step 3 tip and checkpoints" },
  4: { mistake: "Forcing a wheel on at an angle.", check: "Robot rocks? All four contact points must touch a flat desk.", source: "Step 4 checkpoints" },
  5: { mistake: "Fitting the side brackets straight instead of angled outward.", check: "Bracket leans? Tighten it square to the plate.", source: "Step 5" },
  6: { mistake: "Pins pointing down, where the wires can't reach them.", check: "Readings jump about? Make sure nothing covers a cylinder.", source: "Step 6 checkpoints, FAQ" },
  7: { mistake: "Plugging the Nano in along one side of the trench, which shorts its pins together.", check: "Upload cable won't reach? Turn the Nano so USB faces the rear.", source: "Step 7 checkpoints" },
  8: { mistake: "Burying the slide switch where you can't reach it in a hurry.", check: "Driver gets hot? Leave airflow around its heatsink.", source: "Step 8 checkpoints" },
  9: { mistake: "Clamping insulation instead of bare copper.", safety: "Battery switch OFF while wiring.", check: "A wheel turns the wrong way later? Swap that motor's two wires.", source: "Step 9 checkpoints" },
  10: { mistake: "Swapping Trig and Echo on a sensor.", check: "One sensor always reads 300 cm? Check its Trig/Echo pins and its 5V/GND rail wires.", source: "Step 10 checkpoints, code" },
  11: { mistake: "Leaving the battery (−), driver GND and Nano GND unjoined.", safety: "Switch OFF while wiring; red to 12V In, black to GND.", check: "Nano doesn't power up? Check the regulator jumper and the 5V out wire.", source: "Step 11 checkpoints" },
  12: { mistake: "Soft or angled maze walls that scatter the sound.", safety: "General: test inside the maze on the floor, not on a table edge.", check: "Turns overshoot? Adjust the turn delay (380–460 ms). Clips corners? Raise WALL_STOP_DIST to 18–20 cm.", source: "Step 12, FAQ" },
};

export const TOOLS: string[] = Array.from(new Set(Object.values(STEP_VISUALS).flatMap((v) => v.tools ?? [])));
