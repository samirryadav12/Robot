import type { KitConnection, KitPart, KitStepHelp, KitStepVisual } from "./kit";

/* The Robotic Arm 4-DOF workshop's knowledge, kept separate from the 3D code so it can be checked against the
   project data. Every fact here comes from src/data/projects.ts (the arm's BOM, pinout, steps, tips, FAQ, notes):
   - parts point at BOM ids; names, specs, quantities and prices are read from the BOM at runtime
   - connections are the pinout table: four servo signals, servo power to the external 5 V supply, and the common
     ground (steps 6–8). The pinout gives one power row and one ground row for all four servos; here each servo's
     power pair is drawn to the supply, which is what those rows describe
   - each step's parts, tools and wires are taken from that step's own text
   Where the data is silent, it says so (see OPEN_QUESTIONS) instead of guessing. */

export type ArmPartId =
  | "base" | "turret" | "upperArm" | "forearm" | "sBase" | "sShoulder" | "sElbow" | "sGrip" | "horns" | "gripper"
  | "arduino" | "psu" | "wires" | "hardware";

export const PARTS: (KitPart & { id: ArmPartId })[] = [
  { id: "base", bomId: "arm-frm-01", label: "Base & column", labelled: true, onRobot: true,
    where: "The bottom of the arm structure: a flat base plate and a column that holds the base servo (steps 1 and 2)." },
  { id: "turret", bomId: "arm-frm-01", label: "Turntable & shoulder bracket", labelled: true, onRobot: true,
    where: "Part of the arm structure: it sits on the base servo's horn and turns with it, and carries the shoulder joint (step 3)." },
  { id: "upperArm", bomId: "arm-frm-01", label: "Upper arm link", labelled: true, onRobot: true,
    where: "Part of the arm structure: the first arm section, from the shoulder up to the elbow (step 3)." },
  { id: "forearm", bomId: "arm-frm-01", label: "Forearm link", labelled: true, onRobot: true,
    where: "Part of the arm structure: from the elbow out to the gripper (steps 4 and 5)." },
  { id: "sBase", bomId: "arm-srv-01", label: "Base servo (D3)", labelled: true, onRobot: true,
    where: "Inside the base column, shaft up, turning the whole arm left and right (step 2)." },
  { id: "sShoulder", bomId: "arm-srv-01", label: "Shoulder servo (D5)", labelled: true, onRobot: true,
    where: "On the shoulder bracket, raising and lowering the upper arm. The steps don't say when it goes on; here it's fitted with the first arm section (step 3)." },
  { id: "sElbow", bomId: "arm-srv-01", label: "Elbow servo (D6)", labelled: true, onRobot: true,
    where: "At the top of the upper arm, bending the forearm (step 4)." },
  { id: "sGrip", bomId: "arm-srv-01", label: "Gripper servo (D9)", labelled: true, onRobot: true,
    where: "On the gripper, opening and closing the claw through its gears (step 5)." },
  { id: "horns", bomId: "arm-hrn-01", label: "Servo horns ×4", labelled: true, onRobot: true,
    where: "One on each servo's shaft, fixing it to the part it moves (steps 3 and 5)." },
  { id: "gripper", bomId: "arm-grp-01", label: "Gripper claw", labelled: true, onRobot: true,
    where: "On the end of the forearm (step 5)." },
  { id: "arduino", bomId: "arm-mcu-01", label: "Arduino Uno", labelled: true, onRobot: true,
    where: "Connected to the four servo signal wires (step 6). The guide doesn't say where it is mounted; here it sits on the base plate behind the column." },
  { id: "psu", bomId: "arm-pwr-01", label: "External 5V supply", labelled: true, onRobot: true,
    where: "Powers the four servos (step 7) and shares its ground with the Arduino (step 8). It isn't mounted on the arm; here it sits beside the base." },
  { id: "wires", bomId: "arm-wir-01", label: "Jumper wires", labelled: true, onRobot: true,
    where: "Carry the servo signals to the Arduino and the servo power to the 5V supply (steps 6–8)." },
  { id: "hardware", bomId: "arm-hrd-01", label: "Screws & nuts", labelled: true, onRobot: true,
    where: "Hold the base, the servos and the arm sections together (steps 1–4)." },
];

const SERVOS: { id: "sBase" | "sShoulder" | "sElbow" | "sGrip"; name: string; pin: string; does: string }[] = [
  { id: "sBase", name: "Base servo", pin: "D3", does: "Rotates the base of the arm." },
  { id: "sShoulder", name: "Shoulder servo", pin: "D5", does: "Raises and lowers the main arm section." },
  { id: "sElbow", name: "Elbow servo", pin: "D6", does: "Bends the arm at the elbow." },
  { id: "sGrip", name: "Gripper servo", pin: "D9", does: "Opens and closes the gripper." },
];

