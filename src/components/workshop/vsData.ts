import type { KitConnection, KitPart, KitStepHelp, KitStepVisual } from "./kit";

/* The Vision Sorter Station workshop's knowledge, kept separate from the 3D code so it can be checked against the
   project data. Every fact here comes from src/data/projects.ts (the Vision Sorter BOM, pinout, steps, code, FAQ):
   - parts point at BOM ids; names, specs, quantities and prices are read from the BOM at runtime
   - connections are the pinout table plus the wiring spelled out in steps 10–12 (the motor and LED bars, the servos
     on the PCA9685, the 12 V bus through the E-stop, the 5 V from the buck converter, the common ground)
   - each step's parts, tools and wires are taken from that step's own text
   Where the data is silent or doubtful, it says so (see OPEN_QUESTIONS) instead of guessing. */

export type VsPartId =
  | "frame" | "arch" | "belt" | "motor" | "camera" | "leds" | "ir" | "servoA" | "servoB" | "chutes"
  | "cabinet" | "psu" | "estop" | "buck" | "pi" | "pca" | "driver" | "mosfet" | "hmi" | "wires";

export const PARTS: (KitPart & { id: VsPartId })[] = [
  { id: "frame", bomId: "vs-frm-01", label: "T-slot table frame", labelled: true, onRobot: true,
    where: "The aluminium table: top rails, four legs, lower stretchers and levelling feet (step 1)." },
  { id: "arch", bomId: "vs-frm-01", label: "Vision arch", labelled: true, onRobot: true,
    where: "Two posts and a cross-beam over the belt, carrying the camera and lights (step 4)." },
  { id: "belt", bomId: "vs-belt-01", label: "Conveyor belt, rollers & guards", labelled: true, onRobot: true,
    where: "Along the top of the frame: drive roller on the left, idler on the right, bed and side guards between (step 2)." },
  { id: "motor", bomId: "vs-mot-01", label: "Conveyor gear motor", labelled: true, onRobot: true,
    where: "Under the left end of the belt, coupled to the drive roller (step 3)." },
  { id: "camera", bomId: "vs-cam-01", label: "Pi Camera Module 3", labelled: true, onRobot: true,
    where: "In the centre of the arch's beam, looking straight down at the belt (step 4)." },
  { id: "leds", bomId: "vs-led-01", label: "LED inspection bars", labelled: true, onRobot: true,
    where: "Either side of the camera on the beam, angled in (step 4)." },
  { id: "ir", bomId: "vs-ir-01", label: "E18-D80NK item sensor", labelled: true, onRobot: true,
    where: "On the near side guard, just before the camera, looking across the belt (step 5)." },
  { id: "servoA", bomId: "vs-srv-01", label: "Pusher A (red, ch 0)", labelled: true, onRobot: true,
    where: "On the far guard opposite the red chute (step 6)." },
  { id: "servoB", bomId: "vs-srv-01", label: "Pusher B (green, ch 1)", labelled: true, onRobot: true,
    where: "On the far guard opposite the green chute (step 6)." },
  { id: "chutes", bomId: "vs-chu-01", label: "Chutes & bins", labelled: true, onRobot: true,
    where: "Two chutes on the near side leading down to the red and green bins (step 6)." },
  { id: "cabinet", bomId: "vs-cab-01", label: "Control cabinet", labelled: true, onRobot: true,
    where: "At the right end of the frame, clear door at the front, DIN rail inside (step 7)." },
  { id: "psu", bomId: "vs-psu-01", label: "12 V adapter jack & terminals", labelled: true, onRobot: true,
    where: "The panel jack on the cabinet side and the terminal blocks on the DIN rail (steps 7, 12)." },
  { id: "estop", bomId: "vs-est-01", label: "Emergency stop", labelled: true, onRobot: true,
    where: "On the cabinet's front, in instant reach (step 7)." },
  { id: "buck", bomId: "vs-buck-01", label: "5 V buck converter", labelled: true, onRobot: true,
    where: "On the cabinet's back panel, set to 5.1 V (step 8)." },
  { id: "pi", bomId: "vs-pi-01", label: "Raspberry Pi 4", labelled: true, onRobot: true,
    where: "On the cabinet's back panel, ports toward the door (step 8)." },
  { id: "pca", bomId: "vs-pca-01", label: "PCA9685 servo driver", labelled: true, onRobot: true,
    where: "Beside the Pi on the back panel (step 8)." },
  { id: "driver", bomId: "vs-drv-01", label: "L298N (conveyor)", labelled: true, onRobot: true,
    where: "On the back panel, below the Pi (step 8)." },
  { id: "mosfet", bomId: "vs-mos-01", label: "LED MOSFET switch", labelled: true, onRobot: true,
    where: "On the back panel beside the driver (step 8)." },
  { id: "hmi", bomId: "vs-hmi-01", label: "7\" touch display (HMI)", labelled: true, onRobot: true,
    where: "On its arm above the cabinet, tilted toward the operator (step 9)." },
  { id: "wires", bomId: "vs-wir-01", label: "Wires & jumpers", labelled: true, onRobot: true,
    where: "Jumpers on the Pi's header; ferruled wire in every screw terminal (steps 10–12)." },
];

