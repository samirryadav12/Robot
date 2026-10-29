import type { KitConnection, KitPart, KitStepHelp, KitStepVisual } from "./kit";

/* The BalanceBot Pro workshop's knowledge, kept separate from the 3D code so it can be checked against the project
   data. Every fact here comes from src/data/projects.ts (the BalanceBot Pro BOM, pinout, steps, code, FAQ):
   - parts point at BOM ids; names, specs, quantities and prices are read from the BOM at runtime
   - connections are the pinout table plus the wiring spelled out in steps 7, 10, 11 and 12 (the motor pairs, the
     encoders' and the HC-05's power, the switched battery harness, the camera's 5 V)
   - each step's parts, tools and wires are taken from that step's own text
   Where the data is silent or doubtful, it says so (see OPEN_QUESTIONS) instead of guessing. */

export type BalPartId =
  | "basePlate" | "midPlate" | "brainPlate" | "topPlate" | "standoffs" | "brackets"
  | "motorL" | "motorR" | "wheelL" | "wheelR" | "battery" | "switch" | "driver" | "buck"
  | "uno" | "imu" | "bt" | "cam" | "wires";

export const PARTS: (KitPart & { id: BalPartId })[] = [
  { id: "basePlate", bomId: "bb-chs-01", label: "Base carbon plate", labelled: true, onRobot: true,
    where: "The bottom deck: the motor brackets hang under it and the battery sits on it (steps 2, 5)." },
  { id: "midPlate", bomId: "bb-chs-01", label: "Intermediate plate", labelled: true, onRobot: true,
    where: "The second deck, above the battery: it carries the motor driver and the buck converter (steps 5, 6)." },
  { id: "brainPlate", bomId: "bb-chs-01", label: "Middle plate", labelled: true, onRobot: true,
    where: "The third deck: the Arduino Uno, the MPU6050 and the toggle switch (steps 8, 9)." },
  { id: "topPlate", bomId: "bb-chs-01", label: "Top plate", labelled: true, onRobot: true,
    where: "Closes the tower; it carries the HC-05 and the camera (step 12)." },
  { id: "standoffs", bomId: "bb-hw-01", label: "Brass standoffs", labelled: true, onRobot: true,
    where: "Six 45 mm pillars between each pair of decks (steps 5, 8, 12)." },
  { id: "brackets", bomId: "bb-brk-01", label: "37 mm motor brackets", labelled: true, onRobot: true,
    where: "Under the base plate, one each side on a line through the centre (step 2)." },
  { id: "motorL", bomId: "bb-mot-01", label: "Left encoder motor", labelled: true, onRobot: true,
    where: "In the left bracket, shaft out, encoder board facing the centre (step 3)." },
  { id: "motorR", bomId: "bb-mot-01", label: "Right encoder motor", labelled: true, onRobot: true,
    where: "In the right bracket, shaft out, encoder board facing the centre (step 3)." },
  { id: "wheelL", bomId: "bb-whl-01", label: "Left 85 mm wheel", labelled: true, onRobot: true,
    where: "On the left motor's 6 mm coupling (step 4)." },
  { id: "wheelR", bomId: "bb-whl-01", label: "Right 85 mm wheel", labelled: true, onRobot: true,
    where: "On the right motor's 6 mm coupling (step 4)." },
  { id: "battery", bomId: "bb-bat-01", label: "3S Li-Po battery", labelled: true, onRobot: true,
    where: "Strapped to the middle of the base deck, as low as possible (step 5)." },
  { id: "switch", bomId: "bb-swt-01", label: "Toggle switch + XT60 lead", labelled: true, onRobot: true,
    where: "On the edge of the middle deck, reachable from outside (steps 8, 11)." },
  { id: "driver", bomId: "bb-drv-01", label: "TB6612FNG motor driver", labelled: true, onRobot: true,
    where: "In the centre of the intermediate deck (step 6)." },
  { id: "buck", bomId: "bb-buck-01", label: "LM2596 buck (5 V for the camera)", labelled: true, onRobot: true,
    where: "Beside the driver on the intermediate deck (step 6)." },
  { id: "uno", bomId: "bb-mcu-01", label: "Arduino Uno", labelled: true, onRobot: true,
    where: "On the middle deck, USB toward the back (step 8)." },
  { id: "imu", bomId: "bb-imu-01", label: "MPU6050 IMU", labelled: true, onRobot: true,
    where: "Flat and rigid next to the Uno, X arrow forward (step 9)." },
  { id: "bt", bomId: "bb-bt-01", label: "HC-05 Bluetooth", labelled: true, onRobot: true,
    where: "On the top plate, antenna upright (step 12)." },
  { id: "cam", bomId: "bb-cam-01", label: "ESP32-CAM (FPV)", labelled: true, onRobot: true,
    where: "On its printed mount on the top plate, facing forward (step 12)." },
  { id: "wires", bomId: "bb-wir-01", label: "Jumpers & silicone wire", labelled: true, onRobot: true,
    where: "Jumpers from every module to the Uno; silicone wire for the battery harness and motors (steps 7, 10, 11)." },
];

