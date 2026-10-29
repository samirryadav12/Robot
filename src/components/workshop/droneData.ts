import type { KitConnection, KitPart, KitStepHelp, KitStepVisual } from "./kit";

/* The Drone Explorer Quad workshop's knowledge, kept separate from the 3D code so it can be checked against the
   project data. Every fact here comes from src/data/projects.ts (the drone's BOM, pinout, steps, tips, FAQ):
   - parts point at BOM ids; names, specs, quantities and prices are read from the BOM at runtime
   - connections are the pinout table, plus the motor and battery-lead wiring spelled out in steps 5, 8 and 10
   - each step's parts, tools and wires are taken from that step's own text
   Where the data is silent or contradicts itself, it says so (see OPEN_QUESTIONS) instead of guessing.
   Motor positions follow the pinout notes: M1 front right, M2 rear right, M3 rear left, M4 front left. */

export type DronePartId =
  | "frame" | "topPlate" | "m1" | "m2" | "m3" | "m4" | "props" | "esc" | "fc" | "hardware"
  | "receiver" | "battery" | "powerLead" | "wires" | "transmitter";

export const PARTS: (KitPart & { id: DronePartId })[] = [
  { id: "frame", bomId: "dr-frm-01", label: "Carbon fibre frame & arms", labelled: true, onRobot: true,
    where: "The base of the drone. The four arms carry the motors; the ESC and flight controller stack sits in the middle (steps 1, 3 and 4)." },
  { id: "topPlate", bomId: "dr-frm-01", label: "Top plate & standoffs", labelled: true, onRobot: true,
    where: "Part of the frame kit: four standoffs hold the top plate over the stack, and the battery straps on top of it. The guide doesn't say when it goes on; here it is fitted with the frame (step 1) and drawn see-through in steps 3–8 so the stack underneath stays visible." },
  { id: "m1", bomId: "dr-mot-01", label: "Motor 1 (front right)", labelled: true, onRobot: true,
    where: "On the end of the front-right arm (step 2). Its signal is M1 → S1 (pinout table)." },
  { id: "m2", bomId: "dr-mot-01", label: "Motor 2 (rear right)", labelled: true, onRobot: true,
    where: "On the end of the rear-right arm (step 2). Its signal is M2 → S2 (pinout table)." },
  { id: "m3", bomId: "dr-mot-01", label: "Motor 3 (rear left)", labelled: true, onRobot: true,
    where: "On the end of the rear-left arm (step 2). Its signal is M3 → S3 (pinout table)." },
  { id: "m4", bomId: "dr-mot-01", label: "Motor 4 (front left)", labelled: true, onRobot: true,
    where: "On the end of the front-left arm (step 2). Its signal is M4 → S4 (pinout table)." },
  { id: "props", bomId: "dr-prp-01", label: "Propellers ×4 (CW + CCW)", labelled: true, onRobot: true,
    where: "One on each motor shaft, held by a locknut. They go on last, after every bench test has passed (steps 10 and 12)." },
  { id: "esc", bomId: "dr-esc-01", label: "4-in-1 ESC", labelled: true, onRobot: true,
    where: "The bottom board of the centre stack, on rubber grommets, motor pads facing out toward the arms (step 3)." },
  { id: "fc", bomId: "dr-fc-01", label: "SpeedyBee F405 Mini (flight controller)", labelled: true, onRobot: true,
    where: "Above the ESC on soft grommets, its white arrow pointing to the front (step 4)." },
  { id: "hardware", bomId: "dr-hrd-01", label: "Grommets, screws & nuts", labelled: true, onRobot: true,
    where: "Screws run up through the frame and both boards; silicone grommets cushion each board and nuts hold the stack together (steps 3 and 4)." },
  { id: "receiver", bomId: "dr-rx-01", label: "ELRS radio receiver", labelled: true, onRobot: true,
    where: "Wired to UART1 on the flight controller (step 7). The guide doesn't say where it is mounted; here it sits behind the stack, its antenna tied to a rear standoff away from the propellers." },
  { id: "battery", bomId: "dr-bat-01", label: "LiPo battery", labelled: true, onRobot: true,
    where: "Strapped on top of the top plate (step 12) and plugged into the power lead (step 10)." },
  { id: "powerLead", bomId: "dr-con-01", label: "Power lead (XT60) + capacitor", labelled: true, onRobot: true,
    where: "Soldered to the ESC's main power pads, with the capacitor across them; the connector hangs out the back for the battery (step 8). The guide allows XT30 or XT60; XT60 is shown." },
  { id: "wires", bomId: "dr-wir-01", label: "Silicone wire & ESC harness", labelled: true, onRobot: true,
    where: "The ESC-to-flight-controller harness (step 6) and the receiver wires (step 7)." },
  { id: "transmitter", bomId: "dr-tx-01", label: "ELRS radio transmitter", onRobot: false,
    where: "Not mounted on the drone: it's the pilot's handheld controller, linked to the receiver by radio (step 11)." },
];