export const CONNECTIONS: KitConnection[] = [
  ...SERVOS.map((s): KitConnection => ({
    id: `c-${s.pin.toLowerCase()}`,
    from: { part: s.id, terminal: `${s.id}.lead`, name: `${s.name} signal` },
    to: { part: "arduino", terminal: `uno.${s.pin.toLowerCase()}`, name: `Arduino ${s.pin} (PWM)` },
    color: "Orange", kind: "PWM", jumper: true,
    purpose: s.does,
    warning: s.id === "sShoulder" ? "Shoulder goes to D5 and elbow to D6. Swapping them moves the wrong joint (step 6)." : undefined,
    source: "Pinout table · step 6",
  })),
  ...SERVOS.map((s): KitConnection => ({
    id: `c-pwr-${s.id}`,
    from: { part: s.id, terminal: `${s.id}.lead`, name: `${s.name} power (+ and −)` },
    to: { part: "psu", terminal: "psu.out", name: "External 5V supply + / −" },
    color: "Red", colorNote: "a red (+5 V) and a black (GND) lead", kind: "Power", jumper: true,
    purpose: "Provides power to the servo motors.",
    warning: s.id === "sBase" ? "Do not power the servos from the Arduino's 5V pin: use the external supply (project note)." : undefined,
    source: "Pinout table · step 7",
  })),
  { id: "c-gnd", from: { part: "psu", terminal: "psu.gnd", name: "5V supply GND" }, to: { part: "arduino", terminal: "uno.gnd", name: "Arduino GND" }, color: "Black", kind: "Ground", jumper: true,
    purpose: "Gives the controller and the servo power supply the same electrical reference.", warning: "Without it the control signals have no common reference (step 8).", source: "Pinout table · step 8" },
];

/* where the data is silent */
export const OPEN_QUESTIONS = [
  "The steps never say when the shoulder servo is mounted: step 3 connects the first arm section to the base servo, and step 4 adds the elbow servo, but the pinout has a shoulder servo on D5. Here it is fitted at the shoulder in step 3.",
  "The guide doesn't say where the Arduino and the 5V supply sit, or how four servo power leads join the one supply (for example a terminal block or a servo power board). Whatever you use, every servo's + goes to the supply's 5V and every − to its GND.",
  "The guide doesn't name a servo model, only \"enough torque for the selected arm structure\". Standard-size servos are shown.",
];

/* what each step works on, read from that step's own text */
const SERVO_IDS = SERVOS.map((s) => s.id);
export const STEP_VISUALS: Record<number, KitStepVisual> = {
  1: { parts: ["base", "hardware"], focus: ["base"], tools: ["Screwdriver"] },
  2: { parts: ["sBase", "base", "hardware"], focus: ["sBase"], tools: ["Screwdriver"] },
  3: { parts: ["turret", "upperArm", "sShoulder", "horns", "hardware"], focus: ["turret", "upperArm"], detail: "horn", tools: ["Screwdriver"] },
  4: { parts: ["sElbow", "forearm", "hardware"], focus: ["sElbow", "forearm"], tools: ["Screwdriver"] },
  5: { parts: ["gripper", "sGrip", "horns"], focus: ["gripper"], detail: "claw" },
  6: { parts: ["arduino", "wires", ...SERVO_IDS], connections: ["c-d3", "c-d5", "c-d6", "c-d9"], focus: ["arduino"] },
  7: { parts: ["psu", "wires", ...SERVO_IDS], connections: ["c-pwr-sBase", "c-pwr-sShoulder", "c-pwr-sElbow", "c-pwr-sGrip"], focus: ["psu"], detail: "psu" },
  8: { parts: ["psu", "arduino", "wires"], connections: ["c-gnd"], focus: ["psu", "arduino"] },
  9: { parts: ["arduino"], focus: ["arduino"], tools: ["Computer with the Arduino app", "USB cable"], detail: "usb" },
  10: { parts: SERVO_IDS },
};

/* the step each part goes on (so each step shows the build as it stands) */
export const INSTALLED_AT: Record<ArmPartId, number> = {
  base: 1, hardware: 1, sBase: 2, turret: 3, upperArm: 3, sShoulder: 3, horns: 3, sElbow: 4, forearm: 4, gripper: 5, sGrip: 5, arduino: 6, wires: 6, psu: 7,
};

/* ---------- beginner guidance, every line traced back to the project data ---------- */

export const CONNECTION_LEVEL: Record<string, string> = {
  "c-d3": "5 V PWM servo signal: the pulse sets the angle (the Uno is a 5 V board).",
  "c-d5": "5 V PWM servo signal: the pulse sets the angle (the Uno is a 5 V board).",
  "c-d6": "5 V PWM servo signal: the pulse sets the angle (the Uno is a 5 V board).",
  "c-d9": "5 V PWM servo signal: the pulse sets the angle (the Uno is a 5 V board).",
  "c-pwr-sBase": "Regulated 5 V from the external supply. Polarity matters.",
  "c-pwr-sShoulder": "Regulated 5 V from the external supply. Polarity matters.",
  "c-pwr-sElbow": "Regulated 5 V from the external supply. Polarity matters.",
  "c-pwr-sGrip": "Regulated 5 V from the external supply. Polarity matters.",
  "c-gnd": "0 V reference shared by the supply, the servos and the Arduino.",
};