/* ---------- connections ---------- */
const toUno = (id: string, part: string, t: string, name: string, pin: string, pinName: string, color: string, purpose: string, kind: "Digital" | "PWM" | "Power" | "Ground" = "Digital", warning?: string, source = "Pinout table · step 10"): KitConnection => ({
  id, from: { part, terminal: t, name }, to: { part: "uno", terminal: `uno.${pin}`, name: `Uno ${pinName}` }, color, kind, jumper: true, purpose, warning, source,
});
const power5 = (id: string, part: string, t: string, name: string, source = "Step 10"): KitConnection[] => [
  toUno(`${id}v`, part, `${t}.vcc`, `${name} VCC`, "5v", "5V", "Red", `Powers the ${name} from the Uno's 5 V.`, "Power", undefined, source),
  toUno(`${id}g`, part, `${t}.gnd`, `${name} GND`, "gnd", "GND", "Black", `Ground for the ${name}.`, "Ground", undefined, source),
];
const enc = (side: "L" | "R", a: string, aName: string, b: string, bName: string): KitConnection[] => {
  const part = side === "L" ? "motorL" : "motorR", t = `mot${side}`, who = side === "L" ? "left" : "right";
  return [
    toUno(`c-e${side.toLowerCase()}a`, part, `${t}.a`, `${side === "L" ? "Left" : "Right"} encoder A`, a, aName, "Yellow", `Counts the ${who} wheel's pulses (interrupt pin).`, "Digital",
      side === "L" ? "The A channels must be on D2 and D3, the Uno's only interrupt pins." : undefined),
    toUno(`c-e${side.toLowerCase()}b`, part, `${t}.b`, `${side === "L" ? "Left" : "Right"} encoder B`, b, bName, "Green", `Tells which way the ${who} wheel turns.`),
    ...power5(`c-e${side.toLowerCase()}`, part, t, `${who} encoder`),
  ];
};
const motor = (id: string, side: "L" | "R", pin: "m1" | "m2", out: string, color: string): KitConnection => ({
  id, from: { part: side === "L" ? "motorL" : "motorR", terminal: `mot${side}.${pin}`, name: `${side === "L" ? "Left" : "Right"} motor ${pin.toUpperCase()}` },
  to: { part: "driver", terminal: `drv.${out}`, name: `TB6612 ${out.toUpperCase()}` },
  color, colorNote: "motor wire colour varies by supplier", kind: "Motor", jumper: false,
  purpose: `Drives the ${side === "L" ? "left" : "right"} wheel.`,
  warning: pin === "m1" ? "If this wheel turns the wrong way, swap the motor's two power wires (step 7)." : undefined,
  source: "Step 7",
});