export const partById = (id: string) => PARTS.find((p) => p.id === id)!;

const motorPos: Record<string, string> = { m1: "front right", m2: "rear right", m3: "rear left", m4: "front left" };
const motorConn = (n: 1 | 2 | 3 | 4): KitConnection => ({
  id: `c-m${n}`,
  from: { part: `m${n}`, terminal: `m${n}.w`, name: `Motor ${n} wires (3)` },
  to: { part: "esc", terminal: `esc.m${n}`, name: `ESC M${n} pads` },
  color: "Black", colorNote: "three wires per motor; their colour varies by motor", kind: "Motor", jumper: false,
  purpose: `Carry the three-phase power that spins motor ${n} (${motorPos[`m${n}`]}).`,
  warning: n === 1 ? "No solder bridges between neighbouring pads. If a motor spins the wrong way later, reverse it in software instead of resoldering (step 5 tip)." : undefined,
  source: "Step 5",
});
const signal = (n: 1 | 2 | 3 | 4, where: string): KitConnection => ({
  id: `c-s${n}`,
  from: { part: "esc", terminal: `esc.s${n}`, name: `ESC M${n} signal` },
  to: { part: "fc", terminal: `fc.s${n}`, name: `FC motor pad S${n}` },
  color: "White", kind: "PWM", jumper: true,
  purpose: `Sends the DShot digital speed signal to motor ${n} (${where}).`,
  source: "Pinout table · step 6",
});

export const CONNECTIONS: KitConnection[] = [
  motorConn(1), motorConn(2), motorConn(3), motorConn(4),
  signal(1, "front right"), signal(2, "rear right"), signal(3, "rear left"), signal(4, "front left"),
  { id: "c-vbat", from: { part: "esc", terminal: "esc.vbat", name: "ESC battery voltage (VBAT)" }, to: { part: "fc", terminal: "fc.vbat", name: "FC VBAT pad" }, color: "Red", kind: "Power", jumper: true,
    purpose: "Feeds battery voltage to the flight controller for its on-screen display and low-voltage alarm.", source: "Pinout table · step 6" },
  { id: "c-rxtx", from: { part: "receiver", terminal: "rx.tx", name: "Receiver TX" }, to: { part: "fc", terminal: "fc.rx1", name: "FC RX1 (UART1)" }, color: "Yellow", kind: "Digital", jumper: true,
    purpose: "Carries the pilot's control commands from the radio link (CRSF protocol).", warning: "TX goes to RX: the two data wires cross over (step 7).", source: "Pinout table · step 7" },
  { id: "c-rxrx", from: { part: "receiver", terminal: "rx.rx", name: "Receiver RX" }, to: { part: "fc", terminal: "fc.tx1", name: "FC TX1 (UART1)" }, color: "Blue", kind: "Digital", jumper: true,
    purpose: "Carries telemetry and link-quality feedback back to the transmitter.", warning: "RX goes to TX: the two data wires cross over (step 7).", source: "Pinout table · step 7" },
  { id: "c-rx5v", from: { part: "receiver", terminal: "rx.5v", name: "Receiver 5V" }, to: { part: "fc", terminal: "fc.5v", name: "FC 5V (regulated)" }, color: "Red", kind: "Power", jumper: true,
    purpose: "Provides clean 5 V power to the radio receiver.", warning: "Red to 5V, black to GND. Swapped power leads keep the receiver's LED dark (step 7).", source: "Pinout table · step 7" },
  { id: "c-rxgnd", from: { part: "receiver", terminal: "rx.gnd", name: "Receiver GND" }, to: { part: "fc", terminal: "fc.gnd", name: "FC GND" }, color: "Black", kind: "Ground", jumper: true,
    purpose: "Common ground between the receiver and the flight controller.", source: "Pinout table · step 7" },
  { id: "c-bat+", from: { part: "powerLead", terminal: "lead.pos", name: "Power lead + (red)" }, to: { part: "esc", terminal: "esc.bat+", name: "ESC battery + pad" }, color: "Red", kind: "Power", jumper: false,
    purpose: "Carries the battery's full current to the ESC, which powers the motors and the flight controller.", warning: "Red to +, black to −. Check the polarity with a multimeter before plugging a battery in (step 8).", source: "Step 8" },
  { id: "c-bat-", from: { part: "powerLead", terminal: "lead.neg", name: "Power lead − (black)" }, to: { part: "esc", terminal: "esc.bat-", name: "ESC battery − pad" }, color: "Black", kind: "Ground", jumper: false,
    purpose: "Battery negative. The capacitor sits across this pad and the + pad.", warning: "The red and black leads must never touch each other (step 8).", source: "Step 8" },
  { id: "c-batt", from: { part: "battery", terminal: "lipo.lead", name: "LiPo main lead (XT60 plug)" }, to: { part: "powerLead", terminal: "lead.xt", name: "Power lead XT60" }, color: "Red", colorNote: "a red and a black lead in one plug", kind: "Power", jumper: false,
    purpose: "Plugs the battery into the drone. XT30/XT60 plugs only fit one way round.", warning: "Propellers OFF for every bench test. Unplug the battery before touching any solder joint (step 10).", source: "Step 10" },
];

