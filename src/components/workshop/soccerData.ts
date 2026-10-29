import type { KitConnection, KitPart, KitStepHelp, KitStepVisual } from "./kit";

/* The RoboSoccer Bot workshop's knowledge, kept separate from the 3D code so it can be checked against the project
   data. Every fact here comes from src/data/projects.ts (the bot's BOM, pinout, steps, code, tips, FAQ):
   - parts point at BOM ids; names, specs, quantities and prices are read from the BOM at runtime
   - connections are the pinout table, the Bluetooth pins as the program uses them (SoftwareSerial on D2/D3), and
     the motor and battery wiring spelled out in steps 6 and 9
   - each step's parts, tools and wires are taken from that step's own text
   Where the data is silent, it says so (see OPEN_QUESTIONS) instead of guessing. */

export type SoccerPartId =
  | "chassis" | "topPlate" | "motorL" | "motorR" | "wheelL" | "wheelR" | "arduino" | "driver" | "bt" | "battery"
  | "switch" | "wires" | "hardware";

export const PARTS: (KitPart & { id: SoccerPartId })[] = [
  { id: "chassis", bomId: "soc-chs-01", label: "Chassis base plate", labelled: true, onRobot: true,
    where: "The bottom deck: the motors hang under it on their brackets, the motor driver and battery sit on it (steps 1, 2, 5). The BOM has no caster, but a two-wheel chassis needs support front and back; the ball casters shown come with most 2WD chassis kits." },
  { id: "topPlate", bomId: "soc-chs-01", label: "Top plate & standoffs", labelled: true, onRobot: true,
    where: "Part of the chassis kit: a clear deck on four standoffs that carries the Arduino, the Bluetooth module and the switch. The guide doesn't describe the chassis layout; a two-deck chassis is shown, with the top plate fitted when the controller goes on (step 4)." },
  { id: "motorL", bomId: "soc-mot-01", label: "Left gear motor", labelled: true, onRobot: true,
    where: "Under the base plate on the left side, shaft pointing outward (step 2)." },
  { id: "motorR", bomId: "soc-mot-01", label: "Right gear motor", labelled: true, onRobot: true,
    where: "Under the base plate on the right side, shaft pointing outward (step 2)." },
  { id: "wheelL", bomId: "soc-whl-01", label: "Left wheel", labelled: true, onRobot: true,
    where: "Pushed or screwed onto the left motor's shaft (step 3)." },
  { id: "wheelR", bomId: "soc-whl-01", label: "Right wheel", labelled: true, onRobot: true,
    where: "Pushed or screwed onto the right motor's shaft (step 3)." },
  { id: "arduino", bomId: "soc-mcu-01", label: "Arduino Uno", labelled: true, onRobot: true,
    where: "On the top plate, USB port at the edge so it stays reachable for code updates (step 4)." },
  { id: "driver", bomId: "soc-drv-01", label: "L298N motor driver", labelled: true, onRobot: true,
    where: "On the base plate behind the battery, away from the wheels (step 5)." },
  { id: "bt", bomId: "soc-bt-01", label: "HC-05 Bluetooth module", labelled: true, onRobot: true,
    where: "On the top plate at the front, wired to D2/D3 for commands (step 8)." },
  { id: "battery", bomId: "soc-bat-01", label: "Battery pack", labelled: true, onRobot: true,
    where: "Strapped or screwed down on the base plate (step 9 tip: keep it securely mounted). The guide doesn't give its voltage, only that it must match the motor driver and motors." },
  { id: "switch", bomId: "soc-sw-01", label: "Power switch", labelled: true, onRobot: true,
    where: "In the battery's positive lead, on the edge of the top plate where you can reach it (step 9)." },
  { id: "wires", bomId: "soc-wir-01", label: "Jumper wires", labelled: true, onRobot: true,
    where: "Between the motor driver, the Bluetooth module and the Arduino (steps 7 and 8)." },
  { id: "hardware", bomId: "soc-hrd-01", label: "Screws, nuts & spacers", labelled: true, onRobot: true,
    where: "Hold the brackets, motors, boards and decks to the chassis (steps 1, 2, 4, 5)." },
];