/* ---------- connections ---------- */
type Kind = KitConnection["kind"];
const c = (id: string, part: string, t: string, name: string, toPart: string, toT: string, toName: string, color: string, kind: Kind, purpose: string, source: string, jumper = true, warning?: string, colorNote?: string): KitConnection => ({
  id, from: { part, terminal: t, name }, to: { part: toPart, terminal: toT, name: toName }, color, kind, jumper, purpose, source, warning, colorNote,
});
const pi = (id: string, part: string, t: string, name: string, pin: string, pinName: string, color: string, kind: Kind, purpose: string, source = "Pinout table · step 11", warning?: string) =>
  c(id, part, t, name, "pi", `pi.${pin}`, `Pi ${pinName}`, color, kind, purpose, source, true, warning);
const servo = (s: "A" | "B", ch: 0 | 1): KitConnection[] => {
  const part = `servo${s}`, who = s === "A" ? "red" : "green";
  return [
    c(`c-s${s.toLowerCase()}s`, part, `${part}.sig`, `Servo ${s} signal`, "pca", `pca.ch${ch}s`, `PCA9685 ch ${ch} PWM`, "Orange", "PWM", `Swings the ${who} pusher.`, "Step 11"),
    c(`c-s${s.toLowerCase()}v`, part, `${part}.v`, `Servo ${s} V+`, "pca", `pca.ch${ch}v`, `PCA9685 ch ${ch} V+`, "Red", "Power", "Servo power from the PCA9685's V+ rail.", "Step 11"),
    c(`c-s${s.toLowerCase()}g`, part, `${part}.g`, `Servo ${s} GND`, "pca", `pca.ch${ch}g`, `PCA9685 ch ${ch} GND`, "Brown", "Ground", "Servo ground.", "Step 11"),
  ];
};