/* where the data is silent or contradicts itself */
export const OPEN_QUESTIONS = [
  "The motor numbering and spin directions don't agree in this guide. The pinout puts M1 front right, M2 rear right, M3 rear left and M4 front left; step 10 says motors 1 and 4 spin counter-clockwise and 2 and 3 clockwise, which would make two diagonal motors spin opposite ways; step 12 says front-right and rear-left are clockwise, front-left and rear-right counter-clockwise. Follow the motor diagram in Betaflight's Motors tab for your board, and fit each propeller to match the direction its motor actually spins.",
  "The pinout lists only S1–S4 and VBAT on the ESC-to-flight-controller harness. Harnesses normally carry ground as well (and often current and telemetry). Use the harness that came with your ESC and check its labels match on both boards (step 6 tip).",
  "The guide doesn't give the battery's cell count (for example 3S or 4S). Pick the cell count, voltage and discharge rating to match your motors and ESC (FAQ).",
];

/* what each step works on, read from that step's own text */
const MOTORS = ["m1", "m2", "m3", "m4"];
const GLASS = ["topPlate"];
export const STEP_VISUALS: Record<number, KitStepVisual> = {
  1: { parts: ["frame", "topPlate"], focus: ["frame"], tools: ["Hex driver (for the M3 screws)", "Thread-lock"] },
  2: { parts: MOTORS, focus: MOTORS, tools: ["Hex driver", "Thread-lock"] },
  3: { parts: ["esc", "hardware"], focus: ["esc"], seeThrough: GLASS },
  4: { parts: ["fc", "hardware"], focus: ["fc"], detail: "arrow", seeThrough: GLASS },
  5: { parts: [...MOTORS, "esc"], connections: ["c-m1", "c-m2", "c-m3", "c-m4"], focus: ["esc"], tools: ["Soldering iron and solder", "Solder wick (to clear bridges)"], seeThrough: GLASS },
  6: { parts: ["esc", "fc", "wires"], connections: ["c-s1", "c-s2", "c-s3", "c-s4", "c-vbat"], focus: ["esc", "fc"], seeThrough: GLASS },
  7: { parts: ["receiver", "fc", "wires"], connections: ["c-rxtx", "c-rxrx", "c-rx5v", "c-rxgnd"], focus: ["receiver", "fc"], tools: ["Soldering iron and solder", "Zip-ties and heat-shrink"], detail: "antenna", seeThrough: GLASS },
  8: { parts: ["powerLead", "esc"], connections: ["c-bat+", "c-bat-"], focus: ["powerLead", "esc"], tools: ["Soldering iron and solder", "Multimeter (to check polarity)"], detail: "capacitor", seeThrough: GLASS },
  9: { parts: ["fc"], focus: ["fc"], tools: ["Computer with Betaflight Configurator", "USB-C cable"], detail: "usb" },
  10: { parts: ["battery", "powerLead", ...MOTORS], connections: ["c-batt"], tools: ["Computer with Betaflight Configurator"] },
  11: { parts: ["receiver", "transmitter"], focus: ["receiver"], tools: ["Computer with Betaflight Configurator"], detail: "antenna" },
  12: { parts: ["props", "battery"], tools: ["Prop wrench"], detail: "strap" },
};

/* the step each part goes on (so each step shows the build as it stands) */
export const INSTALLED_AT: Record<DronePartId, number> = {
  frame: 1, topPlate: 1, m1: 2, m2: 2, m3: 2, m4: 2, esc: 3, hardware: 3, fc: 4, wires: 6, receiver: 7, powerLead: 8, battery: 10, props: 12, transmitter: 99,
};