export const CONNECTIONS: KitConnection[] = [
  toUno("c-pwma", "driver", "drv.pwma", "TB6612 PWMA", "d5", "D5 (PWM)", "White", "Speed of the left motor.", "PWM"),
  toUno("c-ain1", "driver", "drv.ain1", "TB6612 AIN1", "d7", "D7", "Blue", "Left motor direction."),
  toUno("c-ain2", "driver", "drv.ain2", "TB6612 AIN2", "d8", "D8", "Purple", "Left motor direction."),
  toUno("c-pwmb", "driver", "drv.pwmb", "TB6612 PWMB", "d6", "D6 (PWM)", "Gray", "Speed of the right motor.", "PWM"),
  toUno("c-bin1", "driver", "drv.bin1", "TB6612 BIN1", "d9", "D9", "Orange", "Right motor direction."),
  toUno("c-bin2", "driver", "drv.bin2", "TB6612 BIN2", "d10", "D10", "Brown", "Right motor direction."),
  toUno("c-stby", "driver", "drv.stby", "TB6612 STBY", "d4", "D4", "Yellow", "HIGH enables the driver; LOW stops both motors.", "Digital", "Without STBY HIGH the motors never move."),
  ...power5("c-drv", "driver", "drv", "driver logic"),
  toUno("c-sda", "imu", "imu.sda", "MPU6050 SDA", "a4", "A4 (SDA)", "Green", "I²C data from the gyro and accelerometer."),
  toUno("c-scl", "imu", "imu.scl", "MPU6050 SCL", "a5", "A5 (SCL)", "Yellow", "I²C clock."),
  ...power5("c-imu", "imu", "imu", "MPU6050"),
  ...enc("L", "d2", "D2 (INT0)", "d11", "D11"),
  ...enc("R", "d3", "D3 (INT1)", "a0", "A0"),
  toUno("c-btx", "bt", "bt.tx", "HC-05 TX", "a2", "A2", "Yellow", "Steering commands from the phone (SoftwareSerial RX)."),
  toUno("c-brx", "bt", "bt.rx", "HC-05 RX", "a3", "A3", "Blue", "Replies to the phone.", "Digital", "The HC-05 RX is 3.3 V: put a 1 kΩ/2 kΩ divider in this wire (step 10)."),
  ...power5("c-bt", "bt", "bt", "HC-05", "Step 12"),
  // the camera has only power: it streams over its own Wi-Fi
  { id: "c-camv", from: { part: "cam", terminal: "cam.5v", name: "ESP32-CAM 5V" }, to: { part: "buck", terminal: "buck.out5", name: "Buck 5 V out" }, color: "Red", kind: "Power", jumper: true,
    purpose: "The camera's own 5 V supply.", source: "Step 12" },
  { id: "c-camg", from: { part: "cam", terminal: "cam.gnd", name: "ESP32-CAM GND" }, to: { part: "buck", terminal: "buck.outg", name: "Buck GND out" }, color: "Black", kind: "Ground", jumper: true,
    purpose: "The camera's ground.", source: "Step 12" },
  // the switched battery harness and the common ground
  { id: "c-bat", from: { part: "battery", terminal: "bat.pos", name: "Battery + (XT60)" }, to: { part: "switch", terminal: "sw.in", name: "Toggle switch in" }, color: "Red", kind: "Power", jumper: false,
    purpose: "Battery positive into the toggle switch.", warning: "Switch OFF and battery unplugged while wiring (step 11).", source: "Step 11" },
  { id: "c-svm", from: { part: "switch", terminal: "sw.out", name: "Switched +" }, to: { part: "driver", terminal: "drv.vm", name: "TB6612 VM" }, color: "Red", kind: "Power", jumper: false,
    purpose: "Battery power for the motors.", source: "Pinout table · step 11" },
  { id: "c-svin", from: { part: "switch", terminal: "sw.out", name: "Switched +" }, to: { part: "uno", terminal: "uno.vin", name: "Uno VIN" }, color: "Red", kind: "Power", jumper: false,
    purpose: "11.1 V into the Uno's regulator.", source: "Pinout table · step 11" },
  { id: "c-sbuck", from: { part: "switch", terminal: "sw.out", name: "Switched +" }, to: { part: "buck", terminal: "buck.inp", name: "Buck IN+" }, color: "Red", kind: "Power", jumper: false,
    purpose: "Feeds the buck converter for the camera.", warning: "Set the buck to 5.0 V before connecting the camera (step 6).", source: "Step 11" },
  { id: "c-batg", from: { part: "battery", terminal: "bat.neg", name: "Battery − (XT60)" }, to: { part: "driver", terminal: "drv.gnd", name: "Common GND" }, color: "Black", kind: "Ground", jumper: false,
    purpose: "Battery negative onto the common ground.", warning: "CRITICAL: battery, driver, Uno and buck must share one ground (step 11).", source: "Pinout table · step 11" },
  { id: "c-bgnd", from: { part: "buck", terminal: "buck.ing", name: "Buck GND in" }, to: { part: "driver", terminal: "drv.gnd", name: "Common GND" }, color: "Black", kind: "Ground", jumper: false,
    purpose: "The buck converter's ground on the common point.", source: "Step 11" },
  motor("c-ml1", "L", "m1", "a01", "Red"), motor("c-ml2", "L", "m2", "a02", "White"),
  motor("c-mr1", "R", "m1", "b01", "Red"), motor("c-mr2", "R", "m2", "b02", "White"),
];