export const CONNECTIONS: KitConnection[] = [
  pi("c-ena", "driver", "drv.ena", "L298N ENA", "gpio18", "GPIO18 (PWM)", "White", "PWM", "Sets the belt speed.", undefined, "Remove the ENA jumper cap so the Pi controls the speed."),
  pi("c-in1", "driver", "drv.in1", "L298N IN1", "gpio23", "GPIO23", "Blue", "Digital", "Belt forward."),
  pi("c-in2", "driver", "drv.in2", "L298N IN2", "gpio24", "GPIO24", "Purple", "Digital", "Belt reverse."),
  pi("c-sda", "pca", "pca.sda", "PCA9685 SDA", "gpio2", "GPIO2 (SDA)", "Green", "Digital", "I²C data to the servo driver."),
  pi("c-scl", "pca", "pca.scl", "PCA9685 SCL", "gpio3", "GPIO3 (SCL)", "Yellow", "Digital", "I²C clock."),
  pi("c-pcav", "pca", "pca.vcc", "PCA9685 VCC", "3v3", "3.3V", "Red", "Power", "Logic supply for the servo driver."),
  pi("c-pcag", "pca", "pca.gnd", "PCA9685 GND", "gnd", "GND", "Black", "Ground", "Logic ground."),
  pi("c-irs", "ir", "ir.out", "Item sensor OUT", "gpio17", "GPIO17", "Yellow", "Digital", "Goes low when an item arrives under the camera.", undefined,
    "The sensor is 5 V and the Pi is 3.3 V: put a 10 kΩ/20 kΩ divider in this wire (step 11)."),
  pi("c-irv", "ir", "ir.vcc", "Item sensor VCC", "5v", "5V", "Red", "Power", "The sensor's 5 V supply."),
  pi("c-irg", "ir", "ir.gnd", "Item sensor GND", "gnd", "GND", "Black", "Ground", "The sensor's ground."),
  pi("c-mos", "mosfet", "mos.sig", "MOSFET SIG", "gpio27", "GPIO27", "Orange", "Digital", "Turns the inspection lights on."),
  pi("c-mosg", "mosfet", "mos.gnd", "MOSFET logic GND", "gnd", "GND", "Black", "Ground", "Logic ground for the switch."),
  c("c-cam", "camera", "cam.ribbon", "Camera ribbon", "pi", "pi.csi", "Pi CSI camera port", "Gray", "Digital", "Image data from the camera.", "Pinout table · step 11", false, "Contacts toward the HDMI ports; never pull on the ribbon."),
  c("c-dsi", "hmi", "hmi.ribbon", "Display ribbon", "pi", "pi.dsi", "Pi DSI display port", "Gray", "Digital", "Picture and touch to and from the HMI panel.", "Pinout table · step 11", false, "Support the ribbon along its whole length (step 9)."),
  pi("c-hmiv", "hmi", "hmi.5v", "Display 5V", "5v", "5V", "Red", "Power", "Powers the display from the Pi's header.", "Step 11"),
  pi("c-hmig", "hmi", "hmi.gnd", "Display GND", "gnd", "GND", "Black", "Ground", "The display's ground.", "Step 11"),
  ...servo("A", 0), ...servo("B", 1),
  // 5 V from the buck converter
  c("c-pcavp", "pca", "pca.vplus", "PCA9685 V+", "buck", "buck.out5", "Buck 5 V out", "Red", "Power", "Servo power straight from the buck converter.", "Step 12", false, "Never power the servos from the Pi's header: it reboots the Pi (FAQ)."),
  c("c-pcavm", "pca", "pca.vminus", "PCA9685 V−", "buck", "buck.outg", "Buck GND out", "Black", "Ground", "Servo ground.", "Step 12", false),
  c("c-pi5", "pi", "pi.5v", "Pi 5V", "buck", "buck.out5", "Buck 5 V out", "Red", "Power", "5.1 V for the Pi.", "Pinout table · step 12", true, "Set the buck to 5.1 V before connecting the Pi (step 8)."),
  c("c-pig", "pi", "pi.gnd", "Pi GND", "driver", "drv.gnd", "Common GND", "Black", "Ground", "The Pi's ground on the common point.", "Pinout table · step 12", true, "CRITICAL: every board shares one ground."),
  // the 12 V bus through the E-stop
  c("c-jack", "psu", "psu.pos", "Jack +12 V", "estop", "estop.in", "E-stop in", "Red", "Power", "Adapter power into the E-stop.", "Step 12", false, "Unplug the adapter while wiring (step 12)."),
  c("c-e12d", "estop", "estop.out", "E-stop out (12 V bus)", "driver", "drv.12v", "L298N 12V In", "Red", "Power", "Switched 12 V for the conveyor motor.", "Pinout table · step 12", false),
  c("c-e12b", "estop", "estop.out", "E-stop out (12 V bus)", "buck", "buck.inp", "Buck IN+", "Red", "Power", "Feeds the 5 V buck converter.", "Step 12", false),
  c("c-e12m", "estop", "estop.out", "E-stop out (12 V bus)", "mosfet", "mos.vin", "MOSFET VIN", "Red", "Power", "Supply for the LED bars.", "Step 12", false),
  c("c-psug", "psu", "psu.neg", "Jack 0 V", "driver", "drv.gnd", "Common GND", "Black", "Ground", "Adapter negative onto the common ground.", "Pinout table · step 12", false),
  c("c-bgnd", "buck", "buck.ing", "Buck GND in", "driver", "drv.gnd", "Common GND", "Black", "Ground", "The buck converter's ground.", "Step 12", false),
  c("c-mpg", "mosfet", "mos.pgnd", "MOSFET power GND", "driver", "drv.gnd", "Common GND", "Black", "Ground", "The light circuit's ground.", "Step 12", false),
  // the loads
  c("c-ledp", "leds", "leds.pos", "LED bars +", "mosfet", "mos.vplus", "MOSFET V+", "Red", "Power", "LED bars positive.", "Step 10", false),
  c("c-ledn", "leds", "leds.neg", "LED bars −", "mosfet", "mos.vminus", "MOSFET V− (switched)", "Black", "Ground", "LED bars negative, switched by the MOSFET.", "Step 10", false),
  c("c-m1", "motor", "mot.a", "Motor wire 1", "driver", "drv.out1", "L298N OUT1", "Red", "Motor", "Drives the conveyor.", "Step 10", false, "If the belt runs backwards, swap the motor's two wires (step 10).", "motor wire colour varies by supplier"),
  c("c-m2", "motor", "mot.b", "Motor wire 2", "driver", "drv.out2", "L298N OUT2", "Black", "Motor", "Drives the conveyor.", "Step 10", false, undefined, "motor wire colour varies by supplier"),
];