/* ---------- beginner guidance, every line traced back to the project data ---------- */

/* the voltage / signal each connection carries — from the BOM specs, the pinout notes and the configuration */
export const CONNECTION_LEVEL: Record<string, string> = {
  "c-m1": "Three-phase motor power from the ESC, at battery voltage.",
  "c-m2": "Three-phase motor power from the ESC, at battery voltage.",
  "c-m3": "Three-phase motor power from the ESC, at battery voltage.",
  "c-m4": "Three-phase motor power from the ESC, at battery voltage.",
  "c-s1": "DShot600 digital speed signal (set in the configuration).",
  "c-s2": "DShot600 digital speed signal (set in the configuration).",
  "c-s3": "DShot600 digital speed signal (set in the configuration).",
  "c-s4": "DShot600 digital speed signal (set in the configuration).",
  "c-vbat": "Full battery voltage, read by the flight controller (a sensing wire, not a power feed).",
  "c-rxtx": "Serial data, CRSF protocol on UART1 (set in the configuration).",
  "c-rxrx": "Serial data, CRSF protocol on UART1 (set in the configuration).",
  "c-rx5v": "Regulated 5 V from the flight controller. Polarity matters.",
  "c-rxgnd": "0 V reference shared by the receiver and the flight controller.",
  "c-bat+": "Full battery voltage at high current. Polarity matters.",
  "c-bat-": "Battery negative (0 V) at high current. Polarity matters.",
  "c-batt": "Full battery voltage and current. The plug only fits one way.",
};

/* why each part is needed, and one beginner tip from the guide (with where it comes from) */
export const PART_GUIDE: Record<DronePartId, { need: string; tip: string; tipSource: string }> = {
  frame: { need: "Everything bolts to it, and it holds the four motors at the right spacing so the drone balances.", tip: "Tighten the screws evenly from opposite corners, and thread-lock the motor screws so vibration can't loosen them.", tipSource: "Step 1 tip and common problems" },
  topPlate: { need: "It closes the stack, stiffens the frame and carries the battery.", tip: "Tighten the battery strap as part of the final safety check.", tipSource: "Step 12" },
  m1: { need: "It spins the front-right propeller. The flight controller balances the drone by changing each motor's speed.", tip: "Use screws short enough that they can't touch the copper windings inside.", tipSource: "Step 2 tip" },
  m2: { need: "It spins the rear-right propeller. The flight controller balances the drone by changing each motor's speed.", tip: "Use screws short enough that they can't touch the copper windings inside.", tipSource: "Step 2 tip" },
  m3: { need: "It spins the rear-left propeller. The flight controller balances the drone by changing each motor's speed.", tip: "Use screws short enough that they can't touch the copper windings inside.", tipSource: "Step 2 tip" },
  m4: { need: "It spins the front-left propeller. The flight controller balances the drone by changing each motor's speed.", tip: "Use screws short enough that they can't touch the copper windings inside.", tipSource: "Step 2 tip" },
  props: { need: "They push air down to make lift. The set has clockwise and counter-clockwise blades, each matched to its motor's direction.", tip: "Never fit them until every bench and motor-direction test has passed.", tipSource: "Step 10 tip" },
  esc: { need: "It takes the flight controller's speed signals and switches battery power to all four motors.", tip: "Keep it isolated from the carbon frame on its grommets, to prevent electrical shorts.", tipSource: "Step 3 tip" },
  fc: { need: "It reads its onboard motion sensor (IMU) and keeps adjusting the four motors to hold the drone steady.", tip: "Mount it on the soft grommets with the arrow pointing forward.", tipSource: "Step 4" },
  hardware: { need: "Screws and nuts hold the stack together; the silicone grommets keep motor vibration away from the motion sensor.", tip: "Press the grommets fully into the holes before fitting the boards.", tipSource: "Step 3 common problems" },
  receiver: { need: "It picks up the pilot's commands from the transmitter and passes them to the flight controller.", tip: "Zip-tie and heat-shrink the antenna so a propeller can't strike it.", tipSource: "Step 7 tip" },
  battery: { need: "It supplies all the energy for the motors and electronics.", tip: "Only use a battery whose cell count, voltage and discharge current match your motors and ESC.", tipSource: "FAQ" },
  powerLead: { need: "It carries the battery's full current into the ESC. The capacitor absorbs voltage spikes from the motors.", tip: "Before plugging in, check the polarity with a multimeter on DC volts: a positive reading means red is +.", tipSource: "Step 8 common problems" },
  wires: { need: "They carry the motor signals, the battery-voltage reading and the receiver's data between the boards.", tip: "Check the harness pinout label on both boards so the order matches.", tipSource: "Step 6 tip" },
  transmitter: { need: "It's how you fly: it sends throttle, turning and movement commands over the radio link.", tip: "Set up an arming switch, and confirm the failsafe drops throttle when the transmitter is turned off.", tipSource: "Step 11 tip" },
};