const sig = (id: string, drvT: string, drvName: string, pin: string, color: string, kind: "Digital" | "PWM", purpose: string): KitConnection => ({
  id, from: { part: "driver", terminal: drvT, name: `L298N ${drvName}` }, to: { part: "arduino", terminal: `uno.${pin.toLowerCase()}`, name: `Arduino ${pin}${kind === "PWM" ? " (PWM)" : ""}` },
  color, kind, jumper: true, purpose, source: "Pinout table · step 7",
});
const motor = (id: string, side: "L" | "R", out: number, color: string): KitConnection => ({
  id, from: { part: side === "L" ? "motorL" : "motorR", terminal: `mot${side}.${out % 2 ? "a" : "b"}`, name: `${side === "L" ? "Left" : "Right"} motor lead` },
  to: { part: "driver", terminal: `drv.out${out}`, name: `L298N OUT${out}` },
  color, colorNote: "motor lead colour varies by supplier", kind: "Motor", jumper: false,
  purpose: `Drives the ${side === "L" ? "left" : "right"} motor.`,
  warning: out % 2 ? `If the ${side === "L" ? "left" : "right"} wheel turns backward, swap its two wires (FAQ).` : undefined,
  source: "Step 6",
});

export const CONNECTIONS: KitConnection[] = [
  sig("c-ena", "drv.ena", "ENA", "D5", "White", "PWM", "Controls the speed of the left motor."),
  sig("c-in1", "drv.in1", "IN1", "D7", "Green", "Digital", "Controls the direction of the left motor."),
  sig("c-in2", "drv.in2", "IN2", "D8", "Yellow", "Digital", "Controls the direction of the left motor."),
  sig("c-enb", "drv.enb", "ENB", "D6", "Gray", "PWM", "Controls the speed of the right motor."),
  sig("c-in3", "drv.in3", "IN3", "D9", "Blue", "Digital", "Controls the direction of the right motor."),
  sig("c-in4", "drv.in4", "IN4", "D10", "Purple", "Digital", "Controls the direction of the right motor."),
  { id: "c-gnd", from: { part: "driver", terminal: "drv.gnd", name: "L298N GND" }, to: { part: "arduino", terminal: "uno.gnd2", name: "Arduino GND" }, color: "Black", kind: "Ground", jumper: true,
    purpose: "Creates a common electrical reference between the driver and the Arduino.", source: "Pinout table" },
  { id: "c-bttx", from: { part: "bt", terminal: "bt.txd", name: "HC-05 TXD" }, to: { part: "arduino", terminal: "uno.d2", name: "Arduino D2 (receive)" }, color: "Orange", kind: "Digital", jumper: true,
    purpose: "Receives wireless movement commands (the program listens on D2).", warning: "TX goes to RX: the module's TXD goes to D2, the Arduino's receive pin.", source: "Pinout table · program (SoftwareSerial 2, 3)" },
  { id: "c-btrx", from: { part: "bt", terminal: "bt.rxd", name: "HC-05 RXD" }, to: { part: "arduino", terminal: "uno.d3", name: "Arduino D3 (send)" }, color: "Orange", kind: "Digital", jumper: true,
    purpose: "Carries data from the Arduino back to the module (D3 is the program's send pin).", warning: "Unplug RX/TX while uploading code to avoid serial interference (step 8 tip).", source: "Pinout table · program (SoftwareSerial 2, 3)" },
  { id: "c-bt5v", from: { part: "bt", terminal: "bt.vcc", name: "HC-05 VCC" }, to: { part: "arduino", terminal: "uno.5v", name: "Arduino 5V" }, color: "Red", colorNote: "the guide doesn't give the module's power pins or colours", kind: "Power", jumper: true,
    purpose: "Powers the Bluetooth module.", source: "Step 8" },
  { id: "c-btgnd", from: { part: "bt", terminal: "bt.gnd", name: "HC-05 GND" }, to: { part: "arduino", terminal: "uno.gnd", name: "Arduino GND" }, color: "Black", colorNote: "the guide doesn't give the module's power pins or colours", kind: "Ground", jumper: true,
    purpose: "Ground for the Bluetooth module.", source: "Step 8" },
  { id: "c-bat+", from: { part: "battery", terminal: "bat.pos", name: "Battery + (red lead)" }, to: { part: "switch", terminal: "sw.in", name: "Power switch" }, color: "Red", kind: "Power", jumper: false,
    purpose: "Battery positive into the power switch.", warning: "Check polarity before switching the robot on (step 9).", source: "Step 9" },
  { id: "c-sw", from: { part: "switch", terminal: "sw.out", name: "Power switch" }, to: { part: "driver", terminal: "drv.12v", name: "L298N +12V terminal" }, color: "Red", kind: "Power", jumper: false,
    purpose: "Switched battery power to the motor driver, which powers the motors.", source: "Pinout table · step 9" },
  { id: "c-bat-", from: { part: "battery", terminal: "bat.neg", name: "Battery − (black lead)" }, to: { part: "driver", terminal: "drv.gnd", name: "L298N GND terminal" }, color: "Black", kind: "Ground", jumper: false,
    purpose: "Battery negative, sharing the driver's GND terminal with the ground wire to the Arduino.", warning: "Never let the red and black battery leads touch.", source: "Step 9" },
  motor("c-motL1", "L", 1, "Red"), motor("c-motL2", "L", 2, "Black"), motor("c-motR1", "R", 3, "Red"), motor("c-motR2", "R", 4, "Black"),
];