export const OPEN_QUESTIONS = [
  "This build guide was written for the Vision Sorter Station concept images; prices and part choices are estimates, so check them against your suppliers.",
  "The images show an industrial PLC, pneumatic pushers and a mains power supply. This maker-scale build uses a Raspberry Pi as the controller, servo pushers and a plug-in 12 V adapter, so there is no mains wiring inside the cabinet.",
  "The images label a small antenna board on the arch 'GPS/IMU sensor'. A fixed sorting station doesn't need one, so it isn't part of this build (the Pi has Wi-Fi built in).",
  "PUSH_DELAY and the HSV colour ranges in the code are starting values: they depend on your belt speed, pusher positions and lighting (step 13).",
  "The project has no wiring photo yet; the circuit diagram here is drawn from the pin table and the steps.",
];

const PI_SIG = ["c-ena", "c-in1", "c-in2", "c-sda", "c-scl", "c-pcav", "c-pcag", "c-irs", "c-irv", "c-irg", "c-mos", "c-mosg", "c-cam", "c-dsi", "c-hmiv", "c-hmig",
  "c-sas", "c-sav", "c-sag", "c-sbs", "c-sbv", "c-sbg"];
export const STEP_VISUALS: Record<number, KitStepVisual> = {
  1: { parts: ["frame"], focus: ["frame"], tools: ["Hex keys", "Tape measure", "Square"] },
  2: { parts: ["belt", "frame"], focus: ["belt"], tools: ["Hex keys"] },
  3: { parts: ["motor", "belt"], focus: ["motor"], tools: ["Hex keys", "Grub-screw key"] },
  4: { parts: ["arch", "camera", "leds"], focus: ["arch", "camera"], tools: ["Hex keys", "Ruler (camera about 20 cm above the belt)"] },
  5: { parts: ["ir"], focus: ["ir"], tools: ["Small screwdriver (range adjust)"] },
  6: { parts: ["servoA", "servoB", "chutes"], focus: ["servoA", "servoB", "chutes"], tools: ["Screwdriver"] },
  7: { parts: ["cabinet", "psu", "estop"], focus: ["cabinet"], detail: "estop", tools: ["Drill and step bit", "Screwdriver", "Labels"] },
  8: { parts: ["pi", "pca", "driver", "mosfet", "buck"], focus: ["pi", "driver"], tools: ["Standoffs", "Multimeter (to set 5.1 V)"], seeThrough: ["cabinet"] },
  9: { parts: ["hmi"], focus: ["hmi"], tools: ["Hex keys"] },
  10: { parts: ["motor", "leds", "driver", "mosfet", "wires"], connections: ["c-m1", "c-m2", "c-ledp", "c-ledn"], focus: ["driver", "mosfet"], tools: ["Wire stripper", "Ferrule crimper", "Cable clips"], seeThrough: ["cabinet"] },
  11: { parts: ["pi", "pca", "ir", "camera", "hmi", "servoA", "servoB", "wires"], connections: PI_SIG, focus: ["pi", "pca"], tools: ["10 kΩ and 20 kΩ resistors"], seeThrough: ["cabinet"] },
  12: { parts: ["psu", "estop", "buck", "pi", "pca", "driver", "mosfet", "wires"], connections: ["c-jack", "c-e12d", "c-e12b", "c-e12m", "c-psug", "c-bgnd", "c-mpg", "c-pcavp", "c-pcavm", "c-pi5", "c-pig"], focus: ["psu", "estop", "buck"], detail: "estop", seeThrough: ["cabinet"], tools: ["Multimeter"] },
  13: { parts: [], track: true, tools: ["Keyboard or SSH access to the Pi", "Red, green and blue test items"] },
};