export const OPEN_QUESTIONS = [
  "This build guide was written for the BalanceBot Pro concept images; prices and part choices are estimates, so check them against your suppliers.",
  "The images label the top-plate antenna board 'GPS/IMU sensor'. A balancing robot doesn't need GPS, so the guide uses that spot for the HC-05 Bluetooth module (steering) and keeps the IMU on the middle deck, close to the robot's centre.",
  "A full 3S Li-Po is 12.6 V: within the TB6612FNG's 15 V limit and the Uno's VIN range, but the JGB37-520 motors are rated 12 V, so they run slightly fast on a fresh pack.",
  "The PID values in the code (Kp 28, Ki 0.6, Kd 1.2) are starting points. Every build needs its own tuning (step 13).",
  "The ESP32-CAM needs its own streaming sketch (the CameraWebServer example), which isn't part of this project's code.",
];

const SIGNALS = ["c-pwma", "c-ain1", "c-ain2", "c-pwmb", "c-bin1", "c-bin2", "c-stby", "c-drvv", "c-drvg", "c-sda", "c-scl", "c-imuv", "c-imug",
  "c-ela", "c-elb", "c-elv", "c-elg", "c-era", "c-erb", "c-erv", "c-erg", "c-btx", "c-brx"];
export const STEP_VISUALS: Record<number, KitStepVisual> = {
  1: { parts: ["basePlate", "midPlate", "brainPlate", "topPlate", "standoffs"], focus: ["basePlate"], exploded: true, tools: ["A clean table", "Dust mask"] },
  2: { parts: ["brackets", "basePlate"], focus: ["brackets"], tools: ["Screwdriver", "M3 screws and nuts"] },
  3: { parts: ["motorL", "motorR", "brackets"], focus: ["motorL", "motorR"], tools: ["Screwdriver"] },
  4: { parts: ["wheelL", "wheelR"], focus: ["wheelL", "wheelR"], tools: ["Hex key", "Thread-lock"] },
  5: { parts: ["battery", "standoffs", "midPlate"], focus: ["battery"], tools: ["Velcro battery strap"] },
  6: { parts: ["driver", "buck", "midPlate"], focus: ["driver", "buck"], tools: ["Screwdriver", "Multimeter (to set 5.0 V)", "10 mm standoffs"] },
  7: { parts: ["motorL", "motorR", "driver"], connections: ["c-ml1", "c-ml2", "c-mr1", "c-mr2"], focus: ["driver"], tools: ["Small screwdriver"] },
  8: { parts: ["brainPlate", "uno", "switch"], focus: ["uno"], detail: "usb", tools: ["Screwdriver", "10 mm standoffs"] },
  9: { parts: ["imu"], focus: ["imu"], tools: ["Short standoffs or double-sided foam tape"] },
  10: { parts: ["uno", "driver", "imu", "motorL", "motorR", "bt", "wires"], connections: SIGNALS, focus: ["uno", "driver"], tools: ["1 kΩ and 2 kΩ resistors", "Small cable ties"], seeThrough: ["brainPlate"] },
  11: { parts: ["battery", "switch", "driver", "uno", "buck", "wires"], connections: ["c-bat", "c-svm", "c-svin", "c-sbuck", "c-batg", "c-bgnd"], focus: ["switch", "battery"], detail: "switch", seeThrough: ["midPlate", "brainPlate"] },
  12: { parts: ["topPlate", "bt", "cam"], connections: ["c-btv", "c-btg", "c-camv", "c-camg"], focus: ["topPlate", "cam"], tools: ["Screwdriver"] },
  13: { parts: [], track: true, tools: ["Computer with the Arduino app", "USB cable", "A soft surface to catch falls"] },
};