export const OPEN_QUESTIONS = [
  "The guide doesn't say which pins power the HC-05 or how its wires are coloured. Most HC-05 boards take VCC from the Arduino's 5V and GND from GND, as shown; check the labels on your module. Its RX pin works at 3.3 V logic, so many builders add a simple voltage divider on the D3 → RXD wire; the guide doesn't mention one.",
  "How the Arduino is powered from the battery (rather than USB) isn't stated. Many L298N builds feed it from the driver's 5V output; confirm this for your board.",
  "The BOM lists no caster and doesn't describe the chassis layout. A round two-deck chassis with front and rear ball casters is shown; follow your own chassis kit's instructions.",
];

const SIGNALS = ["c-ena", "c-in1", "c-in2", "c-enb", "c-in3", "c-in4", "c-gnd"];
const GLASS = ["topPlate"];
export const STEP_VISUALS: Record<number, KitStepVisual> = {
  1: { parts: ["chassis", "hardware"], focus: ["chassis"], tools: ["Screwdriver"] },
  2: { parts: ["motorL", "motorR", "hardware"], focus: ["motorL", "motorR"], tools: ["Screwdriver"] },
  3: { parts: ["wheelL", "wheelR"], focus: ["wheelL", "wheelR"] },
  4: { parts: ["arduino", "topPlate", "hardware"], focus: ["arduino"], detail: "usb", tools: ["Screwdriver"] },
  5: { parts: ["driver", "hardware"], focus: ["driver"], seeThrough: GLASS, tools: ["Screwdriver"] },
  6: { parts: ["motorL", "motorR", "driver"], connections: ["c-motL1", "c-motL2", "c-motR1", "c-motR2"], focus: ["driver"], seeThrough: GLASS, tools: ["Small screwdriver"] },
  7: { parts: ["driver", "arduino", "wires"], connections: SIGNALS, focus: ["driver", "arduino"], seeThrough: GLASS },
  8: { parts: ["bt", "arduino", "wires"], connections: ["c-bttx", "c-btrx", "c-bt5v", "c-btgnd"], focus: ["bt", "arduino"] },
  9: { parts: ["battery", "switch", "driver"], connections: ["c-bat+", "c-sw", "c-bat-"], focus: ["battery", "driver"], detail: "switch", seeThrough: GLASS },
  10: { parts: ["arduino"], focus: ["arduino"], detail: "usb", tools: ["Computer with the Arduino app", "USB cable"] },
  11: { parts: ["motorL", "motorR", "bt"], tools: ["Phone with a Bluetooth controller app"] },
  12: { parts: [], track: true, tools: ["A lightweight ball"] },
};