/* per-step help: one common mistake, a safety note and what to check — from the step's own tip, checkpoints and
   common problems, and the project tips; a note starting "General:" is plain workshop safety for that step */
export const STEP_HELP: Record<number, KitStepHelp> = {
  1: { mistake: "Tightening the screws before every arm is pressed fully into its slot, so the frame sits tilted.", check: "Arm loose or frame tilted? Loosen all screws, press the arms down into their slots, then retighten evenly from opposite corners.", source: "Step 1 common problems" },
  2: { mistake: "Using screws that are too long: they press into the motor windings and the motor won't spin freely.", check: "Motor wobbles? Tighten its four screws in a diagonal pattern so it seats evenly.", source: "Step 2 tip and common problems" },
  3: { mistake: "Fitting the ESC with its motor pads facing the centre instead of out toward the arms.", safety: "Keep the ESC isolated from the carbon frame to prevent electrical shorts.", check: "ESC slides or rocks? Press the grommets fully into the frame holes, then remount the board.", source: "Step 3 tip and common problems" },
  4: { mistake: "Mounting the board rotated, so its arrow doesn't point forward.", check: "Board feels hard, not cushioned? Make sure a silicone grommet sits between every hole and standoff.", source: "Step 4 common problems" },
  5: { mistake: "Using too much solder, so it bridges two neighbouring pads.", safety: "General: the battery isn't connected yet, so keep it that way while you solder. Rest the hot iron in its stand.", check: "Solder rolls off? Tin the wire and the pad separately first. A wire snapped off? Let each joint cool for 30 seconds before bending it.", source: "Step 5 common problems" },
  6: { mistake: "Forcing a connector that stops short. Check for a locking tab and line it up squarely instead.", check: "Harness pulling the board sideways? Route it in a gentle curve around the stack and zip-tie the slack loosely.", source: "Step 6 common problems" },
  7: { mistake: "Wiring TX to TX and RX to RX. Serial wires cross over: receiver TX → FC RX1, receiver RX → FC TX1.", safety: "Disconnect power before reworking any joint. Red goes to 5V, black to GND.", check: "Receiver LED stays dark? Check 5V and GND aren't swapped, and reheat any dull or cracked joint.", source: "Step 7 common problems" },
  8: { mistake: "A cold joint: dull, grainy solder on the main power pads.", safety: "Red to +, black to −. Check polarity before plugging in a battery. General: the capacitor is polarised too, so its marked (−) leg goes to the − pad.", check: "Not sure of the polarity? Measure the connector on DC volts: a positive reading means red is +.", source: "Step 8 and common problems" },
  9: { mistake: "Expecting Betaflight to find the board before its USB driver is installed.", safety: "Keep the propellers OFF whenever the drone is plugged into a computer.", check: "3D model on screen doesn't move? Put the drone flat and click Calibrate Accelerometer in the Setup tab.", source: "Step 9 tip and common problems" },
  10: { mistake: "Fitting the propellers before the bench tests have passed.", safety: "NEVER install propellers for this test. Disconnect the battery before touching any solder joint.", check: "A motor won't spin? Inspect its three solder joints. Spins the wrong way? Reverse it in Betaflight's Motors tab; no resoldering needed.", source: "Step 10 tip and common problems" },
  11: { mistake: "Transmitter and receiver on different ExpressLRS settings, so they never bind.", safety: "Set up an arming switch and confirm the failsafe drops throttle when the transmitter is turned off.", check: "The wrong bar moves for a stick? Change the Channel Map in Betaflight's Receiver tab (e.g. TAER ↔ AETR).", source: "Step 11 tip and common problems" },
  12: { mistake: "A clockwise propeller on a counter-clockwise motor: it pushes air the wrong way and gives no lift.", safety: "Always arm the drone outdoors, in an open area far from people and obstacles.", check: "Propeller has play? Hold the motor and tighten the locknut with a prop wrench until there's no wobble at all.", source: "Step 12 tip and common problems" },
};

/* tools and materials the steps mention (not BOM items) */
export const TOOLS: string[] = Array.from(new Set(Object.values(STEP_VISUALS).flatMap((v) => v.tools ?? [])));
