/* The Line Follower workshop's knowledge, kept separate from the 3D code so it can be checked against the
   project data. Every fact here comes from src/data/projects.ts (BOM, pinout, steps, code) — nothing is invented:
   - parts point at BOM ids; names, specs, quantities and prices are read from the BOM at runtime
   - connections are the pinout table, plus the motor and battery wiring spelled out in steps 7 and 11
   - each step's parts, tools and wires are taken from that step's own text
   Placement on the chassis follows the guide where it says so (steps 3–6) and is marked "not specified" where it
   doesn't. */

export type PartId =
  | "chassis" | "brackets" | "motorL" | "motorR" | "wheelL" | "wheelR" | "caster" | "sensors"
  | "arduino" | "driver" | "holder" | "cells" | "wires" | "hardware" | "usb";

export interface PartInfo {
  id: PartId;
  bomId: string;            // matching BOM entry (src/data/projects.ts)
  label: string;            // what the label in the 3D view says
  where: string;            // where it sits on the robot
  onRobot: boolean;         // false: a BOM item that is not mounted (e.g. the USB cable)
  labelled?: boolean;       // shown as a numbered label in the 3D view
}

export const PARTS: PartInfo[] = [
  { id: "chassis", bomId: "lf-chs-01", label: "Acrylic chassis plate", labelled: true, onRobot: true,
    where: "The base of the robot. Motors and the caster mount underneath; the Arduino and motor driver sit on top (steps 3–6)." },
  { id: "motorL", bomId: "lf-mot-01", label: "Left TT gear motor", labelled: true, onRobot: true,
    where: "Under the plate on the left side, shaft pointing outward (step 3)." },
  { id: "motorR", bomId: "lf-mot-01", label: "Right TT gear motor", labelled: true, onRobot: true,
    where: "Under the plate on the right side, shaft pointing outward (step 3)." },
  { id: "wheelL", bomId: "lf-whl-01", label: "Left wheel (65 mm)", labelled: true, onRobot: true,
    where: "Press-fitted onto the left motor's flat-sided shaft (step 4)." },
  { id: "wheelR", bomId: "lf-whl-01", label: "Right wheel (65 mm)", labelled: true, onRobot: true,
    where: "Press-fitted onto the right motor's flat-sided shaft (step 4)." },
  { id: "caster", bomId: "lf-cst-01", label: "Ball caster", labelled: true, onRobot: true,
    where: "Screwed into the front hole under the plate, so the robot rests on three points (step 4)." },
  { id: "sensors", bomId: "lf-sen-01", label: "TCRT5000 dual IR sensor", labelled: true, onRobot: true,
    where: "At the front nose, the two sensor eyes pointing straight down, about 6–8 mm above the floor (step 5)." },
  { id: "arduino", bomId: "lf-mcu-01", label: "Arduino Uno R3", labelled: true, onRobot: true,
    where: "On top of the plate in the middle, USB port facing outward (step 6)." },
  { id: "driver", bomId: "lf-drv-01", label: "L298N motor driver", labelled: true, onRobot: true,
    where: "On top of the plate toward the back, screw terminals easy to reach (step 6)." },
  { id: "holder", bomId: "lf-pwr-01", label: "2× 18650 holder + switch", labelled: true, onRobot: true,
    where: "Wired to the motor driver's power terminals (step 11). The guide doesn't say where it is mounted; here it sits under the plate between the motors." },
  { id: "cells", bomId: "lf-bat-01", label: "18650 Li-ion cells", labelled: true, onRobot: true,
    where: "Inside the battery holder, in series for 7.4 V (step 2)." },
  { id: "wires", bomId: "lf-wir-01", label: "DuPont jumper wires", labelled: true, onRobot: true,
    where: "Between the motor driver, the sensor module and the Arduino pins (steps 8–10)." },
  { id: "hardware", bomId: "lf-stf-01", label: "M3 standoffs & screws", labelled: true, onRobot: true,
    where: "Brass standoffs lift the boards and the caster; M3 screws and nuts hold everything (steps 3–6)." },
  { id: "brackets", bomId: "lf-chs-01", label: "Motor brackets", onRobot: true,
    where: "Clear brackets that hold each motor under the plate (step 3, part of the chassis kit)." },
  { id: "usb", bomId: "lf-usb-01", label: "USB A-to-B cable", onRobot: false,
    where: "Not mounted on the robot: it connects the Arduino to your computer to upload the program (step 12)." },
];