export const INSTALLED_AT: Record<BalPartId, number> = {
  basePlate: 1, midPlate: 5, brainPlate: 8, topPlate: 12, standoffs: 5, brackets: 2, motorL: 3, motorR: 3, wheelL: 4, wheelR: 4,
  battery: 5, switch: 8, driver: 6, buck: 6, uno: 8, imu: 9, bt: 12, cam: 12, wires: 7,
};

/* ---------- beginner guidance, every line traced back to the project data ---------- */

export const CONNECTION_LEVEL: Record<string, string> = Object.fromEntries([
  ...["c-ain1", "c-ain2", "c-bin1", "c-bin2", "c-stby", "c-ela", "c-elb", "c-era", "c-erb", "c-btx"].map((id) => [id, "5 V logic signal (the Uno is a 5 V board)."]),
  ["c-pwma", "5 V PWM speed signal."], ["c-pwmb", "5 V PWM speed signal."],
  ["c-sda", "I²C data (the GY-521 board shifts it to 3.3 V itself)."], ["c-scl", "I²C clock."],
  ["c-brx", "5 V serial from the Uno: divide it to 3.3 V for the HC-05."],
  ...CONNECTIONS.filter((c) => c.to.terminal === "uno.5v" || c.to.terminal === "buck.out5").map((c) => [c.id, "5 V supply. Polarity matters."]),
  ...CONNECTIONS.filter((c) => ["uno.gnd", "buck.outg", "drv.gnd"].includes(c.to.terminal)).map((c) => [c.id, "0 V common ground."]),
  ...["c-bat", "c-svm", "c-svin", "c-sbuck"].map((id) => [id, "Battery positive: 11.1 V nominal, 12.6 V when full. Polarity matters."]),
  ...CONNECTIONS.filter((c) => c.kind === "Motor").map((c) => [c.id, "Motor output from the driver. Swapping a pair reverses that wheel."]),
]);

const plate = (need: string, tip: string, tipSource: string) => ({ need, tip, tipSource });
const motorGuide = { need: "It drives one wheel; its encoder counts the turns so the robot can hold its place.", tip: "Note which motor is left and right on its cable.", tipSource: "Step 3 tip" };
const wheelGuide = { need: "Soft rubber grips the floor so the wheel never slips when the robot catches itself.", tip: "Thread-lock the coupling grub screws.", tipSource: "Step 4 tip" };
export const PART_GUIDE: Record<BalPartId, { need: string; tip: string; tipSource: string }> = {
  basePlate: plate("The bottom deck holds the motors and the heavy battery, low down.", "Both motor brackets must sit on one line through the centre.", "Step 2 tip"),
  midPlate: plate("It carries the motor driver and buck converter above the battery.", "Pass the battery lead and motor cables up through its slot first.", "Step 5"),
  brainPlate: plate("It carries the Uno and the IMU near the robot's middle.", "Keep the Uno's USB toward the back.", "Step 8 tip"),
  topPlate: plate("It closes the tower and carries the Bluetooth module and camera.", "Keep the top light.", "Step 12 tip"),
  standoffs: plate("They stack the four decks rigidly.", "Sort the 45 mm and 10 mm standoffs before you start.", "Step 1"),
  brackets: plate("They hold the motors exactly opposite each other.", "Line both up through the plate's centre.", "Step 2 tip"),
  motorL: motorGuide, motorR: motorGuide, wheelL: wheelGuide, wheelR: wheelGuide,
  battery: plate("It powers everything, and its weight low down makes balancing easier.", "Centre it left-to-right on the base deck.", "Step 5 tip, FAQ"),
  switch: plate("One flick cuts all power when the robot falls.", "Keep it OFF while wiring and uploading.", "Steps 11, 13"),
  driver: plate("It switches battery power to the motors fast enough for balancing.", "STBY must be HIGH or nothing moves.", "Pinout table"),
  buck: plate("It gives the camera its own 5 V, so Wi-Fi bursts don't disturb the Uno.", "Set it to 5.0 V before connecting the camera.", "Step 6 tip"),
  uno: plate("It runs the balancing loop about 200 times a second.", "The encoder A channels need its interrupt pins, D2 and D3.", "Step 10 checkpoints"),
  imu: plate("It measures how far and how fast the robot is tipping.", "Mount it rigidly: a loose IMU makes the robot wobble.", "Step 9 tip"),
  bt: plate("It lets you steer from a phone while the robot balances.", "Its RX needs a voltage divider.", "Step 10 checkpoints"),
  cam: plate("It streams a first-person view over Wi-Fi.", "It needs its own streaming sketch.", "FAQ"),
  wires: plate("Jumpers carry the signals; silicone wire carries battery and motor current.", "Keep the IMU wires short and away from the motor wires.", "Step 10 tip"),
};