export const INSTALLED_AT: Record<SoccerPartId, number> = {
  chassis: 1, hardware: 1, motorL: 2, motorR: 2, wheelL: 3, wheelR: 3, arduino: 4, topPlate: 4, driver: 5, wires: 7, bt: 8, battery: 9, switch: 9,
};

/* ---------- beginner guidance, every line traced back to the project data ---------- */

export const CONNECTION_LEVEL: Record<string, string> = {
  "c-ena": "5 V PWM speed signal (the program uses 160–180 of 255).",
  "c-enb": "5 V PWM speed signal (the program uses 160–180 of 255).",
  "c-in1": "5 V logic signal from the Arduino.",
  "c-in2": "5 V logic signal from the Arduino.",
  "c-in3": "5 V logic signal from the Arduino.",
  "c-in4": "5 V logic signal from the Arduino.",
  "c-gnd": "0 V reference shared by the battery, driver and Arduino.",
  "c-bttx": "Serial data at 9600 baud (set in the program).",
  "c-btrx": "Serial data at 9600 baud (set in the program); the module's RX expects 3.3 V logic.",
  "c-bt5v": "5 V supply for the module. Polarity matters.",
  "c-btgnd": "0 V reference (ground).",
  "c-bat+": "Battery positive. Its voltage must match the driver and motors (BOM). Polarity matters.",
  "c-sw": "Switched battery positive. Polarity matters.",
  "c-bat-": "Battery negative (0 V). Polarity matters.",
  "c-motL1": "Motor output from the driver, powered by the battery. Swapping the pair reverses the wheel.",
  "c-motL2": "Motor output from the driver, powered by the battery. Swapping the pair reverses the wheel.",
  "c-motR1": "Motor output from the driver, powered by the battery. Swapping the pair reverses the wheel.",
  "c-motR2": "Motor output from the driver, powered by the battery. Swapping the pair reverses the wheel.",
};

export const PART_GUIDE: Record<SoccerPartId, { need: string; tip: string; tipSource: string }> = {
  chassis: { need: "It keeps the motors, controller and battery together.", tip: "Make sure it sits flat before mounting anything.", tipSource: "Step 1 checkpoint" },
  topPlate: { need: "It gives the controller and Bluetooth module their own deck, clear of the motor wiring.", tip: "Keep the Arduino's USB port reachable for code updates.", tipSource: "Step 4 tip" },
  motorL: { need: "It drives the left wheel. The robot turns by running its two motors differently.", tip: "Check the left and right motor directions before driving.", tipSource: "Step 2 tip" },
  motorR: { need: "It drives the right wheel. The robot turns by running its two motors differently.", tip: "Check the left and right motor directions before driving.", tipSource: "Step 2 tip" },
  wheelL: { need: "It turns the motor's rotation into movement on the floor.", tip: "Test the motors with the robot lifted off the ground first.", tipSource: "Step 3 tip" },
  wheelR: { need: "It turns the motor's rotation into movement on the floor.", tip: "Test the motors with the robot lifted off the ground first.", tipSource: "Step 3 tip" },
  arduino: { need: "It reads the Bluetooth commands and tells the motor driver how the robot should move.", tip: "Keep the USB connection accessible for code updates.", tipSource: "Step 4 tip" },
  driver: { need: "The Arduino can't drive the motors directly, so the driver switches battery power to them.", tip: "Mount it away from the moving wheels.", tipSource: "Step 5" },
  bt: { need: "It lets the robot receive movement commands from a phone without a cable.", tip: "Unplug RX/TX temporarily while uploading code.", tipSource: "Step 8 tip" },
  battery: { need: "It provides electricity to the controller and motors.", tip: "Keep the battery securely mounted.", tipSource: "Step 9 tip" },
  switch: { need: "It makes it easy to disconnect the robot from power safely.", tip: "Check polarity before switching the robot on.", tipSource: "Step 9" },
  wires: { need: "They carry power and control signals between the controller and the other boards.", tip: "Follow the pin table so speed and direction match the program.", tipSource: "Step 7 tip" },
  hardware: { need: "Screws, nuts and spacers keep every part firmly attached.", tip: "Keep wires away from the wheels when you fix things down.", tipSource: "Step 1 tip" },
};