export const partById = (id: PartId) => PARTS.find((p) => p.id === id)!;

/* named connection points on the 3D parts (see lineFollowerModel.ts for where each one is) */
export type Terminal =
  | "sen.out1" | "sen.out2" | "sen.vcc" | "sen.gnd"
  | "uno.d2" | "uno.d4" | "uno.d5" | "uno.d6" | "uno.d7" | "uno.d8" | "uno.d9" | "uno.d10" | "uno.5v" | "uno.gnd" | "uno.gnd2"
  | "drv.in1" | "drv.in2" | "drv.in3" | "drv.in4" | "drv.ena" | "drv.enb" | "drv.12v" | "drv.gnd"
  | "drv.out1" | "drv.out2" | "drv.out3" | "drv.out4"
  | "motL.a" | "motL.b" | "motR.a" | "motR.b" | "bat.pos" | "bat.neg";

export interface Connection {
  id: string;
  from: { part: PartId; terminal: Terminal; name: string };
  to: { part: PartId; terminal: Terminal; name: string };
  color: string;            // wire colour as the guide recommends it
  colorNote?: string;       // when the colour isn't given by the guide
  kind: "Digital" | "PWM" | "Power" | "Ground" | "Motor";
  purpose: string;
  warning?: string;
  source: string;           // where in the project data this connection is stated
  jumper: boolean;          // a DuPont jumper (vs a motor or battery lead)
}