export const STEP_HELP: Record<number, KitStepHelp> = {
  1: { mistake: "Mixing up the plates: the base has the bracket slots, the top has the camera cut-out.", check: "Pillar holes don't line up? Turn the plate.", source: "Step 1" },
  2: { mistake: "Brackets not exactly opposite each other.", check: "Robot turns as it balances later? Re-check the brackets.", source: "Step 2 tip" },
  3: { mistake: "Losing track of which motor is left and right.", check: "Shafts at different heights? Re-seat the motor in its bracket.", source: "Step 3" },
  4: { mistake: "Grub screw on the round part of the shaft.", check: "Wheel wobbles? Re-seat it on the D-flat.", source: "Step 4" },
  5: { mistake: "Battery off-centre, so the robot leans to one side.", check: "Cables pinched? Lift the intermediate plate and re-route them.", source: "Step 5 checkpoints" },
  6: { mistake: "Connecting the buck converter before setting 5.0 V.", safety: "An unset buck converter can put out far more than 5 V.", check: "Driver pins hidden? Turn it so they face up.", source: "Step 6 tip" },
  7: { mistake: "Using the encoder wires as motor wires.", safety: "Battery unplugged while wiring.", check: "Wheel spins the wrong way later? Swap its two power wires.", source: "Step 7" },
  8: { mistake: "USB facing forward, where the cable snags.", check: "Switch out of reach? Move it to the deck edge.", source: "Step 8 checkpoints" },
  9: { mistake: "Mounting the IMU loosely or at an angle.", check: "Robot wobbles? Tap the deck: the IMU must not move.", source: "Step 9 tip, checkpoints" },
  10: { mistake: "Encoder A channels not on D2 and D3.", check: "Robot rolls away slowly? Check the encoders' pins and power.", source: "Step 10 checkpoints, FAQ" },
  11: { mistake: "No common ground between the boards.", safety: "Switch OFF and battery unplugged while wiring.", check: "Motors ignore the Uno? Check the ground joints and STBY.", source: "Step 11" },
  12: { mistake: "Heavy parts hanging off one side of the top plate.", check: "Camera not facing forward? Turn its mount.", source: "Step 12 checkpoints" },
  13: { mistake: "Skipping BALANCE_ANGLE and going straight to the PID values.", safety: "Hold the robot over a soft surface: it falls a lot while tuning.", check: "Fast shaking? Lower Kp or raise Kd. Slow drift? Raise Ki a little.", source: "Step 13, FAQ" },
};

export const TOOLS: string[] = Array.from(new Set(Object.values(STEP_VISUALS).flatMap((v) => v.tools ?? [])));