export const STEP_HELP: Record<number, KitStepHelp> = {
  1: { mistake: "Tightening one side before the rest, so the chassis sits crooked.", check: "Chassis rocks? Loosen the screws, set it flat, then tighten evenly.", source: "Step 1 checkpoint" },
  2: { mistake: "Fitting both motors facing the same way, so one drives backward.", check: "A motor wobbles? Tighten its mounting hardware.", source: "Step 2 tip and checkpoint" },
  3: { mistake: "Forcing a wheel on at an angle.", check: "A wheel rubs or won't spin freely? Re-seat it straight on the shaft.", source: "Step 3 checkpoint" },
  4: { mistake: "Mounting the Arduino with its USB port blocked.", check: "Arduino slides about? Fix it with screws and spacers or a secure mount.", source: "Step 4 tip and checkpoint" },
  5: { mistake: "Placing the driver where a wheel can catch its wires.", check: "Driver loose? Screw it down on spacers.", source: "Step 5" },
  6: { mistake: "Leaving a motor wire loose in its screw terminal.", safety: "Keep the battery disconnected while wiring.", check: "A wire pulls out when tugged? Tighten the terminal screw firmly.", source: "Step 6 tip and checkpoint" },
  7: { mistake: "Swapping pins, so speed and direction don't match the program.", check: "A motor ignores speed changes? Check ENA → D5 and ENB → D6 against the pin connections table.", source: "Step 7 tip and checkpoint" },
  8: { mistake: "Wiring TXD to D3 and RXD to D2. TXD goes to D2 (the program's receive pin).", safety: "Unplug RX/TX while uploading code.", check: "Module LED dark? Check its power wires.", source: "Step 8 tip and checkpoint, program" },
  9: { mistake: "Connecting the battery backward.", safety: "Check polarity before switching on. Never let the red and black leads touch.", check: "Nothing powers up? Check the switch, the polarity and the battery charge.", source: "Step 9 tip and checkpoint" },
  10: { mistake: "Uploading with the Bluetooth module still on D2/D3, or the wrong board or port selected.", safety: "Start with a low motor speed while testing.", check: "Upload error? Unplug the module's RX/TX, pick 'Arduino Uno' and the right port, then try again.", source: "Step 10 tip, step 8 tip" },
  11: { mistake: "Sending several commands at once. Send one at a time: F, B, L, R, S.", safety: "Test with the robot lifted off the ground first.", check: "Moves backward? Swap the wires on the motor that's reversed. One wheel faster? Adjust its PWM value in the code.", source: "Step 11 tip, FAQ, code note" },
  12: { mistake: "Driving at full speed into a heavy ball.", safety: "Use a lightweight ball for the first tests.", check: "Robot loses control? Slow down and practise short movements around the ball.", source: "Step 12 tip and checkpoint" },
};

export const TOOLS: string[] = Array.from(new Set(Object.values(STEP_VISUALS).flatMap((v) => v.tools ?? [])));