export const CONNECTIONS: Connection[] = [
  { id: "c-d2", from: { part: "sensors", terminal: "sen.out1", name: "Sensor left OUT" }, to: { part: "arduino", terminal: "uno.d2", name: "Arduino D2" }, color: "Yellow", kind: "Digital", jumper: true,
    purpose: "Sends a signal to the controller when the left sensor detects the black line.", source: "Pinout table · step 9" },
  { id: "c-d4", from: { part: "sensors", terminal: "sen.out2", name: "Sensor right OUT" }, to: { part: "arduino", terminal: "uno.d4", name: "Arduino D4" }, color: "Green", kind: "Digital", jumper: true,
    purpose: "Sends a signal to the controller when the right sensor detects the black line.", source: "Pinout table · step 9" },
  { id: "c-sen5v", from: { part: "sensors", terminal: "sen.vcc", name: "Sensor VCC" }, to: { part: "arduino", terminal: "uno.5v", name: "Arduino 5V" }, color: "Red", kind: "Power", jumper: true,
    purpose: "Supplies 5-volt power to light up the sensors.", warning: "VCC goes to 5V, never to GND — swapping them can damage the sensor.", source: "Pinout table · step 9" },
  { id: "c-sengnd", from: { part: "sensors", terminal: "sen.gnd", name: "Sensor GND" }, to: { part: "arduino", terminal: "uno.gnd", name: "Arduino GND" }, color: "Black", kind: "Ground", jumper: true,
    purpose: "Shared ground for the sensors.", source: "Pinout table · step 9" },
  { id: "c-in1", from: { part: "driver", terminal: "drv.in1", name: "L298N IN1" }, to: { part: "arduino", terminal: "uno.d7", name: "Arduino D7" }, color: "Blue", kind: "Digital", jumper: true,
    purpose: "Tells the left motor to spin forward.", source: "Pinout table · step 8" },
  { id: "c-in2", from: { part: "driver", terminal: "drv.in2", name: "L298N IN2" }, to: { part: "arduino", terminal: "uno.d8", name: "Arduino D8" }, color: "Purple", kind: "Digital", jumper: true,
    purpose: "Tells the left motor to spin backward.", source: "Pinout table · step 8" },
  { id: "c-in3", from: { part: "driver", terminal: "drv.in3", name: "L298N IN3" }, to: { part: "arduino", terminal: "uno.d9", name: "Arduino D9" }, color: "Orange", kind: "Digital", jumper: true,
    purpose: "Tells the right motor to spin forward.", source: "Pinout table · step 8" },
  { id: "c-in4", from: { part: "driver", terminal: "drv.in4", name: "L298N IN4" }, to: { part: "arduino", terminal: "uno.d10", name: "Arduino D10" }, color: "Brown", kind: "Digital", jumper: true,
    purpose: "Tells the right motor to spin backward.", source: "Pinout table · step 8" },
  { id: "c-ena", from: { part: "driver", terminal: "drv.ena", name: "L298N ENA" }, to: { part: "arduino", terminal: "uno.d5", name: "Arduino D5 (PWM)" }, color: "White", kind: "PWM", jumper: true,
    purpose: "Controls the left motor speed (0 stopped to 255 full speed).", warning: "Remove the small jumper cap on ENA first, or speed control won't work (step 8 tip).", source: "Pinout table · step 8" },
  { id: "c-enb", from: { part: "driver", terminal: "drv.enb", name: "L298N ENB" }, to: { part: "arduino", terminal: "uno.d6", name: "Arduino D6 (PWM)" }, color: "Gray", kind: "PWM", jumper: true,
    purpose: "Controls the right motor speed (0 stopped to 255 full speed).", warning: "Remove the small jumper cap on ENB first, or speed control won't work (step 8 tip).", source: "Pinout table · step 8" },
  { id: "c-gnd", from: { part: "driver", terminal: "drv.gnd", name: "L298N GND terminal" }, to: { part: "arduino", terminal: "uno.gnd2", name: "Arduino GND" }, color: "Black", kind: "Ground", jumper: true,
    purpose: "The shared ground: lets signals travel between the boards. Mandatory for the robot to work.", warning: "Screw it into the GND terminal together with the battery's negative wire (step 10).", source: "Pinout table · step 10" },
  { id: "c-bat+", from: { part: "holder", terminal: "bat.pos", name: "Battery + (red lead)" }, to: { part: "driver", terminal: "drv.12v", name: "L298N +12V terminal" }, color: "Red", kind: "Power", jumper: false,
    purpose: "Gives strong 7.4 V battery power to the motors through the driver.", warning: "Battery switch OFF while wiring. Red into +, black into − — connecting backward can damage the board (step 11).", source: "Pinout table · step 11" },
  { id: "c-bat-", from: { part: "holder", terminal: "bat.neg", name: "Battery − (black lead)" }, to: { part: "driver", terminal: "drv.gnd", name: "L298N GND terminal" }, color: "Black", kind: "Ground", jumper: false,
    purpose: "Battery negative, sharing the GND terminal with the ground wire to the Arduino.", warning: "Never let the red and black battery wires touch (step 11).", source: "Pinout table · step 11" },
  { id: "c-motL1", from: { part: "motorL", terminal: "motL.a", name: "Left motor lead" }, to: { part: "driver", terminal: "drv.out1", name: "L298N OUT1" }, color: "Red", colorNote: "motor lead colour varies by supplier", kind: "Motor", jumper: false,
    purpose: "Drives the left motor.", warning: "If the left wheel turns backward, swap its two wires (steps 7 and 14).", source: "Step 7" },
  { id: "c-motL2", from: { part: "motorL", terminal: "motL.b", name: "Left motor lead" }, to: { part: "driver", terminal: "drv.out2", name: "L298N OUT2" }, color: "Black", colorNote: "motor lead colour varies by supplier", kind: "Motor", jumper: false,
    purpose: "Drives the left motor.", source: "Step 7" },
  { id: "c-motR1", from: { part: "motorR", terminal: "motR.a", name: "Right motor lead" }, to: { part: "driver", terminal: "drv.out3", name: "L298N OUT3" }, color: "Red", colorNote: "motor lead colour varies by supplier", kind: "Motor", jumper: false,
    purpose: "Drives the right motor.", warning: "If the right wheel turns backward, swap its two wires (steps 7 and 14).", source: "Step 7" },
  { id: "c-motR2", from: { part: "motorR", terminal: "motR.b", name: "Right motor lead" }, to: { part: "driver", terminal: "drv.out4", name: "L298N OUT4" }, color: "Black", colorNote: "motor lead colour varies by supplier", kind: "Motor", jumper: false,
    purpose: "Drives the right motor.", source: "Step 7" },
];

/* the guide never says how the Arduino is powered once the USB cable is unplugged */
export const OPEN_QUESTIONS = [
  "How the Arduino gets power when it runs from the battery (not over USB) isn't stated in this guide. Many L298N builds feed the Arduino from the driver's 5V output, but confirm this for your board before relying on it.",
];

/* what each step works on, read from that step's own text */
export interface StepVisual {
  parts: PartId[];            // highlighted in 3D, listed as "parts needed"
  connections?: string[];     // wires shown being made
  tools?: string[];           // tools and materials the step's text mentions (not BOM items)
  focus?: PartId[];           // what the camera frames (defaults to parts)
  exploded?: boolean;         // show the parts laid out
  track?: boolean;            // show the black-tape test track
  detail?: "trimmers" | "usb" | "switch";
}

