/* Turns a project's pin table into what the 3D wiring station draws: which part each wire leaves from, and whether it
   lands on the controller (and on which of its pins) or on a power source. Read only from the project's own data. */

export interface WireSpec { from: string; to: string; color: string }

export interface WiringLayout {
  controller: string;
  parts: string[];                       // one block per part, in the order they first appear
  pins: string[];                        // the controller pins that are used, in order
  power: string | null;                  // a battery or supply, when a wire goes to one
  wires: { part: number; pin: number; power: boolean; color: string }[]; // pin is -1 for a power wire
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* the part a pin belongs to, e.g. "L298N IN3 (Right Forward)" → "L298N Driver" */
export function partOf(componentPin: string) {
  const s = componentPin.toLowerCase();
  let m: RegExpMatchArray | null;
  if (/tcrt|line sensor|\bir\b/.test(s)) return "IR Line Sensor";
  if ((m = s.match(/^(left|center|centre|right) sensor/))) return `${cap(m[1])} Sensor`;
  if (/hc-05|bluetooth/.test(s)) return "HC-05 Bluetooth";
  if (/receiver|elrs/.test(s)) return "ELRS Receiver";
  if (/\besc\b/.test(s)) return "4-in-1 ESC";
  if (/gps|neo-6m/.test(s)) return "NEO-6M GPS";
  if (/max485|rs485/.test(s)) return "MAX485";
  if (/esp32/.test(s)) return "ESP32-CAM";
  if (/pca9685/.test(s)) return "PCA9685 Servo Driver";
  if (/e18|proximity|item sensor/.test(s)) return "Item Sensor";
  if (/mosfet/.test(s)) return "LED MOSFET";
  if (/camera/.test(s)) return "Pi Camera";
  if (/display|hmi/.test(s)) return "Touch Display";
  if (/buck|lm2596/.test(s)) return "Buck Converter";
  if (/probe|actuator/.test(s)) return "Probe Servo";
  if (/li-po|lipo/.test(s)) return "Li-Po Battery";
  if (/l298/.test(s)) return "L298N Driver";
  if (/tb6612/.test(s)) return "TB6612 Driver";
  if (/mpu6050|\bimu\b/.test(s)) return "MPU6050 IMU";
  if (/motor driver/.test(s)) return "Motor Driver";
  if ((m = s.match(/^(base|shoulder|elbow|wrist|gripper) servo/))) return `${cap(m[1])} Servo`;
  if (/servo/.test(s)) return "Servo Power";
  if (/system ground|ground bus/.test(s)) return "Ground Bus";
  return componentPin.split(/\s+/).slice(0, 2).join(" ");
}

/* where a wire lands: the controller (most pins) or a power source */
function landing(targetPin: string): { power: string } | { pin: string } {
  const s = targetPin.toLowerCase().trim();
  // (a shared ground written as "GND + Battery (-)" is still the controller's GND pin)
  if (/^(arduino|mega|pi|fc|d\d|a\d|gnd|common|vin|5v|3\.3v)\b/.test(s))
    return { pin: targetPin.replace(/^(arduino( nano| uno| mega)?|mega|pi|fc)\s+/i, "").replace(/\s*\+.*$/, "") };
  if (/battery/.test(s)) return { power: "Battery" };
  if (/supply|external|adapter/.test(s)) return { power: /5\s?v/.test(s) ? "5V Supply" : "Power Supply" };
  return { pin: targetPin };
}

export function wiringLayout(controller: string, specs: WireSpec[]): WiringLayout {
  const parts: string[] = [], pins: string[] = [];
  let power: string | null = null;
  const wires = specs.map((w) => {
    const name = partOf(w.from);
    if (!parts.includes(name)) parts.push(name);
    const l = landing(w.to);
    if ("power" in l) {
      power ??= l.power;
      return { part: parts.indexOf(name), pin: -1, power: true, color: w.color };
    }
    if (!pins.includes(l.pin)) pins.push(l.pin);
    return { part: parts.indexOf(name), pin: pins.indexOf(l.pin), power: false, color: w.color };
  });
  return { controller: controller.replace(/\s*\(.*\)\s*$/, "").trim(), parts, pins, power, wires };
}