const servoGuide = (joint: string) => ({ need: `It moves the ${joint}: the controller sends an angle and the servo turns the joint to that position.`, tip: "Do not force a servo beyond its mechanical movement range.", tipSource: "Step 3 tip" });
export const PART_GUIDE: Record<ArmPartId, { need: string; tip: string; tipSource: string }> = {
  base: { need: "Everything stands on it. A flat, solid base keeps the arm from tipping as it moves.", tip: "Tighten the structure, but do not overtighten plastic parts.", tipSource: "Step 2 tip" },
  turret: { need: "It turns with the base servo and holds the shoulder joint, so the whole arm can swing left and right.", tip: "Fix it to the servo horn so it turns with the shaft and doesn't slip.", tipSource: "Step 3" },
  upperArm: { need: "It's the first arm section: it lifts the elbow, forearm and gripper.", tip: "Check it moves when the servo shaft turns.", tipSource: "Step 3 checkpoint" },
  forearm: { need: "It reaches out from the elbow and carries the gripper.", tip: "Make sure the elbow moves freely without hitting the frame.", tipSource: "Step 4 checkpoint" },
  sBase: servoGuide("whole arm left and right"),
  sShoulder: servoGuide("upper arm up and down"),
  sElbow: { ...servoGuide("forearm at the elbow"), tip: "Keep its wire away from the moving joints.", tipSource: "Step 4 tip" },
  sGrip: { ...servoGuide("claw open and closed"), tip: "Start with slow movements while testing.", tipSource: "Step 5 tip" },
  horns: { need: "They transfer each servo's rotation to the joint it moves.", tip: "Use horns that match your servos' shafts.", tipSource: "BOM spec" },
  gripper: { need: "It lets the arm hold and release small objects.", tip: "Check it opens and closes smoothly before wiring.", tipSource: "Step 5 checkpoint" },
  arduino: { need: "It runs the program that sends an angle to each of the four servos.", tip: "Keep fingers clear of moving joints when the program starts.", tipSource: "Step 9 tip" },
  psu: { need: "Four servos can need more current than the Arduino should provide, so they get their own 5 V supply.", tip: "Connect everything correctly before switching the supply on.", tipSource: "Step 7 checkpoint" },
  wires: { need: "They carry the control signals and the power connections.", tip: "Check each pin number against the pin connections table before powering up.", tipSource: "Step 6 tip" },
  hardware: { need: "Screws and nuts hold the arm sections and servos together.", tip: "Tighten the arm structure, but do not overtighten plastic parts.", tipSource: "Project tips" },
};

export const STEP_HELP: Record<number, KitStepHelp> = {
  1: { mistake: "Overtightening the screws and cracking plastic parts.", check: "Base rocks? Re-check the screws until it sits flat on the table.", source: "Step 1 checkpoint, project tips" },
  2: { mistake: "Leaving the servo loose in its mounting holes, so it shifts when the arm moves.", check: "Servo moves when you hold the base? Tighten its mounting screws.", source: "Step 2 checkpoint" },
  3: { mistake: "Turning the arm by hand past the servo's mechanical range.", check: "Arm doesn't move when the shaft turns? Check the horn is screwed to the arm section.", source: "Step 3 tip and checkpoint" },
  4: { mistake: "Routing the servo wire where a joint can pinch it.", check: "Elbow hits the frame? Re-seat the forearm on the horn so it moves freely.", source: "Step 4 tip and checkpoint" },
  5: { mistake: "Testing at full speed straight away.", check: "Claw doesn't open and close smoothly? Check it's fixed squarely to the servo horn.", source: "Step 5 tip and checkpoint" },
  6: { mistake: "Mixing up the pins: base D3, shoulder D5, elbow D6, gripper D9.", check: "The wrong joint moves? Check every signal wire against the pin connections table.", source: "Step 6 tip and checkpoint" },
  7: { mistake: "Powering four servos from the Arduino's 5V pin.", safety: "Connect the supply fully before switching it on: servo power to 5V, servo ground to GND.", check: "Servos shake? A weak power supply can cause unstable movement.", source: "Step 7, project note, FAQ" },
  8: { mistake: "Leaving the supply's ground and the Arduino's ground separate.", check: "Servos twitch or ignore commands? The common ground wire is missing or loose.", source: "Step 8 tip and checkpoint" },
  9: { mistake: "Uploading with the wrong board or port selected in the Arduino app.", safety: "Keep fingers clear of moving joints during program startup.", check: "Upload error? Choose 'Arduino Uno' and the correct port, then try again.", source: "Step 9 tip and checkpoint" },
  10: { mistake: "Testing every joint at once instead of one at a time.", safety: "Keep fingers clear and start with slow movements.", check: "A servo shakes? Check the power supply, wiring and mounting. A joint strains at the end of its travel? Adjust that angle in the code so no joint is forced.", source: "Step 10 tip, FAQ, code note" },
};

export const TOOLS: string[] = Array.from(new Set(Object.values(STEP_VISUALS).flatMap((v) => v.tools ?? [])));