export const STEP_VISUALS: Record<number, StepVisual> = {
  1: { parts: ["chassis", "motorL", "motorR", "wheelL", "wheelR", "caster"], exploded: true, focus: ["chassis"], tools: ["A clean table"] },
  2: { parts: ["cells", "holder"], focus: ["holder"], tools: ["Battery charger or multimeter"], detail: "switch" },
  3: { parts: ["motorL", "motorR", "brackets", "hardware", "chassis"], focus: ["motorL", "motorR"], tools: ["Screwdriver"] },
  4: { parts: ["caster", "wheelL", "wheelR"], focus: ["wheelL", "caster", "wheelR"] },
  5: { parts: ["sensors", "hardware"], focus: ["sensors"], tools: ["Ruler (to check 6–8 mm clearance)"] },
  6: { parts: ["arduino", "driver", "hardware"], focus: ["arduino", "driver"], tools: ["Screwdriver"] },
  7: { parts: ["motorL", "motorR", "driver"], connections: ["c-motL1", "c-motL2", "c-motR1", "c-motR2"], focus: ["driver"], tools: ["Small screwdriver"] },
  8: { parts: ["driver", "arduino", "wires"], connections: ["c-in1", "c-in2", "c-in3", "c-in4", "c-ena", "c-enb"], focus: ["driver", "arduino"] },
  9: { parts: ["sensors", "arduino", "wires"], connections: ["c-d2", "c-d4", "c-sen5v", "c-sengnd"], focus: ["sensors", "arduino"] },
  10: { parts: ["driver", "arduino", "wires"], connections: ["c-gnd"], focus: ["driver", "arduino"] },
  11: { parts: ["holder", "driver"], connections: ["c-bat+", "c-bat-"], focus: ["driver", "holder"], tools: ["Small screwdriver"], detail: "switch" },
  12: { parts: ["arduino", "usb"], focus: ["arduino"], tools: ["Computer with the free Arduino app"], detail: "usb" },
  13: { parts: ["sensors"], focus: ["sensors"], tools: ["Tiny screwdriver", "White paper and black tape"], detail: "trimmers" },
  14: { parts: [], track: true, tools: ["White cardboard", "1-inch black electrical tape"] },
};

/* the steps that use a part (from the table above) */
export function stepsUsing(id: PartId): number[] {
  return Object.entries(STEP_VISUALS).filter(([, v]) => v.parts.includes(id)).map(([n]) => Number(n));
}

export const WIRE_HEX: Record<string, number> = {
  yellow: 0xf2c230, green: 0x2f9e5b, red: 0xd8432f, black: 0x22252a, blue: 0x2f6fd6, purple: 0x8a55c9,
  orange: 0xf0862e, brown: 0x7a4b2a, white: 0xf2f0ea, gray: 0x9aa0a6, grey: 0x9aa0a6,
};
export const wireHex = (c: string) => WIRE_HEX[c.toLowerCase()] ?? 0xc8592e;
export const wireCss = (c: string) => `#${wireHex(c).toString(16).padStart(6, "0")}`;

/* ---------- beginner guidance, every line traced back to the project data ---------- */

/* the voltage / polarity each wire carries — from the BOM specs (Uno is a 5 V board; 2× 18650 in series,
   3.7 V nominal / 4.2 V full each) and the pinout notes */
export const CONNECTION_LEVEL: Record<string, string> = {
  "c-d2": "5 V logic signal (the Uno is a 5 V board).",
  "c-d4": "5 V logic signal (the Uno is a 5 V board).",
  "c-sen5v": "5 V supply from the Arduino. Polarity matters: VCC to 5V only.",
  "c-sengnd": "0 V reference (ground).",
  "c-in1": "5 V logic signal from the Arduino.",
  "c-in2": "5 V logic signal from the Arduino.",
  "c-in3": "5 V logic signal from the Arduino.",
  "c-in4": "5 V logic signal from the Arduino.",
  "c-ena": "5 V PWM speed signal (0–255 in the code).",
  "c-enb": "5 V PWM speed signal (0–255 in the code).",
  "c-gnd": "0 V reference shared by the battery, driver and Arduino.",
  "c-bat+": "Battery positive: 7.4 V nominal, about 8.4 V when both cells are full. Polarity matters.",
  "c-bat-": "Battery negative (0 V). Polarity matters.",
  "c-motL1": "Motor output from the driver, powered by the battery. Swapping the pair reverses the wheel.",
  "c-motL2": "Motor output from the driver, powered by the battery. Swapping the pair reverses the wheel.",
  "c-motR1": "Motor output from the driver, powered by the battery. Swapping the pair reverses the wheel.",
  "c-motR2": "Motor output from the driver, powered by the battery. Swapping the pair reverses the wheel.",
};