export const INSTALLED_AT: Record<VsPartId, number> = {
  frame: 1, belt: 2, motor: 3, arch: 4, camera: 4, leds: 4, ir: 5, servoA: 6, servoB: 6, chutes: 6,
  cabinet: 7, psu: 7, estop: 7, pi: 8, pca: 8, driver: 8, mosfet: 8, buck: 8, hmi: 9, wires: 10,
};

/* ---------- beginner guidance, every line traced back to the project data ---------- */

export const CONNECTION_LEVEL: Record<string, string> = Object.fromEntries([
  ...["c-in1", "c-in2", "c-mos"].map((id) => [id, "3.3 V logic signal from the Pi."]),
  ["c-ena", "3.3 V PWM signal from the Pi (the L298N reads it as HIGH)."],
  ["c-sda", "I²C data at 3.3 V."], ["c-scl", "I²C clock at 3.3 V."],
  ["c-irs", "5 V sensor output: divide it to 3.3 V before the Pi."],
  ["c-cam", "Camera ribbon (CSI)."], ["c-dsi", "Display ribbon (DSI)."],
  ...["c-sas", "c-sbs"].map((id) => [id, "Servo pulses from the PCA9685."]),
  ...CONNECTIONS.filter((x) => x.kind === "Power" && !["c-jack", "c-e12d", "c-e12b", "c-e12m", "c-ledp"].includes(x.id)).map((x) => [x.id, "5 V or 3.3 V supply. Polarity matters."]),
  ...CONNECTIONS.filter((x) => x.kind === "Ground").map((x) => [x.id, "0 V ground."]),
  ...["c-jack", "c-e12d", "c-e12b", "c-e12m", "c-ledp"].map((id) => [id, "12 V from the adapter. Polarity matters."]),
  ...["c-m1", "c-m2"].map((id) => [id, "Motor output from the driver. Swapping the pair reverses the belt."]),
]);