/* why each part is needed, and one beginner tip from the guide (with where it comes from) */
export const PART_GUIDE: Record<PartId, { need: string; tip: string; tipSource: string }> = {
  chassis: { need: "Every other part bolts to it. Without a rigid base the motors, wheels and sensors would not stay lined up.", tip: "Peel the protective paper off both sides before you mount anything, and work on a clean table so small screws don't roll away.", tipSource: "Step 1" },
  brackets: { need: "They clamp each motor to the underside of the plate so it can't twist when the wheel pushes.", tip: "Tighten the screws gently so the plastic bracket does not crack.", tipSource: "Step 3 checkpoint" },
  motorL: { need: "It drives the left wheel. The robot steers by running the two motors at different speeds.", tip: "Point the motor wires toward the inside of the frame so the wiring stays neat.", tipSource: "Step 3 tip" },
  motorR: { need: "It drives the right wheel. The robot steers by running the two motors at different speeds.", tip: "Point the motor wires toward the inside of the frame so the wiring stays neat.", tipSource: "Step 3 tip" },
  wheelL: { need: "It turns the motor's rotation into grip on the floor.", tip: "Push the wheel on gently and straight so you don't bend the motor shaft.", tipSource: "Step 4 tip" },
  wheelR: { need: "It turns the motor's rotation into grip on the floor.", tip: "Push the wheel on gently and straight so you don't bend the motor shaft.", tipSource: "Step 4 tip" },
  caster: { need: "Two wheels can't balance on their own; the caster is the third point the robot rests on.", tip: "Afterwards, roll the robot by hand on the table to check every wheel spins smoothly.", tipSource: "Step 4 checkpoint" },
  sensors: { need: "Without it the robot can't see the line. It is the only input the program reads.", tip: "Mount it 6–8 mm above the table: too high and it can't see the line, too low and it catches on bumps. Later, a quarter-turn of its dial is usually enough to tune it.", tipSource: "Steps 5 and 13" },
  arduino: { need: "It runs the line-following program, which turns what the sensors see into motor commands.", tip: "If an upload fails, check you picked the right COM port under Tools > Port.", tipSource: "Step 12 tip" },
  driver: { need: "The Arduino's pins can't supply the current the motors need. The driver switches battery power to them on the Arduino's command.", tip: "If your board has small black jumper caps on ENA and ENB, remove them so speed control works.", tipSource: "Step 8 tip" },
  holder: { need: "It holds the cells in series and gives you a switch to turn the robot off without pulling wires.", tip: "Always turn the battery switch OFF before connecting or removing wires.", tipSource: "Step 2 tip" },
  cells: { need: "They store the energy for the motors and electronics. A rectangular 9V battery can't power the motors.", tip: "Each cell should read about 3.7–4.2 V. Don't use a cell whose wrap is torn or damaged.", tipSource: "Step 2 and FAQ" },
  wires: { need: "They carry every signal and the sensor power between the boards, with no soldering.", tip: "Use a different colour for each pin so you can trace every wire later.", tipSource: "Step 8 checkpoint" },
  hardware: { need: "Standoffs lift the boards off the plate and screws hold everything in place, so nothing shakes loose or shorts.", tip: "Leave small gaps between the boards so their metal parts never touch.", tipSource: "Step 6 tip" },
  usb: { need: "It's how the program gets from your computer into the Arduino.", tip: "Keep the battery switch OFF while you upload code over USB.", tipSource: "Step 12 checkpoint" },
};

/* per-step help: one common mistake, a safety note and what to check — from the step's own tip and checkpoints
   and the FAQ; a note starting "General:" is plain workshop safety that applies to that step */
export interface StepHelp { mistake: string; safety?: string; check?: string; source: string }
export const STEP_HELP: Record<number, StepHelp> = {
  1: { mistake: "Starting with a part missing. Lay everything out and tick it off against the Parts List first.", check: "Missing the plate, a motor, a wheel or the caster? Compare with the Parts List (BOM) before going on.", source: "Step 1 checkpoints" },
  2: { mistake: "Measuring only the total. Check each cell on its own: 3.7–4.2 V each.", safety: "Don't use a cell with a torn or damaged wrap. Turn the battery switch OFF before connecting or removing wires.", check: "Total below 7.4 V? Charge the cells before building. Don't use a rectangular 9V battery instead: it can't power the motors.", source: "Step 2, FAQ" },
  3: { mistake: "Over-tightening the screws, which cracks the clear plastic bracket.", check: "Shaft rubbing on the plate? Loosen the bracket, re-seat the motor so the shaft turns freely, then tighten gently.", source: "Step 3 checkpoints" },
  4: { mistake: "Forcing a wheel on at an angle, which bends the motor shaft. Line up the flat side and press straight.", check: "Robot rocks or isn't level? Check each tyre sits squarely on its rim and the caster is screwed in firmly.", source: "Step 4 tip and checkpoints" },
  5: { mistake: "Mounting the sensor too high (it can't see the line) or too low (it catches on bumps).", check: "Measure from the sensor eyes to the table: 6–8 mm. The board should be level and not scrape.", source: "Step 5 tip and checkpoints" },
  6: { mistake: "Letting the two boards touch. Their metal pins can short against each other.", safety: "Keep gaps between the boards so no metal parts touch.", check: "Can't plug in USB later? Turn the Arduino so its USB port faces outward.", source: "Step 6 tip and checkpoints" },
  7: { mistake: "Leaving stray copper strands that touch the next terminal.", safety: "Keep the battery switch OFF while wiring.", check: "A wire pulls out when tugged? Re-tighten its screw. A wheel turns backward later? Swap that motor's two wires.", source: "Step 7 tip and checkpoints, step 2 tip" },
  8: { mistake: "Leaving the jumper caps on ENA and ENB, so speed control doesn't work.", safety: "Keep the battery switch OFF while wiring.", check: "Motors ignore speed changes? Check the ENA/ENB caps are off and the wires go to D5 and D6. Check every pin against the pinout table.", source: "Step 8 tip and checkpoints" },
  9: { mistake: "Swapping D2 and D4. The left sensor goes to D2 and the right to D4, or the program steers the wrong way.", safety: "VCC goes to 5V and GND to GND. Never reverse them.", check: "Sensor LEDs stay dark when powered? Re-check VCC → 5V and GND → GND.", source: "Step 9 checkpoints, pinout table" },
  10: { mistake: "Skipping this wire. Both boards must share ground or their signals float.", check: "Motors twitch randomly? The shared ground wire is missing or loose.", source: "Step 10 tip and checkpoints" },
  11: { mistake: "Connecting the battery backward. Red goes to +12V and black to GND.", safety: "Switch OFF before wiring. Never let the red and black battery wires touch each other: that's a short circuit.", check: "Driver power LED doesn't light? Check the switch, the polarity, and that the cells were charged in step 2.", source: "Step 11 tip and checkpoints" },
  12: { mistake: "Choosing the wrong board or COM port in the Arduino app.", safety: "Keep the battery switch OFF while uploading over USB.", check: "Upload error? Choose 'Arduino Uno' and the correct port under Tools > Port, then try again.", source: "Step 12 tip and checkpoints" },
  13: { mistake: "Turning the dial too far. A quarter-turn is usually enough.", safety: "General: the robot is switched on for this step, so the wheels may spin. Hold it or lift it so it can't drive off the table.", check: "Light won't switch cleanly over the tape? Avoid shiny tape (room light bouncing off it confuses the sensor), then re-tune.", source: "Step 13 tip, FAQ" },
  14: { mistake: "Using glossy tape or a busy surface. Use 1-inch black electrical tape on white card.", safety: "General: test on the floor or a large board so the robot can't drive off a table edge.", check: "Spins in circles? Swap the wires on one motor. Goes backward? Swap both. Drives off the line? Re-check the sensor lights switch over the tape (step 13).", source: "Step 14 checkpoints, FAQ" },
};

/* tools and materials the steps mention (not BOM items) */
export const TOOLS: string[] = Array.from(new Set(Object.values(STEP_VISUALS).flatMap((v) => v.tools ?? [])));