const g = (need: string, tip: string, tipSource: string) => ({ need, tip, tipSource });
export const PART_GUIDE: Record<VsPartId, { need: string; tip: string; tipSource: string }> = {
  frame: g("A stiff, square frame keeps the belt running straight.", "Fit spare T-nuts before closing each slot.", "Step 1 tip"),
  arch: g("It holds the camera and lights in a fixed spot over the belt.", "Camera about 20 cm above the belt.", "Step 4"),
  belt: g("It carries the items through the arch and past the pushers.", "Tension it just enough not to slip.", "Step 2 tip"),
  motor: g("It turns the drive roller at a steady speed.", "Line the shafts up before tightening the coupler.", "Step 3 tip"),
  camera: g("It photographs each item for the colour check.", "Calibrate under the station's own light.", "Step 13 tip"),
  leds: g("Even light keeps the colours true.", "Angle the bars inward to avoid shadows.", "Step 4 tip"),
  ir: g("It tells the Pi exactly when an item is under the camera.", "Set its range with the smallest, darkest item.", "Step 5 tip"),
  servoA: g("It sweeps red items into the red chute.", "Centre the servo before fitting the paddle.", "Step 6"),
  servoB: g("It sweeps green items into the green chute.", "Centre the servo before fitting the paddle.", "Step 6"),
  chutes: g("They guide pushed items into the right bin.", "Line each chute up exactly opposite its paddle.", "Step 6 tip"),
  cabinet: g("It keeps the electronics together, tidy and safe.", "Label every terminal as you fit it.", "Step 7 tip"),
  psu: g("It powers the station with no mains wiring inside the cabinet.", "Unplug the adapter while wiring.", "Step 12 tip"),
  estop: g("One slap stops the whole station.", "Test it with a multimeter before powering up.", "Step 12"),
  buck: g("It makes the 5 V for the Pi, the screen and the servos.", "Set 5.1 V before connecting anything.", "Step 8 tip"),
  pi: g("It runs the vision, the control and the touchscreen.", "Never put 5 V on a GPIO pin.", "Step 11 tip"),
  pca: g("It holds the pusher servos steady without jitter.", "Feed its V+ from the buck, not the Pi.", "FAQ"),
  driver: g("It switches 12 V to the conveyor motor.", "Remove the ENA cap so the Pi sets the speed.", "Pinout table"),
  mosfet: g("It lets the Pi switch the 12 V lights.", "It's a logic-level part, so 3.3 V turns it fully on.", "BOM"),
  hmi: g("It shows the camera view and the colour counts.", "Support the ribbon along its whole length.", "Step 9 tip"),
  wires: g("Jumpers carry the Pi's signals; ferruled wire goes in every screw terminal.", "No bare copper outside a terminal.", "Step 10 checkpoints"),
};

export const STEP_HELP: Record<number, KitStepHelp> = {
  1: { mistake: "Closing a slot before adding the T-nuts you'll need.", check: "Diagonals differ? Loosen the corner brackets and square the top.", source: "Step 1" },
  2: { mistake: "Over-tightening the belt.", check: "Belt drifts to one side? Adjust the idler's tension on that side.", source: "Step 2 checkpoints" },
  3: { mistake: "Misaligned motor and roller shafts.", check: "Belt pulses? Re-align the coupler.", source: "Step 3 tip" },
  4: { mistake: "Lights pointing straight down, causing glare.", check: "Shadows under the camera? Angle the LED bars inward.", source: "Step 4 checkpoints" },
  5: { mistake: "Range set so long it sees the far guard.", check: "Always on? Turn the range screw down.", source: "Step 5 checkpoints" },
  6: { mistake: "Fitting a paddle before centring its servo.", check: "Items miss the chute? Move the chute opposite its paddle.", source: "Step 6" },
  7: { mistake: "Mounting the E-stop where you have to reach over the belt.", check: "Door won't open fully? Move the cabinet clear of the frame.", source: "Step 7 checkpoints" },
  8: { mistake: "Connecting the Pi before setting the buck to 5.1 V.", safety: "Too much voltage destroys the Pi instantly.", check: "Ports blocked? Turn the Pi so they face the door.", source: "Step 8 tip" },
  9: { mistake: "Folding the display ribbon sharply.", check: "Black screen? Re-seat the ribbon at both ends.", source: "Step 9" },
  10: { mistake: "Bare copper outside a screw terminal.", safety: "Adapter unplugged while wiring.", check: "Belt runs backwards? Swap the motor's two wires.", source: "Step 10" },
  11: { mistake: "Wiring the item sensor straight to the Pi without the divider.", check: "Camera not found? Check the ribbon's direction.", source: "Step 11 checkpoints" },
  12: { mistake: "Skipping the common ground.", safety: "Adapter unplugged while wiring; test the E-stop before powering up.", check: "Pi reboots when a pusher moves? Feed the PCA9685 V+ from the buck.", source: "Step 12, FAQ" },
  13: { mistake: "Calibrating colours in daylight instead of under the station's lights.", safety: "General: keep fingers clear of the belt and pushers while it runs.", check: "Wrong bin? Tune COLOURS. Paddle misses? Tune PUSH_DELAY.", source: "Step 13, FAQ" },
};

export const TOOLS: string[] = Array.from(new Set(Object.values(STEP_VISUALS).flatMap((v) => v.tools ?? [])));
