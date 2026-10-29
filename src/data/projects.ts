export interface BomAlternative {
  name: string;
  whyItWorks: string;
  useCase?: string;
}

export interface BomItem {
  id: string;
  name: string;
  whatIsIt: string;
  whyUsed: string;
  qty: number;
  spec: string;
  category: "Electronics" | "Movement" | "Power" | "Structure";
  priceEst: string;
  inStock?: boolean;
  storesAvailable?: number;
  alternative?: BomAlternative | null;
}

export interface Project {
  slug: string;
  id?: string;
  name?: string;
  title: string;
  badge?: string;
  description: string;
  shortDescription?: string;
  overview?: string;
  whatYouLearn?: string[];
  howItWorks?: string;
  projectNote?: string;
  codeNote?: string;
  assemblyVideoUrl?: string;
  category: "Autonomous Rovers" | "Aerial Robotics" | "Competitive Bots" | "Maze Solvers" | "Robotic Arms" | "IoT & Sensors";
  level: "Beginner" | "Intermediate" | "Advanced";
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  timeEstimate: string;
  partsCount: number;
  microcontroller: string;
  sensors: string[];
  motorDriver: string;
  image: string;
  realImage?: string;
  wiringImage?: string;
  featured?: boolean;
  status?: "published" | "draft"; // drafts are hidden from search (and anything else that checks); default published
  keywords?: string[];            // optional extra search words: other names people use for this robot
  bom?: BomItem[];
  steps?: {
    stepNumber: number;
    title: string;
    stage: string;
    time: string;
    description: string;
    whatToDo: string;
    howToDo: string;
    whatYouSee: string;
    checkpoints: string[];
    commonProblems?: { problem: string; reason: string; solution: string }[];
    tip?: string;
  }[];
  pinout?: {
    componentPin: string;
    targetPin: string;
    wireColor: string;
    type: "Digital" | "Analog" | "PWM" | "Power" | "Ground";
    notes: string;
  }[];
  arduinoCode?: string;
  faqs?: {
    q: string;
    a: string;
  }[];
  tips?: string[];
}

export const PROJECTS: Project[] = [
  {
    slug: "line-follower",
    title: "Line Follower Bot",
    badge: "POPULAR",
    description: "A small robot that follows a black line on the floor by using light sensors to detect where the line is.",
    howItWorks: "Two light sensors point down at the floor. When a sensor sees the black tape, the controller steers the motors to keep the robot on the path.",
    category: "Autonomous Rovers",
    level: "Beginner",
    timeEstimate: "4 Hours",
    partsCount: 14,
    microcontroller: "Arduino Uno R3 (the small computer)",
    sensors: ["2x Infrared Line Sensors (eyes to see the line)"],
    motorDriver: "L298N Motor Driver (board that powers the motors)",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB-dsbpIl3vHK1m2TdFU3AmQ_-ipIDDvG-uprrkrcUGwodTgKRc57qyaXQ1-KhUmt6XXL5aAD55VXq7QIbjAo1G_sgwTHfph-mWGccOzKaHBhUercw3tuMi7HksIs8SNo2sXwCm3DV8jIAUDUilQPwxMKyAKWJq73TeFW2E55a4XujRwYjAdxPysIvFvSfKK6-ec81tWTs9EVo4N9Ap3NFcO8YVonMD-b4rYGK0PzvIakDJY6p8A3cm",
    realImage: "/robotics/line-follower-real.png",
    wiringImage: "/robotics/wiring/line-follower/line-follower-wirring.jpeg",
    featured: true,
    bom: [
      {
        id: "lf-mcu-01",
        name: "Arduino Uno R3",
        whatIsIt: "The small computer that controls the robot.",
        whyUsed: "It reads the light sensors on the floor and decides how fast each motor should spin to stay on the line.",
        qty: 1,
        spec: "5V microcontroller board with 14 digital pins, 6 PWM speed pins, and USB programming port.",
        category: "Electronics",
        priceEst: "₹480",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Arduino Nano",
          useCase: "Arduino Uno is unavailable or you want a more compact build.",
          whyItWorks: "It runs the exact same code and provides the exact same connection pins in a smaller board format."
        }
      },
      {
        id: "lf-sen-01",
        name: "TCRT5000 Dual IR Line Sensor Module",
        whatIsIt: "Infrared light sensors that act as the robot's eyes to see the floor line.",
        whyUsed: "It shines invisible infrared light on the floor and tells the Arduino whether it is over white floor or black tape.",
        qty: 1,
        spec: "Dual-channel reflectance sensors with onboard sensitivity tuning dials and indicator LEDs.",
        category: "Electronics",
        priceEst: "₹95",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "2x Single TCRT5000 IR Sensor Modules",
          useCase: "A dual-sensor combo board is out of stock.",
          whyItWorks: "Two single sensor modules mounted side-by-side perform the exact same left-right line detection."
        }
      },
      {
        id: "lf-drv-01",
        name: "L298N Dual Motor Driver Board",
        whatIsIt: "A high-power circuit board that lets the Arduino safely steer and power the motors.",
        whyUsed: "The Arduino pins only provide tiny signals; this board draws heavy power from the battery to spin the motors without damaging the controller.",
        qty: 1,
        spec: "Dual H-bridge motor driver handling up to 2A per channel with built-in 5V regulator and screw terminals.",
        category: "Electronics",
        priceEst: "₹175",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "TB6612FNG Motor Driver",
          useCase: "You want a smaller, more power-efficient driver that runs cooler.",
          whyItWorks: "It controls two DC motors using the same forward/reverse logic and handles identical motor voltages."
        }
      },
      {
        id: "lf-mot-01",
        name: "TT Geared DC Motors (Yellow, 1:48 Ratio)",
        whatIsIt: "Electric motors with internal plastic gears that turn the robot's wheels.",
        whyUsed: "They convert battery electricity into smooth rotational force to drive the left and right wheels.",
        qty: 2,
        spec: "3V–6V DC motors with 1:48 reduction gearbox running at approximately 200 RPM.",
        category: "Movement",
        priceEst: "₹130",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "N20 Micro Metal Gear Motors (6V)",
          useCase: "You are designing a miniature or custom lightweight chassis.",
          whyItWorks: "They provide similar low-speed, high-torque drive power in a compact metal gearbox."
        }
      },
      {
        id: "lf-whl-01",
        name: "65mm Rubber Grip Wheels",
        whatIsIt: "Durable plastic wheels with textured rubber tires that press onto the motor shafts.",
        whyUsed: "They grip the table or floor firmly so the robot drives straight and turns without slipping.",
        qty: 2,
        spec: "65mm diameter plastic rim with high-traction silicone tread and center flat D-slot.",
        category: "Movement",
        priceEst: "₹70",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "60mm Silicone Narrow Wheels",
          useCase: "65mm wheels are unavailable or you want a slightly lower center of gravity.",
          whyItWorks: "They press-fit onto the same TT motor shaft and provide excellent traction on smooth floors."
        }
      },
      {
        id: "lf-cst-01",
        name: "Front Steel Ball Caster Roller",
        whatIsIt: "A free-spinning metal ball in a small steel housing mounted under the front nose.",
        whyUsed: "It provides a low-friction third balance point so the robot glides effortlessly in any direction.",
        qty: 1,
        spec: "15mm smooth metal ball bearing with dual M3 screw mounting flange.",
        category: "Movement",
        priceEst: "₹45",
        inStock: true,
        storesAvailable: 3,
        alternative: {
          name: "Plastic Swivel Caster Wheel",
          useCase: "Metal ball casters are out of stock.",
          whyItWorks: "A pivoting miniature wheel also rolls in all directions and supports the front of the chassis."
        }
      },
      {
        id: "lf-pwr-01",
        name: "2x 18650 Battery Holder with On/Off Switch",
        whatIsIt: "A plastic battery cradle with pre-wired leads and an integrated power switch.",
        whyUsed: "It holds the two battery cells securely and allows you to safely turn the robot on and off without pulling wires.",
        qty: 1,
        spec: "Holds 2x 18650 lithium-ion cells in series (7.4V nominal) with built-in slide switch.",
        category: "Power",
        priceEst: "₹85",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "6x AA Battery Holder with Switch",
          useCase: "You do not have 18650 Li-ion cells or a dedicated Li-ion charger.",
          whyItWorks: "Provides ~7.2V to 9V using standard rechargeable or alkaline AA batteries."
        }
      },
      {
        id: "lf-bat-01",
        name: "18650 3.7V Rechargeable Li-ion Batteries",
        whatIsIt: "High-capacity rechargeable lithium-ion battery cells.",
        whyUsed: "They provide the continuous electrical energy required to run both the controller and the motors for hours.",
        qty: 2,
        spec: "3.7V nominal (4.2V fully charged), 2200–2600mAh capacity rechargeable cells.",
        category: "Power",
        priceEst: "₹240",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "2S 7.4V LiPo Battery Pack",
          useCase: "You already own RC hobby LiPo batteries and a balance charger.",
          whyItWorks: "Delivers the same 7.4V voltage range with high discharge capability."
        }
      },
      {
        id: "lf-chs-01",
        name: "Laser-Cut Acrylic 2WD Robot Chassis Plate",
        whatIsIt: "The clear plastic baseboard with pre-cut mounting holes and slots.",
        whyUsed: "It acts as the physical skeleton holding the motors, wheels, controller, and battery box together as one robot.",
        qty: 1,
        spec: "3mm thick transparent acrylic chassis plate with pre-cut slots for TT motors and standoffs.",
        category: "Structure",
        priceEst: "₹180",
        inStock: true,
        storesAvailable: 3,
        alternative: {
          name: "3D-Printed or Plywood Robot Baseplate",
          useCase: "You want to customize the body or fabricate your own chassis.",
          whyItWorks: "Any rigid 3mm plate with standard TT motor mounting holes can serve as the chassis."
        }
      },
      {
        id: "lf-wir-01",
        name: "DuPont Jumper Wires Pack (40 pcs)",
        whatIsIt: "Flexible colored wires with push-on pins and sockets on the ends.",
        whyUsed: "They make all the electrical connections between the Arduino, sensors, and motor driver without any soldering.",
        qty: 1,
        spec: "20cm multi-color ribbon with Male-to-Female and Male-to-Male connectors.",
        category: "Structure",
        priceEst: "₹80",
        inStock: true,
        storesAvailable: 4,
        alternative: null
      },
      {
        id: "lf-usb-01",
        name: "USB 2.0 Type-A to Type-B Cable",
        whatIsIt: "The standard blue cable used to connect the Arduino Uno to your computer.",
        whyUsed: "It transfers the line-following code from your computer into the Arduino and powers it during testing.",
        qty: 1,
        spec: "50cm standard USB 2.0 cable (Type-A to Type-B connector).",
        category: "Structure",
        priceEst: "₹65",
        inStock: true,
        storesAvailable: 4,
        alternative: null
      },
      {
        id: "lf-stf-01",
        name: "M3 Brass Standoffs & Screws Hardware Pack",
        whatIsIt: "A set of threaded brass spacers, M3 screws, and matching nuts.",
        whyUsed: "They elevate the circuit boards above the chassis plate to prevent short circuits and keep everything securely bolted down.",
        qty: 1,
        spec: "10mm M3 male-to-female brass standoffs, 6mm M3 machine screws, and nuts.",
        category: "Structure",
        priceEst: "₹60",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Nylon M3 Standoff Kit",
          useCase: "Brass standoffs are unavailable.",
          whyItWorks: "Nylon standoffs provide identical physical spacing and excellent electrical insulation."
        }
      }
    ],
    steps: [
      {
        stepNumber: 1,
        stage: "Step 1: Preparation",
        title: "Unpack Parts and Peel the Frame",
        time: "15 mins",
        description: "Get all your parts organized and prepare the robot frame.",
        whatToDo: "Unpack your robot kit and check that all parts are present on your table.",
        howToDo: "Peel the protective paper off both sides of the clear acrylic chassis plate.",
        whatYouSee: "A clean, transparent plastic plate with pre-cut screw holes ready for mounting.",
        checkpoints: [
          "Check that you have the acrylic plate, 2 motors, 2 wheels, and front caster",
          "Remove protective paper cleanly without scratching the plastic"
        ],
        tip: "Work on a clean table so small screws and nuts do not roll away."
      },
      {
        stepNumber: 2,
        stage: "Step 2: Battery Check",
        title: "Check Your Battery Power",
        time: "10 mins",
        description: "Make sure your batteries are charged before building.",
        whatToDo: "Check that your two rechargeable batteries have full power.",
        howToDo: "Place your two 18650 batteries into a charger or test them with a meter. Each battery should read around 3.7 to 4.2 volts.",
        whatYouSee: "Batteries are fully charged and ready to power your robot.",
        checkpoints: [
          "Check that total battery voltage is 7.4 volts or higher",
          "Inspect battery wraps for any tears or damage"
        ],
        tip: "Always turn off the battery box switch before connecting or removing wires."
      },
      {
        stepNumber: 3,
        stage: "Step 3: Motors",
        title: "Attach the Motors to the Frame",
        time: "25 mins",
        description: "Mount the two yellow gear motors to the bottom of the robot chassis.",
        whatToDo: "Fasten both drive motors to the underside of the plastic plate.",
        howToDo: "Use the long screws and small clear brackets to secure one motor on the left side and one on the right side.",
        whatYouSee: "Both motors are firmly screwed in place with their white plastic shafts pointing outward.",
        checkpoints: [
          "Make sure motor shafts turn freely and do not rub against the plastic plate",
          "Tighten the screws gently so the plastic bracket does not crack"
        ],
        tip: "Position the motor wires facing toward the inside of the frame for neat wiring."
      },
      {
        stepNumber: 4,
        stage: "Step 4: Wheels",
        title: "Attach the Roller and Wheels",
        time: "15 mins",
        description: "Add the front support roller and both driving wheels.",
        whatToDo: "Attach the front metal ball roller and push the rubber wheels onto the motors.",
        howToDo: "Screw the small metal caster wheel into the front hole, then press-fit each rubber wheel onto the flat-sided motor shafts.",
        whatYouSee: "The robot rests level on three contact points: two rubber wheels and one front caster.",
        checkpoints: [
          "Roll the robot by hand on the table to confirm all wheels spin smoothly",
          "Ensure the rubber tires are seated squarely on the plastic rims"
        ],
        tip: "Push wheels on gently so you do not bend the motor shafts."
      },
      {
        stepNumber: 5,
        stage: "Step 5: Sensors",
        title: "Mount the Line Sensors at the Front",
        time: "20 mins",
        description: "Install the infrared light sensors that let the robot see the floor.",
        whatToDo: "Fasten the sensor module to the front nose of the robot.",
        howToDo: "Use small screws or standoffs to mount the sensor board with its two optical eyes pointing straight down at the ground.",
        whatYouSee: "The sensor eyes hover about 6mm to 8mm above the table surface.",
        checkpoints: [
          "Measure clearance from sensor to table: 6mm to 8mm is ideal",
          "Ensure the sensor board is level and does not scrape the floor"
        ],
        tip: "If the sensors are too high, they cannot see the line. If too low, they will catch on bumps."
      },
      {
        stepNumber: 6,
        stage: "Step 6: Board Mounting",
        title: "Mount the Controller and Motor Driver",
        time: "20 mins",
        description: "Attach the two main electronic boards onto the top of the chassis.",
        whatToDo: "Secure the Arduino controller and the L298N motor driver to the top plate.",
        howToDo: "Mount the Arduino in the middle of the plate and the motor driver toward the back using small screws.",
        whatYouSee: "Both boards are firmly held on top of the robot and do not touch each other.",
        checkpoints: [
          "Check that the Arduino USB port points outward for easy computer connection",
          "Ensure the motor driver screw terminals are easy to reach with a screwdriver"
        ],
        tip: "Keep small gaps between boards so metal parts do not accidentally touch."
      },
      {
        stepNumber: 7,
        stage: "Step 7: Motor Wiring",
        title: "Connect Motors to the Motor Driver",
        time: "20 mins",
        description: "Wire the motors to the green screw terminals on the motor driver board.",
        whatToDo: "Connect the two wires from each motor into the motor driver terminals.",
        howToDo: "Loosen the green screw terminals. Insert the left motor wires into OUT1 and OUT2, and right motor wires into OUT3 and OUT4. Tighten the screws.",
        whatYouSee: "Motor wires are securely clamped into the terminals and do not pull loose.",
        checkpoints: [
          "Gently tug each wire to make sure it is held tight by the screw",
          "Make sure no bare copper strands touch adjacent terminals"
        ],
        tip: "Do not worry about motor direction yet. If a motor runs backward later, you simply swap its two wires."
      },
      {
        stepNumber: 8,
        stage: "Step 8: Driver Signal Wires",
        title: "Connect the Motor Driver to the Arduino",
        time: "20 mins",
        description: "Connect signal wires so the Arduino can tell the motor driver how to move.",
        whatToDo: "Plug 6 jumper wires between the motor driver pins and the Arduino pins.",
        howToDo: "Connect driver pins IN1, IN2, IN3, IN4 to Arduino pins D7, D8, D9, D10. Connect speed pins ENA and ENB to Arduino pins D5 and D6.",
        whatYouSee: "6 neat jumper wires connecting the motor driver to the Arduino pins.",
        checkpoints: [
          "Double-check pin numbers against the pinout table",
          "Use different color wires to make each pin easy to trace"
        ],
        tip: "If your driver board has small black plastic jumpers on ENA and ENB, remove them so speed control works."
      },
      {
        stepNumber: 9,
        stage: "Step 9: Sensor Wiring",
        title: "Connect the Line Sensors to the Arduino",
        time: "15 mins",
        description: "Wire the front sensors so the Arduino receives their signals.",
        whatToDo: "Connect the sensor power and signal wires to the Arduino.",
        howToDo: "Connect Left Sensor OUT to pin D2, Right Sensor OUT to pin D4, sensor VCC to Arduino 5V, and sensor GND to Arduino GND.",
        whatYouSee: "The front sensor board is fully wired to the Arduino power and digital pins.",
        checkpoints: [
          "Confirm Left OUT connects to D2 and Right OUT connects to D4",
          "Confirm VCC connects to 5V (power) and GND connects to GND (ground)"
        ],
        tip: "Pin D2 and Pin D4 are the two reading pins the computer uses to see the line."
      },
      {
        stepNumber: 10,
        stage: "Step 10: Ground Wire",
        title: "Connect the Shared Ground Wire",
        time: "10 mins",
        description: "Connect the ground wire so both boards share the same power reference.",
        whatToDo: "Tie the Arduino ground and the motor driver ground together.",
        howToDo: "Run a black jumper wire from the motor driver GND screw terminal into an Arduino GND pin.",
        whatYouSee: "A black wire bridges the motor driver GND to the Arduino GND header.",
        checkpoints: [
          "Confirm this wire is firmly screwed in with the battery negative wire",
          "This shared connection is mandatory for the robot to work"
        ],
        tip: "Without a shared ground wire, the signals float and the motors will twitch randomly."
      },
      {
        stepNumber: 11,
        stage: "Step 11: Battery Connection",
        title: "Connect the Battery Pack",
        time: "15 mins",
        description: "Connect the battery box to power the motor driver board.",
        whatToDo: "Wire the battery box to the motor driver power terminals.",
        howToDo: "Make sure the battery switch is OFF. Connect the red wire (+) to the driver +12V terminal, and the black wire (-) to the driver GND terminal.",
        whatYouSee: "The power LED on the driver lights up when you slide the battery switch ON.",
        checkpoints: [
          "Always double-check: Red wire into (+), Black wire into (-)",
          "Never let red and black battery wires touch each other"
        ],
        tip: "Check the wire colors twice before turning on the switch. Connecting backward can damage the board."
      },
      {
        stepNumber: 12,
        stage: "Step 12: Upload Code",
        title: "Upload the Program to the Controller",
        time: "20 mins",
        description: "Send the line-following program from your computer into the Arduino.",
        whatToDo: "Upload the provided code using the free Arduino program on your computer.",
        howToDo: "Plug a USB cable from your computer into the Arduino. Open the Arduino app, paste our line-following code, choose 'Arduino Uno', and click Upload.",
        whatYouSee: "Small lights on the Arduino blink rapidly for a few seconds, then the screen says 'Done Uploading'.",
        checkpoints: [
          "Keep the battery switch OFF while uploading code over USB",
          "Look for the green 'Done uploading' message at the bottom of the Arduino app"
        ],
        tip: "If the upload gives an error, make sure you selected the correct COM port under Tools > Port."
      },
      {
        stepNumber: 13,
        stage: "Step 13: Adjust Sensors",
        title: "Set Up the Sensor Sensitivity",
        time: "15 mins",
        description: "Tune the small dials on the sensor board so it reliably sees the line.",
        whatToDo: "Adjust the small dials until the sensor indicator lights turn on over white and off over black.",
        howToDo: "Turn on the robot. Place one sensor over white paper and one over black tape. Use a tiny screwdriver to turn the small dial until the light switches cleanly.",
        whatYouSee: "The sensor indicator light turns ON over white paper and turns OFF over black tape.",
        checkpoints: [
          "Test both left and right sensors over black tape",
          "Ensure both sensors switch reliably when passing over the tape border"
        ],
        tip: "A small quarter-turn of the dial is usually enough to dial in the right sensitivity."
      },
      {
        stepNumber: 14,
        stage: "Step 14: Track Test",
        title: "Test the Robot on the Track",
        time: "20 mins",
        description: "Place your robot on a track and watch it follow the line autonomously.",
        whatToDo: "Test your robot on an oval track made with black tape.",
        howToDo: "Make an oval track on white cardboard using 1-inch black electrical tape. Place the robot over the line and turn the battery switch ON.",
        whatYouSee: "The robot rolls forward, detects the line with its sensors, and steers itself around the track.",
        checkpoints: [
          "If the robot spins in a circle, swap the two wires on one motor terminal",
          "If the robot moves backward, swap the wires on both motor terminals"
        ],
        tip: "Congratulations! You have just built and programmed your very first autonomous robot!"
      }
    ],
    pinout: [
      { componentPin: "TCRT5000 Left OUT", targetPin: "Arduino D2", wireColor: "Yellow", type: "Digital", notes: "Sends a signal to the controller when the left sensor detects the black line" },
      { componentPin: "TCRT5000 Right OUT", targetPin: "Arduino D4", wireColor: "Green", type: "Digital", notes: "Sends a signal to the controller when the right sensor detects the black line" },
      { componentPin: "TCRT5000 VCC", targetPin: "Arduino 5V", wireColor: "Red", type: "Power", notes: "Supplies 5-volt electrical power to light up the sensors" },
      { componentPin: "TCRT5000 GND", targetPin: "Arduino GND", wireColor: "Black", type: "Ground", notes: "Shared electrical ground connection for the sensors" },
      { componentPin: "L298N IN1", targetPin: "Arduino D7", wireColor: "Blue", type: "Digital", notes: "Tells the left motor to spin forward" },
      { componentPin: "L298N IN2", targetPin: "Arduino D8", wireColor: "Purple", type: "Digital", notes: "Tells the left motor to spin backward" },
      { componentPin: "L298N IN3", targetPin: "Arduino D9", wireColor: "Orange", type: "Digital", notes: "Tells the right motor to spin forward" },
      { componentPin: "L298N IN4", targetPin: "Arduino D10", wireColor: "Brown", type: "Digital", notes: "Tells the right motor to spin backward" },
      { componentPin: "L298N ENA (Left Speed)", targetPin: "Arduino D5 (PWM)", wireColor: "White", type: "PWM", notes: "Controls the left motor speed (from 0 stopped to 255 full speed)" },
      { componentPin: "L298N ENB (Right Speed)", targetPin: "Arduino D6 (PWM)", wireColor: "Gray", type: "PWM", notes: "Controls the right motor speed (from 0 stopped to 255 full speed)" },
      { componentPin: "L298N 12V In", targetPin: "Battery Positive (+)", wireColor: "Red", type: "Power", notes: "Connects to the red (+) battery wire to give strong power to the motors" },
      { componentPin: "L298N GND", targetPin: "Arduino GND + Battery (-)", wireColor: "Black", type: "Ground", notes: "Shared ground wire connecting battery, motor driver, and Arduino together" }
    ],
    arduinoCode: `// =================================================================
// RoboNest Beginner Kit - LineFollower.ino
// Controller: Arduino Uno (ATmega328P)
// What this program does:
// 1. Reads the left and right light sensors.
// 2. If both sensors see white, drives straight forward.
// 3. If the left sensor sees black, steers left back to the line.
// 4. If the right sensor sees black, steers right back to the line.
// =================================================================

// --- Pin Connections ---
#define LEFT_SENSOR_PIN   2   // Left sensor signal pin
#define RIGHT_SENSOR_PIN  4   // Right sensor signal pin

// Motor direction pins
#define MOTOR_L_IN1       7   // Left motor forward
#define MOTOR_L_IN2       8   // Left motor backward
#define MOTOR_R_IN3       9   // Right motor forward
#define MOTOR_R_IN4       10  // Right motor backward

// Motor speed pins (0 = stopped, 255 = full speed)
#define MOTOR_L_PWM       5   // Left motor speed
#define MOTOR_R_PWM       6   // Right motor speed

// --- Motor Speeds ---
const int NORMAL_SPEED = 150; // Normal driving speed
const int TURN_SPEED   = 180; // Speed when steering around a curve
const int SLOW_SPEED   = 100; // Slow speed for smooth pivoting

// 1 means the sensor sees the black tape
#define BLACK_LINE 1

void setup() {
  // Start serial communication so you can read values on your computer
  Serial.begin(9600);
  Serial.println("RoboNest Line Follower Ready!");

  // Set sensor pins as inputs (the Arduino listens to them)
  pinMode(LEFT_SENSOR_PIN, INPUT);
  pinMode(RIGHT_SENSOR_PIN, INPUT);

  // Set motor pins as outputs (the Arduino sends commands to them)
  pinMode(MOTOR_L_IN1, OUTPUT);
  pinMode(MOTOR_L_IN2, OUTPUT);
  pinMode(MOTOR_R_IN3, OUTPUT);
  pinMode(MOTOR_R_IN4, OUTPUT);
  pinMode(MOTOR_L_PWM, OUTPUT);
  pinMode(MOTOR_R_PWM, OUTPUT);

  // Stop motors for 1 second before starting
  stopMotors();
  delay(1000);
}

void loop() {
  // Read what both sensors see (0 for white floor, 1 for black tape)
  int leftSeeLine  = digitalRead(LEFT_SENSOR_PIN);
  int rightSeeLine = digitalRead(RIGHT_SENSOR_PIN);

  // Case 1: Both sensors see white floor -> Robot is centered, go straight!
  if (leftSeeLine != BLACK_LINE && rightSeeLine != BLACK_LINE) {
    goStraight(NORMAL_SPEED);
  }
  // Case 2: Left sensor sees black tape -> Robot drifted right, turn left!
  else if (leftSeeLine == BLACK_LINE && rightSeeLine != BLACK_LINE) {
    turnLeft(TURN_SPEED);
  }
  // Case 3: Right sensor sees black tape -> Robot drifted left, turn right!
  else if (leftSeeLine != BLACK_LINE && rightSeeLine == BLACK_LINE) {
    turnRight(TURN_SPEED);
  }
  // Case 4: Both sensors see black tape -> Stop or creep forward
  else {
    goStraight(SLOW_SPEED);
  }

  delay(5); // Tiny pause to keep movement smooth
}

// --- Movement Helper Functions ---

void goStraight(int speed) {
  // Left motor forward
  digitalWrite(MOTOR_L_IN1, HIGH);
  digitalWrite(MOTOR_L_IN2, LOW);
  analogWrite(MOTOR_L_PWM, speed);

  // Right motor forward
  digitalWrite(MOTOR_R_IN3, HIGH);
  digitalWrite(MOTOR_R_IN4, LOW);
  analogWrite(MOTOR_R_PWM, speed);
}

void turnLeft(int speed) {
  // Slow down or reverse left wheel, drive right wheel forward
  digitalWrite(MOTOR_L_IN1, LOW);
  digitalWrite(MOTOR_L_IN2, HIGH);
  analogWrite(MOTOR_L_PWM, SLOW_SPEED);

  digitalWrite(MOTOR_R_IN3, HIGH);
  digitalWrite(MOTOR_R_IN4, LOW);
  analogWrite(MOTOR_R_PWM, speed);
}

void turnRight(int speed) {
  // Drive left wheel forward, slow down or reverse right wheel
  digitalWrite(MOTOR_L_IN1, HIGH);
  digitalWrite(MOTOR_L_IN2, LOW);
  analogWrite(MOTOR_L_PWM, speed);

  digitalWrite(MOTOR_R_IN3, LOW);
  digitalWrite(MOTOR_R_IN4, HIGH);
  analogWrite(MOTOR_R_PWM, SLOW_SPEED);
}

void stopMotors() {
  digitalWrite(MOTOR_L_IN1, LOW);
  digitalWrite(MOTOR_L_IN2, LOW);
  digitalWrite(MOTOR_R_IN3, LOW);
  digitalWrite(MOTOR_R_IN4, LOW);
  analogWrite(MOTOR_L_PWM, 0);
  analogWrite(MOTOR_R_PWM, 0);
}`,
    faqs: [
      {
        q: "Why does my robot spin in circles when turned on?",
        a: "One motor is connected backward. Turn the battery switch off, swap the two wires for that motor on the green terminal, and turn the power back on."
      },
      {
        q: "Can I use a regular 9V rectangular battery?",
        a: "No. Standard rectangular 9V alkaline batteries cannot provide enough power for electric motors. The Arduino will restart repeatedly. Use two rechargeable 18650 batteries (7.4V) instead."
      },
      {
        q: "What kind of black tape should I use for the track?",
        a: "Use standard 1-inch black electrical tape on white cardboard or poster board. Avoid shiny or glossy tape because bright room lights can bounce off it and confuse the sensors."
      },
      {
        q: "What should I do if the robot drives off the line?",
        a: "Check that both sensor lights switch on over white paper and turn off over black tape. If needed, turn the tiny blue dial on the sensor board with a small screwdriver until it switches reliably."
      }
    ]
  },
  {
    slug: "drone-explorer",
    id: "drone-explorer-quad",
    name: "Drone Explorer Quad",
    title: "Drone Explorer Quad",
    badge: "AERIAL",
    difficulty: "Advanced",
    level: "Advanced",
    shortDescription: "Build a four-motor quadcopter and learn how a dedicated flight controller keeps it balanced in the air.",
    description: "Build a four-motor quadcopter and learn how a dedicated flight controller keeps it balanced in the air.",
    overview: "A quadcopter uses four motors and propellers to create lift. A dedicated flight controller reads onboard motion sensors and adjusts the 4-in-1 ESC to keep the drone balanced in flight.",
    whatYouLearn: [
      "How four motors work together to lift a drone",
      "How a dedicated flight controller reads onboard motion sensors",
      "How a 4-in-1 ESC controls brushless motors with digital signals",
      "How an ExpressLRS radio receiver sends control commands",
      "How to safely configure and test a quadcopter"
    ],
    howItWorks: "The LiPo battery powers the 4-in-1 ESC, which powers and drives the four brushless motors. The SpeedyBee F405 Mini flight controller reads the drone's movement using its onboard IMU and adjusts the motors to keep it stable. The ELRS receiver sends the pilot's control commands to the flight controller.",
    assemblyVideoUrl: "https://drive.google.com/file/d/15EnGs5ztdKtCCkWHhqKYVuauW4OOjH7Q/view?usp=drive_link",
    projectNote: "This RoboNest version is an educational quadcopter project built around a dedicated SpeedyBee F405 Mini flight controller and 4-in-1 ESC architecture.",
    codeNote: "This configuration script shows how the SpeedyBee F405 Mini flight controller is set up in Betaflight. Unlike basic microcontrollers that require manual PID loops from scratch, a dedicated flight controller runs real-time flight firmware with onboard IMU filtering, DShot motor communication, and ExpressLRS receiver decoding.",
    category: "Aerial Robotics",
    timeEstimate: "12 Hours",
    partsCount: 11,
    microcontroller: "SpeedyBee F405 Mini Flight Controller",
    sensors: ["Onboard IMU (gyroscope & accelerometer built into the flight controller)"],
    motorDriver: "4-in-1 ESC (Electronic Speed Controller)",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuACvib0IiU4lkkWuiY0QGTAsDm97-eQxEXzMd_l-rTise40zUQ5rQ3RQdFnDluJDecGCXaB8jJgneg0AqVMiCEGr47gILpyzGmdJP3BQx9Um2ZXrvUVRDEIgH4Mcu7D0kF0YkGtgt9yqwMBfkQyQxF5HukDoqYs0ou_pBYR78B0Yj7I0n_TBoPCNMS-hT9ppZQpr44Hg8Vqb6Syes-FRZsFgREbSnrHFZyjsFHFatu5vg_HCk01zHHN",
    realImage: "/robotics/drone-real.jpeg",
    wiringImage: "/robotics/wiring/drone-explorer/drone-wiring.jpeg",
    featured: true,
    bom: [
      {
        id: "dr-fc-01",
        name: "SpeedyBee F405 Mini Flight Controller",
        whatIsIt: "A small computer made specifically for controlling drones.",
        whyUsed: "It reads the drone's movement and controls the motors to help keep the drone stable.",
        qty: 1,
        spec: "F405-based flight controller with onboard IMU and dedicated motor/receiver connections.",
        category: "Electronics",
        priceEst: "₹3,400",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Compatible F405-based flight controller",
          useCase: "Another F405-based flight controller can be used if it provides the required motor, receiver and sensor connections.",
          whyItWorks: "Another F405-based flight controller can be used if it provides the required motor, receiver and sensor connections."
        }
      },
      {
        id: "dr-esc-01",
        name: "4-in-1 ESC",
        whatIsIt: "A board that controls all four brushless motors.",
        whyUsed: "It receives commands from the flight controller and controls how fast each motor spins.",
        qty: 1,
        spec: "4-in-1 ESC rated to match the selected brushless motors and battery voltage.",
        category: "Electronics",
        priceEst: "₹2,600",
        inStock: true,
        storesAvailable: 3,
        alternative: {
          name: "Four individual ESCs",
          useCase: "Four separate ESCs can perform the same job, with one ESC controlling each motor.",
          whyItWorks: "Four separate ESCs can perform the same job, with one ESC controlling each motor."
        }
      },
      {
        id: "dr-mot-01",
        name: "Brushless Motor",
        whatIsIt: "A fast, efficient motor used to spin the drone's propellers.",
        whyUsed: "The four motors create the lift and movement needed to fly the quadcopter.",
        qty: 4,
        spec: "Brushless quadcopter motors matched to the frame, ESC, and battery.",
        category: "Movement",
        priceEst: "₹1,800",
        inStock: true,
        storesAvailable: 3,
        alternative: {
          name: "Compatible brushless quadcopter motors",
          useCase: "Another set of motors can be used if their KV rating, voltage, current and size match the ESC, battery and propellers.",
          whyItWorks: "Another set of motors can be used if their KV rating, voltage, current and size match the ESC, battery and propellers."
        }
      },
      {
        id: "dr-prp-01",
        name: "Propeller",
        whatIsIt: "A spinning blade that pushes air downward.",
        whyUsed: "The propellers create the lift that allows the drone to fly.",
        qty: 4,
        spec: "Matched propeller set including clockwise (CW) and counter-clockwise (CCW) blades.",
        category: "Movement",
        priceEst: "₹220",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Compatible propeller set",
          useCase: "Another correctly sized propeller set can be used when it matches the motors and frame. Note: The drone needs the correct clockwise and counter-clockwise propellers.",
          whyItWorks: "Another correctly sized propeller set can be used when it matches the motors and frame. Note: The drone needs the correct clockwise and counter-clockwise propellers."
        }
      },
      {
        id: "dr-frm-01",
        name: "Quadcopter Frame",
        whatIsIt: "The main body that holds the motors and electronics.",
        whyUsed: "It keeps all the drone parts together and positions the four motors correctly.",
        qty: 1,
        spec: "Quadcopter frame compatible with selected motors, ESC, and flight controller.",
        category: "Structure",
        priceEst: "₹950",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Compatible quadcopter frame",
          useCase: "Another frame can be used if it supports the selected motors, ESC and flight controller.",
          whyItWorks: "Another frame can be used if it supports the selected motors, ESC and flight controller."
        }
      },
      {
        id: "dr-bat-01",
        name: "LiPo Battery",
        whatIsIt: "A rechargeable battery designed to provide high power for the drone.",
        whyUsed: "It provides the energy needed by the motors and electronics.",
        qty: 1,
        spec: "High-discharge LiPo battery matching motor and ESC cell count and current requirements.",
        category: "Power",
        priceEst: "₹1,450",
        inStock: true,
        storesAvailable: 3,
        alternative: {
          name: "Compatible LiPo battery",
          useCase: "Another LiPo can be used if its cell count, voltage, current capability and connector match the drone.",
          whyItWorks: "Another LiPo can be used if its cell count, voltage, current capability and connector match the drone."
        }
      },
      {
        id: "dr-rx-01",
        name: "ELRS Radio Receiver",
        whatIsIt: "A small wireless receiver that receives commands from the pilot's radio controller.",
        whyUsed: "It sends the pilot's commands to the flight controller.",
        qty: 1,
        spec: "ExpressLRS (ELRS) 2.4GHz serial radio receiver.",
        category: "Electronics",
        priceEst: "₹1,200",
        inStock: true,
        storesAvailable: 3,
        alternative: {
          name: "Compatible radio receiver supported by the selected flight controller",
          useCase: "Another compatible receiver can provide the same control link.",
          whyItWorks: "Another compatible receiver can provide the same control link."
        }
      },
      {
        id: "dr-tx-01",
        name: "ELRS Radio Transmitter",
        whatIsIt: "The handheld controller used by the pilot.",
        whyUsed: "It sends commands such as throttle, turning and movement to the drone.",
        qty: 1,
        spec: "2.4GHz ExpressLRS compatible radio transmitter.",
        category: "Electronics",
        priceEst: "₹3,800",
        inStock: true,
        storesAvailable: 2,
        alternative: {
          name: "Compatible transmitter and receiver system",
          useCase: "Another matched radio system can perform the same control function.",
          whyItWorks: "Another matched radio system can perform the same control function."
        }
      },
      {
        id: "dr-con-01",
        name: "Battery Connector / Power Lead",
        whatIsIt: "The connector that connects the battery to the drone's power system.",
        whyUsed: "It safely transfers power from the battery to the ESC and electronics.",
        qty: 1,
        spec: "XT30 or XT60 high-current connector lead with low-ESR capacitor.",
        category: "Power",
        priceEst: "₹90",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Matching high-current connector",
          useCase: "Another correctly rated connector can be used if it matches the battery and power system.",
          whyItWorks: "Another correctly rated connector can be used if it matches the battery and power system."
        }
      },
      {
        id: "dr-hrd-01",
        name: "Mounting Hardware",
        whatIsIt: "Screws, nuts, spacers and other small parts used to attach the electronics and motors.",
        whyUsed: "These parts keep the drone components securely attached to the frame.",
        qty: 1,
        spec: "M2/M3 mounting hardware set with anti-vibration silicone grommets.",
        category: "Structure",
        priceEst: "₹110",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Compatible mounting hardware",
          useCase: "Equivalent hardware can be used if the size and thread match.",
          whyItWorks: "Equivalent hardware can be used if the size and thread match."
        }
      },
      {
        id: "dr-wir-01",
        name: "Wiring / Silicone Wire",
        whatIsIt: "Wires used to connect the battery, ESC, flight controller and receiver.",
        whyUsed: "They carry power and control signals between the drone's components.",
        qty: 1,
        spec: "Heat-resistant flexible silicone wire set and ESC-to-FC connector harness.",
        category: "Structure",
        priceEst: "₹120",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Suitable hook-up wire",
          useCase: "Properly rated wire can perform the same electrical connections.",
          whyItWorks: "Properly rated wire can perform the same electrical connections."
        }
      }
    ],
    pinout: [
      { componentPin: "4-in-1 ESC Motor 1 Signal (M1)", targetPin: "FC Motor Pad S1", wireColor: "White", type: "PWM", notes: "Sends DShot digital speed signal to motor 1 (front right)." },
      { componentPin: "4-in-1 ESC Motor 2 Signal (M2)", targetPin: "FC Motor Pad S2", wireColor: "White", type: "PWM", notes: "Sends DShot digital speed signal to motor 2 (rear right)." },
      { componentPin: "4-in-1 ESC Motor 3 Signal (M3)", targetPin: "FC Motor Pad S3", wireColor: "White", type: "PWM", notes: "Sends DShot digital speed signal to motor 3 (rear left)." },
      { componentPin: "4-in-1 ESC Motor 4 Signal (M4)", targetPin: "FC Motor Pad S4", wireColor: "White", type: "PWM", notes: "Sends DShot digital speed signal to motor 4 (front left)." },
      { componentPin: "ELRS Receiver TX", targetPin: "FC UART RX (RX1)", wireColor: "Yellow", type: "Digital", notes: "Carries high-speed serial control commands from the radio link (CRSF protocol)." },
      { componentPin: "ELRS Receiver RX", targetPin: "FC UART TX (TX1)", wireColor: "Blue", type: "Digital", notes: "Carries telemetry and link-quality feedback back to the transmitter." },
      { componentPin: "ELRS Receiver 5V", targetPin: "FC 5V Regulated", wireColor: "Red", type: "Power", notes: "Provides clean 5V power to the radio receiver." },
      { componentPin: "ELRS Receiver GND", targetPin: "FC GND", wireColor: "Black", type: "Ground", notes: "Common ground reference between receiver and flight controller." },
      { componentPin: "ESC Battery Voltage (VBAT)", targetPin: "FC VBAT Pad", wireColor: "Red", type: "Power", notes: "Feeds battery voltage to the flight controller for onboard OSD and low-voltage alarms." }
    ],
    steps: [
      {
        stepNumber: 1,
        stage: "Step 1: Frame",
        title: "Build the Frame",
        time: "20 mins",
        description: "Assemble the carbon fiber frame and motor arms.",
        whatToDo: "Assemble the quadcopter frame together.",
        howToDo: "Use the supplied M3 screws and tighten them evenly to ensure arms are locked firmly.",
        whatYouSee: "The frame should feel rigid, balanced, and completely wobble-free.",
        checkpoints: ["The frame should feel rigid and should not wobble."],
        commonProblems: [
          {
            problem: "One of the frame arms feels slightly loose even after tightening the screws.",
            reason: "The screw holes in carbon fiber can strip or the screws may not be the right length, preventing a firm grip.",
            solution: "Remove the screw, check it is the correct length from the frame kit bag, and retighten slowly and evenly. Do not overtighten — just snug."
          },
          {
            problem: "The frame feels uneven or tilted when placed on a flat surface.",
            reason: "One or more arms may not be fully seated in the center plate slots before the screws were tightened.",
            solution: "Loosen all screws slightly, press all arms firmly down into their slots, then retighten evenly starting from opposite corners."
          }
        ],
        tip: "Thread-lock motor screws so vibrations cannot loosen them during flight."
      },
      {
        stepNumber: 2,
        stage: "Step 2: Motors",
        title: "Attach the Brushless Motors",
        time: "25 mins",
        description: "Mount the four brushless motors to the arm ends.",
        whatToDo: "Attach one motor to each arm of the frame.",
        howToDo: "Fasten each motor using the correct length mounting screws so they do not press into the internal motor windings.",
        whatYouSee: "All four motors are firmly attached and their shafts spin freely by hand.",
        checkpoints: ["All four motors should be firmly attached."],
        commonProblems: [
          {
            problem: "The motor shaft does not spin freely by hand after mounting.",
            reason: "The mounting screws are too long and are pressing into the motor coils inside, creating friction or a jam.",
            solution: "Remove the screws and use the shorter screws from your motor kit. The correct screw tip should not protrude past the motor base plate."
          },
          {
            problem: "The motor wobbles slightly even after tightening all four screws.",
            reason: "Carbon fiber arm surfaces can have slight irregularities that prevent full contact with the motor base.",
            solution: "Tighten the four screws in a diagonal pattern — tighten one, skip to the opposite, then the next — so the motor seats evenly."
          }
        ],
        tip: "Make sure motor screws are not too long to avoid touching the motor copper windings."
      },
      {
        stepNumber: 3,
        stage: "Step 3: 4-in-1 ESC",
        title: "Mount the 4-in-1 ESC",
        time: "20 mins",
        description: "Install the 4-in-1 ESC into the center stack.",
        whatToDo: "Place the 4-in-1 ESC in the center of the frame.",
        howToDo: "Mount it onto the center frame bolts with rubber anti-vibration grommets, motor solder pads facing outward toward the arms.",
        whatYouSee: "The ESC sits flat, securely isolated from the conductive carbon frame.",
        checkpoints: ["The ESC should not move around or contact carbon fiber directly."],
        commonProblems: [
          {
            problem: "The ESC slides or rocks even after being mounted.",
            reason: "The rubber anti-vibration grommets need to be pressed fully into the frame holes before the bolts are inserted.",
            solution: "Remove the ESC, press the grommets fully into the frame standoff holes until they sit flush, then remount the ESC through the grommets."
          },
          {
            problem: "The ESC solder pads are facing the center instead of the arms.",
            reason: "The ESC was placed in the wrong orientation, making it harder to solder the motor wires later.",
            solution: "Flip the ESC so the motor pad corners face outward toward each arm. No solder has been done yet so this is an easy fix."
          }
        ],
        tip: "Keep the ESC isolated from the frame to prevent electrical shorts."
      },
      {
        stepNumber: 4,
        stage: "Step 4: Flight Controller",
        title: "Mount the SpeedyBee F405 Mini",
        time: "15 mins",
        description: "Install the flight controller above the ESC in the center stack.",
        whatToDo: "Place the SpeedyBee F405 Mini flight controller on soft rubber standoffs above the ESC.",
        howToDo: "Ensure the small white arrow printed on the board points forward toward the front arms of the drone.",
        whatYouSee: "The flight controller is firmly mounted, level, and isolated from motor vibrations.",
        checkpoints: ["The controller should be firmly mounted with the orientation arrow pointing forward."],
        commonProblems: [
          {
            problem: "The arrow on the flight controller is pointing sideways instead of forward.",
            reason: "The board was rotated 90 degrees when placed on the standoffs.",
            solution: "Power is not connected yet, so simply lift the board, rotate it so the arrow points toward the front two arms, and remount."
          },
          {
            problem: "The flight controller board feels hard and rigid — not cushioned by the grommets.",
            reason: "The board may be directly touching the standoffs without the soft silicone grommets in between.",
            solution: "Lift the board and check that all four silicone grommets are seated between the board holes and the metal standoffs, not bypassed."
          }
        ],
        tip: "The soft silicone grommets protect the onboard motion sensor from motor vibration."
      },
      {
        stepNumber: 5,
        stage: "Step 5: Motor Connections",
        title: "Solder Motors to the 4-in-1 ESC",
        time: "25 mins",
        description: "Connect each brushless motor's three wires to the ESC.",
        whatToDo: "Solder the three wires from each motor to the corresponding M1, M2, M3, and M4 pads on the 4-in-1 ESC.",
        howToDo: "Tin the wires and pads first, then solder neat, shiny joints without stray strands.",
        whatYouSee: "Each motor has three clean soldered joints to its ESC corner.",
        checkpoints: ["Each motor is cleanly connected to its designated ESC pads with no solder bridges."],
        commonProblems: [
          {
            problem: "The solder is not sticking to the motor wire or the ESC pad — it just rolls off.",
            reason: "The wire or pad was not pre-tinned (pre-coated with solder) before joining them together.",
            solution: "Apply a small amount of solder directly to the wire tip and a small amount directly to the pad separately first. Once both are shiny, press them together and apply heat briefly to join them."
          },
          {
            problem: "Two neighboring motor wire pads are accidentally connected by a blob of solder.",
            reason: "Too much solder was used, causing it to flow between adjacent pads.",
            solution: "Disconnect power (it is not connected yet). Use a fresh piece of solder wick braid pressed onto the blob with the iron tip to absorb the excess solder."
          },
          {
            problem: "A motor wire broke off at the solder joint when bending it.",
            reason: "The wire was bent immediately after soldering while the joint was still slightly warm and fragile.",
            solution: "Wait 30 seconds after soldering before moving or bending the wire. Re-strip a small amount of insulation and resolder if needed."
          }
        ],
        tip: "If a motor spins backward later, you can reverse it easily in software without resoldering."
      },
      {
        stepNumber: 6,
        stage: "Step 6: ESC to FC Harness",
        title: "Connect ESC Wire Harness to Flight Controller",
        time: "10 mins",
        description: "Plug the multi-pin signal harness between the ESC and flight controller.",
        whatToDo: "Connect the ESC signal and telemetry harness into the flight controller port.",
        howToDo: "Insert the multi-wire ribbon cable firmly into both JST connectors until it clicks into place.",
        whatYouSee: "The harness neatly bridges the ESC and flight controller without tension or pinching.",
        checkpoints: ["Motor signals S1-S4 and VBAT power pins connect correctly to the flight controller."],
        commonProblems: [
          {
            problem: "The ribbon cable connector does not click in — it stops before going fully in.",
            reason: "The connector may be slightly misaligned or the locking tab is not lifted on a ZIF-type connector.",
            solution: "Do not force it. Check if the connector has a small locking tab that needs to be gently lifted first. Align the cable carefully, then press it in squarely."
          },
          {
            problem: "The harness has tension and is pulling the flight controller to one side.",
            reason: "The cable is too short or is routed in a straight line that crosses other components.",
            solution: "Route the cable in a gentle curve around the edge of the stack rather than across the center. Zip-tie any excess cable loosely to the frame."
          }
        ],
        tip: "Inspect the harness pinout label on both boards to confirm matching order."
      },
      {
        stepNumber: 7,
        stage: "Step 7: Radio Receiver",
        title: "Connect the ELRS Radio Receiver",
        time: "20 mins",
        description: "Wire the ExpressLRS receiver to a UART on the flight controller.",
        whatToDo: "Connect the radio receiver to 5V, GND, TX, and RX on the flight controller.",
        howToDo: "Solder receiver TX to FC RX1, receiver RX to FC TX1, and power leads to 5V and GND.",
        whatYouSee: "The receiver receives power with its status LED lighting up, antenna safely routed away from propellers.",
        checkpoints: ["The receiver has secure power and serial data connections."],
        commonProblems: [
          {
            problem: "The receiver LED does not light up after connecting power.",
            reason: "The power wires (5V and GND) may be swapped, or one of the solder joints is a cold joint that looks connected but is not.",
            solution: "Disconnect power immediately. Double-check that the red wire goes to 5V and the black wire goes to GND. Reheat any dull or cracked-looking solder joints."
          },
          {
            problem: "The receiver TX and RX wires were connected the same way on both ends — TX to TX and RX to RX.",
            reason: "Serial communication requires a crossover: the transmitter output of one device must connect to the receiver input of the other.",
            solution: "Reconnect so that receiver TX goes to flight controller RX1, and receiver RX goes to flight controller TX1. This is the correct crossed connection."
          }
        ],
        tip: "Secure the receiver antenna with zip-ties and heat-shrink to protect it from propeller strikes."
      },
      {
        stepNumber: 8,
        stage: "Step 8: Battery Lead",
        title: "Connect the Battery Lead & Capacitor",
        time: "15 mins",
        description: "Solder the main XT30/XT60 power lead and filter capacitor to the ESC.",
        whatToDo: "Connect the heavy battery leads and low-ESR capacitor to the ESC main power pads.",
        howToDo: "Solder the red wire to positive (+) and black wire to negative (-), with the capacitor across both pads.",
        whatYouSee: "Solid, shiny high-current joints with no possibility of touching each other.",
        checkpoints: ["Check connector and battery polarity carefully before plugging in power."],
        commonProblems: [
          {
            problem: "The battery connector appears to fit into the drone lead, but you are not sure about polarity.",
            reason: "XT30 and XT60 connectors are designed to only fit one way, but a builder may still worry they have soldered their own lead incorrectly.",
            solution: "Use a multimeter set to DC voltage. Touch the red probe to the connector's positive pin and the black probe to the negative pin. A positive number confirms correct polarity before connecting."
          },
          {
            problem: "The solder at the main power pads is dull and grainy rather than smooth and shiny.",
            reason: "This is a cold solder joint caused by the iron not being hot enough or the solder being moved before it fully cooled.",
            solution: "Reheat the joint with the iron until it flows liquid again, then remove the iron and hold the wire perfectly still for 5 seconds while it cools naturally."
          }
        ],
        tip: "The capacitor absorbs voltage spikes from the motors and keeps video and sensor signals clean."
      },
      {
        stepNumber: 9,
        stage: "Step 9: Configuration",
        title: "Configure Firmware via USB",
        time: "25 mins",
        description: "Connect to the computer to configure flight controller software.",
        whatToDo: "Plug a USB-C cable into the SpeedyBee F405 Mini and open Betaflight Configurator.",
        howToDo: "Calibrate the onboard accelerometer, select DShot600 motor protocol, and enable Serial RX on UART1.",
        whatYouSee: "The 3D model on screen moves in real time matching your physical drone movements.",
        checkpoints: ["Flight controller communicates with computer and onboard sensors read accurately."],
        commonProblems: [
          {
            problem: "Betaflight Configurator does not detect the flight controller after plugging in the USB cable.",
            reason: "The USB driver for the STM32 chip on the flight controller may not be installed on your computer yet.",
            solution: "In Betaflight Configurator, click the 'Driver Installer' button in the bottom-left and install the ImpulseRC Driver Fixer or Zadig driver. Unplug and replug the USB cable after installing."
          },
          {
            problem: "The 3D drone model on screen does not move when you tilt the drone.",
            reason: "The accelerometer was not calibrated, or the sensor reads are disabled in the Configuration tab.",
            solution: "Go to the Setup tab in Betaflight. Place the drone flat and level on a table, then click 'Calibrate Accelerometer'. The model should now respond to movement."
          },
          {
            problem: "After saving settings, Betaflight shows a warning that the FC has rebooted but now shows no ports.",
            reason: "This is normal after saving — the flight controller briefly disconnects to apply the new configuration.",
            solution: "Wait 5 seconds, then click the Connect button again in Betaflight Configurator to reconnect. Your settings have been saved successfully."
          }
        ],
        tip: "Keep propellers OFF whenever the drone is plugged into a computer."
      },
      {
        stepNumber: 10,
        stage: "Step 10: Bench Test",
        title: "Test Motor Direction Without Propellers",
        time: "15 mins",
        description: "Test motor spin directions safely before installing blades.",
        whatToDo: "Test the electronics and motor spin directions with all propellers REMOVED.",
        howToDo: "Plug in the battery, use the motor test slider in software, and gently touch motor sides to check spin direction.",
        whatYouSee: "Motors 1 and 4 spin counter-clockwise, and motors 2 and 3 spin clockwise as configured.",
        checkpoints: ["The electronics respond correctly without any propellers installed."],
        commonProblems: [
          {
            problem: "One motor does not spin at all during the motor test in Betaflight.",
            reason: "That motor's three wires may have a cold solder joint on the ESC, or the motor itself may have an internal connection issue.",
            solution: "Disconnect the battery first. Inspect the three solder joints for that motor on the ESC — look for dull, grainy, or cracked joints. Reheat any suspect joint with the soldering iron."
          },
          {
            problem: "A motor spins in the wrong direction.",
            reason: "Brushless motors can spin either direction depending on which order the three wires are connected — there is no guaranteed direction from soldering alone.",
            solution: "In Betaflight, go to the Motors tab and use the 'Motor Direction' feature to reverse any motor digitally using DShot commands. No resoldering is needed."
          },
          {
            problem: "A motor makes a grinding or clicking noise instead of spinning smoothly.",
            reason: "A motor screw may be too long and pressing against the rotor inside, or debris has entered the motor during assembly.",
            solution: "Disconnect the battery. Remove the motor from the arm and check for obstruction under the motor bell. Check that the mounting screw tips are not protruding into the motor cavity."
          }
        ],
        tip: "NEVER install propellers until all bench and motor direction tests have fully passed."
      },
      {
        stepNumber: 11,
        stage: "Step 11: Radio Test",
        title: "Bind and Test Transmitter Controls",
        time: "15 mins",
        description: "Bind your ELRS transmitter and verify stick response.",
        whatToDo: "Link your handheld controller to the receiver and verify control channels.",
        howToDo: "Turn on the transmitter, check the receiver status light turns solid, and observe stick sliders moving on screen.",
        whatYouSee: "Throttle, pitch, roll, and yaw bars move smoothly from 1000 to 2000 in response to your sticks.",
        checkpoints: ["Transmitter controls correspond to the correct channels and respond without latency."],
        commonProblems: [
          {
            problem: "The receiver LED is blinking but never goes solid — the transmitter and receiver are not binding.",
            reason: "The receiver is in binding mode but the transmitter is not sending the bind signal, or they are using different ExpressLRS packet rates.",
            solution: "Put the receiver into bind mode by pressing its button until the LED flashes rapidly. Then on your transmitter, go to the ExpressLRS LUA script and tap 'Bind'. Both devices must be set to the same frequency band (2.4 GHz or 915 MHz)."
          },
          {
            problem: "In Betaflight, the throttle channel moves when you move the roll stick instead.",
            reason: "The channel mapping in the receiver or Betaflight's channel map does not match your transmitter's output order.",
            solution: "In Betaflight Configurator, go to the Receiver tab and change the Channel Map setting (e.g., from TAER to AETR or AETR to TAER) until moving each stick moves only its matching bar."
          }
        ],
        tip: "Set up a reliable arming switch and confirm the failsafe drops throttle when the transmitter is turned off."
      },
      {
        stepNumber: 12,
        stage: "Step 12: Safety & Props",
        title: "Final Safety Check & Install Propellers",
        time: "15 mins",
        description: "Perform the final pre-flight inspection and mount matched propellers.",
        whatToDo: "Inspect all hardware, tighten the battery strap, and install matched CW/CCW propellers.",
        howToDo: "Double-check motor rotation vs propeller shape, fasten locknuts securely with a prop wrench.",
        whatYouSee: "Everything is firmly attached, clean, and ready for safe outdoor flight.",
        checkpoints: ["Propellers are matched to motor rotation directions and locknuts are securely tightened."],
        commonProblems: [
          {
            problem: "A propeller feels loose after tightening the locknut — it has slight play.",
            reason: "The locknut was not tightened enough, or the wrong size propeller was used for that motor shaft diameter.",
            solution: "Use a prop wrench or pliers to hold the motor shaft while tightening the locknut firmly. The propeller should have zero wobble when pushed side to side."
          },
          {
            problem: "The propeller shape does not match the motor's spin direction — a CW prop is on a CCW motor.",
            reason: "Propellers are shaped to push air downward only when spinning in their designated direction. The wrong prop will lift nothing.",
            solution: "Propellers are labeled CW (clockwise) or CCW (counter-clockwise), usually printed on the hub. Match them to the motor diagram: front-right and rear-left are CW, front-left and rear-right are CCW."
          }
        ],
        tip: "Always arm the drone in an open outdoor area far away from people and obstacles."
      }
    ],
    arduinoCode: `// =================================================================
// SpeedyBee F405 Mini Flight Controller Configuration (Betaflight)
// Flight Controller: SpeedyBee F405 Mini (STM32F405 MCU + Onboard IMU)
// Architecture: 4-in-1 ESC (DShot600) + ExpressLRS (CRSF Serial UART)
// =================================================================

// 1. Ports Configuration:
// Enable Serial RX on UART1 for ExpressLRS Receiver
serial 0 64 115200 57600 0 115200

// 2. Receiver Protocol Settings:
set receiver_type = SERIAL
set serialrx_provider = CRSF

// 3. 4-in-1 ESC Motor Protocol (Digital DShot):
set motor_pwm_protocol = DSHOT600
set dshot_bidir = ON
set motor_poles = 14

// 4. Onboard IMU & Gyroscope Filtering:
set gyro_to_use = FIRST
set gyro_sync_denom = 1
set pid_process_denom = 1

// 5. Flight Safety & Failsafe Rules:
set auto_disarm_delay = 5
set failsafe_procedure = DROP
set small_angle = 180

save`,
    faqs: [
      {
        q: "Why does the drone use the SpeedyBee F405 Mini instead of an Arduino?",
        a: "An Arduino lacks the high clock speed, floating-point hardware, dedicated motor timers, and sensor filtering needed to balance a multirotor. The SpeedyBee F405 Mini uses a 32-bit ARM processor specifically designed to run real-time flight control algorithms."
      },
      {
        q: "What does the 4-in-1 ESC do?",
        a: "The 4-in-1 ESC combines four electronic speed controllers onto one central board. It receives high-speed digital signals (like DShot) from the flight controller and delivers battery power to spin each brushless motor."
      },
      {
        q: "Where is the motion sensor (IMU) located?",
        a: "The motion sensor (gyroscope and accelerometer) is built directly onto the SpeedyBee F405 Mini board, so no separate sensor module or extra wiring is needed."
      },
      {
        q: "Why should I test without propellers?",
        a: "Brushless motors spin at thousands of RPM. Testing on the workbench without propellers prevents accidents while you verify motor directions, wiring, and radio responsiveness."
      },
      {
        q: "Can I use a different LiPo battery?",
        a: "Only use a battery whose cell count (e.g. 3S or 4S), voltage, and discharge current match the ratings of your brushless motors and 4-in-1 ESC."
      },
      {
        q: "What is ExpressLRS (ELRS)?",
        a: "ExpressLRS is a modern, open-source radio control link that provides ultra-low latency and long-range communication between your handheld transmitter and the drone's receiver."
      }
    ],
    tips: [
      "Always test motor directions and receiver signals before installing propellers.",
      "Mount the SpeedyBee F405 Mini on soft silicone grommets to isolate the onboard IMU from motor vibrations.",
      "Check battery lead polarity (Red to +, Black to -) before plugging in the LiPo battery.",
      "Make sure all four motors and the frame screws are firmly secured with thread-lock.",
      "Never test a flying drone near people, pets, or fragile obstacles.",
      "Ensure clockwise (CW) and counter-clockwise (CCW) propellers match the spin direction of each motor."
    ]
  },
{
    slug: "robotic-arm",
    id: "robotic-arm-4dof",
    name: "Robotic Arm 4-DOF",
    title: "Robotic Arm 4-DOF",
    badge: "ROBOTIC ARM",
    difficulty: "Intermediate",
    level: "Intermediate",
    shortDescription: "Build a four-joint robotic arm that can move its base, arm, elbow and gripper.",
    description: "Build a four-joint robotic arm that can move its base, arm, elbow and gripper.",
    overview: "The robotic arm uses four servo motors to create four controlled movements. A microcontroller tells each servo which angle to move to.",
    whatYouLearn: [
      "How servo motors work",
      "How robot joints create movement",
      "How a controller sends servo commands",
      "How a gripper picks up objects",
      "How to build and test a simple robotic arm"
    ],
    howItWorks: "Each servo controls one movement of the arm. The controller sends an angle to each servo, and the servo moves the joint to that position.",
    projectNote: "Do not power four servos directly from the Arduino 5V pin. Use a suitable external regulated 5V supply and connect the grounds together.",
    codeNote: "This program demonstrates basic four-servo movement. The exact angles should be adjusted for the physical arm so that no joint is forced against its mechanical limit.",
    category: "Robotic Arms",
    timeEstimate: "6 Hours",
    partsCount: 8,
    microcontroller: "Arduino Uno (ATmega328P microcontroller, 5V operating voltage)",
    sensors: ["Servo Angle Position Feedback"],
    motorDriver: "External 5V Power Supply + Microcontroller Servo Control",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCEOHQ993ej21nn6qZO1IBFN1a7oovo1adlKgAjOdpDqT3rzqAilst-3d2M5Aczc25dfiRuQ2sBKsHyykqUkbg7DbQW41IJ2eBqOvYRDccS3rdhuI-3TjlmCn2nzNVUpbbouCht8Km_1fVT_h90cym8O2hQqDiSfgKX0hLdCU_o64RqJYqDjE6xMmrnQsSgdL4QkzB0oU_e7GhHgeEOVhvJCwuald5_jBTX7OTlfS_kLsB5BrFtYQb8",
    realImage: "/robotics/robotic-arm-real.jpg",
    featured: true,
    bom: [
      {
        id: "arm-mcu-01",
        name: "Arduino Uno",
        whatIsIt: "The small computer that controls the arm's servo motors.",
        whyUsed: "It tells each servo how far to move.",
        qty: 1,
        spec: "ATmega328P microcontroller, 5V operating voltage",
        category: "Electronics",
        priceEst: "₹480",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Arduino Nano",
          useCase: "The Nano can perform the same controller role while taking up less space.",
          whyItWorks: "The Nano can perform the same controller role while taking up less space."
        }
      },
      {
        id: "arm-srv-01",
        name: "Servo Motor",
        whatIsIt: "A motor that can move to a specific angle.",
        whyUsed: "Each servo controls one movement of the robotic arm.",
        qty: 4,
        spec: "Use servos with enough torque for the selected arm structure.",
        category: "Movement",
        priceEst: "₹1,280",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Compatible servo with matching voltage, size and torque",
          useCase: "Another servo can be used if it can safely move the same joint.",
          whyItWorks: "Another servo can be used if it can safely move the same joint."
        }
      },
      {
        id: "arm-frm-01",
        name: "Robotic Arm Structure",
        whatIsIt: "The physical frame that forms the robot arm.",
        whyUsed: "It connects the joints and gives the servos a structure to move.",
        qty: 1,
        spec: "4-DOF compatible arm structure",
        category: "Structure",
        priceEst: "₹690",
        inStock: true,
        storesAvailable: 3,
        alternative: {
          name: "Compatible 4-DOF arm frame",
          useCase: "Another frame can be used if it supports four servo-controlled movements.",
          whyItWorks: "Another frame can be used if it supports four servo-controlled movements."
        }
      },
      {
        id: "arm-hrn-01",
        name: "Servo Horn",
        whatIsIt: "A small part that connects a servo shaft to the arm structure.",
        whyUsed: "It transfers the servo's rotation to the arm joint.",
        qty: 4,
        spec: "Must match the selected servo.",
        category: "Structure",
        priceEst: "₹120",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Matching servo horn",
          useCase: "The horn only needs to fit the servo shaft and arm connection.",
          whyItWorks: "The horn only needs to fit the servo shaft and arm connection."
        }
      },
      {
        id: "arm-grp-01",
        name: "Gripper",
        whatIsIt: "The claw at the end of the arm.",
        whyUsed: "It allows the arm to hold and release small objects.",
        qty: 1,
        spec: "Compatible with the selected servo and arm structure.",
        category: "Movement",
        priceEst: "₹250",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Compatible robotic gripper",
          useCase: "Another small gripper can perform the same object-holding function.",
          whyItWorks: "Another small gripper can perform the same object-holding function."
        }
      },
      {
        id: "arm-pwr-01",
        name: "External 5V Power Supply",
        whatIsIt: "Provides enough power for the servo motors.",
        whyUsed: "Multiple servos can require more current than the controller should provide directly.",
        qty: 1,
        spec: "5V supply with sufficient current for the selected servos.",
        category: "Power",
        priceEst: "₹380",
        inStock: true,
        storesAvailable: 3,
        alternative: {
          name: "Suitable regulated 5V servo power supply",
          useCase: "Another regulated 5V supply can be used if it can provide enough current.",
          whyItWorks: "Another regulated 5V supply can be used if it can provide enough current."
        }
      },
      {
        id: "arm-wir-01",
        name: "Jumper Wires",
        whatIsIt: "Wires used to connect the controller, servos and power.",
        whyUsed: "They carry the control signals and power connections.",
        qty: 1,
        spec: "Suitable jumper or hook-up wire.",
        category: "Structure",
        priceEst: "₹80",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Hook-up wire",
          useCase: "Suitable wire can make the same electrical connections.",
          whyItWorks: "Suitable wire can make the same electrical connections."
        }
      },
      {
        id: "arm-hrd-01",
        name: "Mounting Hardware",
        whatIsIt: "Screws, nuts and other parts used to assemble the arm.",
        whyUsed: "They hold the arm and servos together.",
        qty: 1,
        spec: "Hardware must match the arm and servo mounting holes.",
        category: "Structure",
        priceEst: "₹60",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Compatible mounting hardware",
          useCase: "Equivalent hardware can be used if the size and thread match.",
          whyItWorks: "Equivalent hardware can be used if the size and thread match."
        }
      }
    ],
    pinout: [
      { componentPin: "Base Servo (Signal)", targetPin: "D3", wireColor: "Orange", type: "PWM", notes: "Rotates the base of the arm." },
      { componentPin: "Shoulder Servo (Signal)", targetPin: "D5", wireColor: "Orange", type: "PWM", notes: "Raises and lowers the main arm section." },
      { componentPin: "Elbow Servo (Signal)", targetPin: "D6", wireColor: "Orange", type: "PWM", notes: "Bends the arm at the elbow." },
      { componentPin: "Gripper Servo (Signal)", targetPin: "D9", wireColor: "Orange", type: "PWM", notes: "Opens and closes the gripper." },
      { componentPin: "Servo Power (Power)", targetPin: "External regulated 5V", wireColor: "Red", type: "Power", notes: "Provides power to the servo motors." },
      { componentPin: "Servo Ground (GND)", targetPin: "Common GND", wireColor: "Black", type: "Ground", notes: "Gives the controller and servo power supply the same electrical reference." }
    ],
    steps: [
      {
        stepNumber: 1,
        stage: "Step 1: Base",
        title: "Build the Base",
        time: "20 mins",
        description: "Assemble the bottom part of the robotic arm.",
        whatToDo: "Assemble the bottom part of the robotic arm.",
        howToDo: "Follow the arm structure's mounting holes and tighten the screws.",
        whatYouSee: "The base should sit flat.",
        checkpoints: ["The base should sit flat."],
        tip: "Test one servo at a time before testing the whole arm."
      },
      {
        stepNumber: 2,
        stage: "Step 2: Base Servo",
        title: "Attach the Base Servo",
        time: "15 mins",
        description: "Mount the first servo on the base.",
        whatToDo: "Mount the first servo on the base.",
        howToDo: "Secure the servo using the matching mounting holes.",
        whatYouSee: "The servo should not move when the base is held.",
        checkpoints: ["The servo should not move when the base is held."],
        tip: "Tighten the arm structure, but do not overtighten plastic parts."
      },
      {
        stepNumber: 3,
        stage: "Step 3: Shoulder Joint",
        title: "Attach the Shoulder",
        time: "20 mins",
        description: "Connect the first arm section to the base servo.",
        whatToDo: "Connect the first arm section to the base servo.",
        howToDo: "Use the servo horn and mounting hardware.",
        whatYouSee: "The arm should move when the servo shaft turns.",
        checkpoints: ["The arm should move when the servo shaft turns."],
        tip: "Do not force a servo beyond its mechanical movement range."
      },
      {
        stepNumber: 4,
        stage: "Step 4: Elbow Servo",
        title: "Attach the Elbow Servo",
        time: "20 mins",
        description: "Install the servo that moves the elbow.",
        whatToDo: "Install the servo that moves the elbow.",
        howToDo: "Secure it to the arm structure.",
        whatYouSee: "The elbow should move freely without hitting the frame.",
        checkpoints: ["The elbow should move freely without hitting the frame."],
        tip: "Keep the servo wires away from moving joints."
      },
      {
        stepNumber: 5,
        stage: "Step 5: Gripper Claw",
        title: "Attach the Gripper",
        time: "20 mins",
        description: "Attach the gripper servo and claw.",
        whatToDo: "Attach the gripper servo and claw.",
        howToDo: "Connect the gripper to the servo horn.",
        whatYouSee: "The gripper should open and close smoothly.",
        checkpoints: ["The gripper should open and close smoothly."],
        tip: "Start with slow movements while testing."
      },
      {
        stepNumber: 6,
        stage: "Step 6: Signal Wiring",
        title: "Connect the Servo Wires",
        time: "15 mins",
        description: "Connect the four servo signal wires to the controller.",
        whatToDo: "Connect the four servo signal wires to the controller.",
        howToDo: "Use the pin connection table.",
        whatYouSee: "Each servo signal wire should go to the correct pin.",
        checkpoints: ["Each servo signal wire should go to the correct pin (D3, D5, D6, D9)."],
        tip: "Check each pin number against the pin connections table before powering up."
      },
      {
        stepNumber: 7,
        stage: "Step 7: External Power",
        title: "Connect Servo Power",
        time: "15 mins",
        description: "Connect the servos to the external 5V supply.",
        whatToDo: "Connect the servos to the external 5V supply.",
        howToDo: "Connect servo power to 5V and servo ground to GND.",
        whatYouSee: "The external supply should be correctly connected before powering it.",
        checkpoints: ["The external supply should be correctly connected before powering it."],
        tip: "Use a suitable external 5V power supply for multiple servos."
      },
      {
        stepNumber: 8,
        stage: "Step 8: Common Ground",
        title: "Connect Common Ground",
        time: "10 mins",
        description: "Connect the servo power ground to the controller ground.",
        whatToDo: "Connect the servo power ground to the controller ground.",
        howToDo: "Use a common GND connection.",
        whatYouSee: "The controller and servo supply should share the same ground.",
        checkpoints: ["The controller and servo supply should share the same ground."],
        tip: "A shared ground gives control signals the same electrical reference."
      },
      {
        stepNumber: 9,
        stage: "Step 9: Upload Code",
        title: "Upload the Program",
        time: "15 mins",
        description: "Upload the servo-control program.",
        whatToDo: "Upload the servo-control program.",
        howToDo: "Connect the Arduino to your computer and upload the code.",
        whatYouSee: "The upload should finish without errors.",
        checkpoints: ["The upload should finish without errors."],
        tip: "Keep fingers clear of moving joints during program startup."
      },
      {
        stepNumber: 10,
        stage: "Step 10: Calibration & Test",
        title: "Test Each Joint",
        time: "20 mins",
        description: "Test the four movements one at a time.",
        whatToDo: "Test the four movements one at a time.",
        howToDo: "Move the base, shoulder, elbow and gripper separately.",
        whatYouSee: "Each joint should move smoothly.",
        checkpoints: ["Each joint should move smoothly."],
        tip: "Start with slow movements while testing."
      }
    ],
    arduinoCode: `#include <Servo.h>

Servo baseServo;
Servo shoulderServo;
Servo elbowServo;
Servo gripperServo;

const int BASE_PIN = 3;
const int SHOULDER_PIN = 5;
const int ELBOW_PIN = 6;
const int GRIPPER_PIN = 9;

void setup() {

  baseServo.attach(BASE_PIN);
  shoulderServo.attach(SHOULDER_PIN);
  elbowServo.attach(ELBOW_PIN);
  gripperServo.attach(GRIPPER_PIN);

  baseServo.write(90);
  shoulderServo.write(90);
  elbowServo.write(90);
  gripperServo.write(60);

  delay(1000);
}

void loop() {

  // Simple demonstration movement.

  baseServo.write(60);
  delay(500);

  baseServo.write(120);
  delay(500);

  shoulderServo.write(70);
  delay(500);

  shoulderServo.write(110);
  delay(500);

  elbowServo.write(70);
  delay(500);

  elbowServo.write(110);
  delay(500);

  gripperServo.write(30);
  delay(500);

  gripperServo.write(70);
  delay(1000);
}`,
    faqs: [
      {
        q: "What does 4-DOF mean?",
        a: "It means the arm has four independently controlled movements."
      },
      {
        q: "Why are four servos used?",
        a: "Each servo controls one movement of the arm."
      },
      {
        q: "Why should I use an external power supply?",
        a: "Several servos can need more current than the Arduino should provide directly."
      },
      {
        q: "Why do the controller and servo supply need a common ground?",
        a: "The shared ground gives the control signals a common electrical reference."
      },
      {
        q: "Why is the servo shaking?",
        a: "Check the power supply, wiring and servo mounting. A weak power supply can also cause unstable movement."
      },
      {
        q: "Can I change the servo?",
        a: "Yes, if the replacement has compatible voltage, size and enough torque for the joint."
      }
    ],
    tips: [
      "Test one servo at a time before testing the whole arm.",
      "Do not force a servo beyond its mechanical movement range.",
      "Keep the servo wires away from moving joints.",
      "Use a suitable external 5V power supply for multiple servos.",
      "Tighten the arm structure, but do not overtighten plastic parts.",
      "Start with slow movements while testing."
    ]
  },
  {
    slug: "robosoccer",
    id: "robosoccer-bot",
    name: "RoboSoccer Bot",
    title: "RoboSoccer Bot",
    badge: "COMPETITIVE",
    difficulty: "Intermediate",
    level: "Intermediate",
    shortDescription: "Build a small mobile robot that can be controlled around a playing field and interact with a ball.",
    description: "Build a small mobile robot that can be controlled around a playing field and interact with a ball.",
    overview: "The RoboSoccer Bot uses two motors for movement. A motor driver lets the controller control the motors, while a wireless module can receive movement commands.",
    whatYouLearn: [
      "How two motors move a robot",
      "How a motor driver works",
      "How wireless control works",
      "How robot direction is controlled",
      "How to build and test a mobile robot"
    ],
    howItWorks: "The controller receives movement commands and sends signals to the motor driver. The motor driver controls the left and right motors, allowing the robot to move forward, backward and turn.",
    codeNote: "F = Forward, B = Backward, L = Left, R = Right, S = Stop. This program receives single-character Bluetooth commands from a phone app and controls motor directions and speed.",
    category: "Competitive Bots",
    timeEstimate: "5 Hours",
    partsCount: 10,
    microcontroller: "Arduino Uno (ATmega328P microcontroller, 5V operating voltage)",
    sensors: ["HC-05 Bluetooth Module (wireless communication)"],
    motorDriver: "L298N Motor Driver (dual-channel motor driver)",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDsYk-jYV-0v_Xt1dTP-FeJTd2nyu2q_aNWZQg_dXQDX1v2j9bwvrcr0KPCQswrFQq6LUvnslw_9vbARNfGLrmTmmdnLTgwVw3a5kKkXCtIs35BPKW62OpvQXgaKz417aHxNn_2LpeCFAPFyN9ga1KbEZKWkjAfFqmFZu1Fo4xXCni4ujierzI17sgyIzQMwBSUWrqcbjo88z9Qdc4XO1cnsqztoK2WH70WildBetfwPEbr8sLTn1so",
    realImage: "/robotics/robosoccer-real.jpg",
    featured: true,
    bom: [
      {
        id: "soc-mcu-01",
        name: "Arduino Uno",
        whatIsIt: "The small computer that controls the robot.",
        whyUsed: "It reads the control commands and tells the motor driver how the robot should move.",
        qty: 1,
        spec: "ATmega328P microcontroller, 5V operating voltage",
        category: "Electronics",
        priceEst: "₹480",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Arduino Nano",
          useCase: "The Nano can perform the same controller role in a smaller package.",
          whyItWorks: "The Nano can perform the same controller role in a smaller package."
        }
      },
      {
        id: "soc-drv-01",
        name: "L298N Motor Driver",
        whatIsIt: "A board that lets the Arduino control the robot's motors.",
        whyUsed: "The Arduino cannot safely drive the motors directly, so the motor driver handles the motor power.",
        qty: 1,
        spec: "Dual-channel motor driver",
        category: "Electronics",
        priceEst: "₹175",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "TB6612FNG",
          useCase: "The TB6612FNG can also control two DC motors and is suitable when its voltage and current limits match the motors.",
          whyItWorks: "The TB6612FNG can also control two DC motors and is suitable when its voltage and current limits match the motors."
        }
      },
      {
        id: "soc-mot-01",
        name: "DC Gear Motor",
        whatIsIt: "A motor with built-in gearing that turns the robot wheels.",
        whyUsed: "The two motors provide movement for the left and right sides of the robot.",
        qty: 2,
        spec: "Use motors matched to the selected battery and motor driver.",
        category: "Movement",
        priceEst: "₹130",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Compatible DC gear motor",
          useCase: "Another motor can be used if its voltage, current and physical mounting requirements match.",
          whyItWorks: "Another motor can be used if its voltage, current and physical mounting requirements match."
        }
      },
      {
        id: "soc-whl-01",
        name: "Robot Wheel",
        whatIsIt: "The wheels that move the robot across the floor.",
        whyUsed: "The motors turn the wheels to move the robot.",
        qty: 2,
        spec: "Wheel size must match the selected motors and chassis.",
        category: "Movement",
        priceEst: "₹90",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Compatible robot wheel",
          useCase: "Another wheel can be used if it fits the motor shaft and chassis.",
          whyItWorks: "Another wheel can be used if it fits the motor shaft and chassis."
        }
      },
      {
        id: "soc-chs-01",
        name: "Robot Chassis",
        whatIsIt: "The base that holds the robot's components.",
        whyUsed: "It keeps the motors, controller and battery together.",
        qty: 1,
        spec: "Two-wheel drive compatible chassis",
        category: "Structure",
        priceEst: "₹240",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Compatible 2WD robot chassis",
          useCase: "Another chassis can be used if it fits the motors and wheels.",
          whyItWorks: "Another chassis can be used if it fits the motors and wheels."
        }
      },
      {
        id: "soc-bt-01",
        name: "HC-05 Bluetooth Module",
        whatIsIt: "A wireless module that receives commands from a phone or compatible controller.",
        whyUsed: "It allows the robot to receive movement commands without a physical cable.",
        qty: 1,
        spec: "Bluetooth serial communication module",
        category: "Electronics",
        priceEst: "₹280",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Compatible Bluetooth serial module",
          useCase: "Another compatible serial Bluetooth module can perform the same communication role.",
          whyItWorks: "Another compatible serial Bluetooth module can perform the same communication role."
        }
      },
      {
        id: "soc-bat-01",
        name: "Battery",
        whatIsIt: "The power source for the robot.",
        whyUsed: "It provides electricity to the controller and motors.",
        qty: 1,
        spec: "Battery voltage must match the motor driver and motors.",
        category: "Power",
        priceEst: "₹350",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Compatible battery pack",
          useCase: "Another battery can be used if its voltage and current capability match the robot.",
          whyItWorks: "Another battery can be used if its voltage and current capability match the robot."
        }
      },
      {
        id: "soc-sw-01",
        name: "Power Switch",
        whatIsIt: "A switch used to turn the robot on and off.",
        whyUsed: "It makes it easier to safely disconnect the robot from power.",
        qty: 1,
        spec: "Switch rated for the robot's supply current.",
        category: "Power",
        priceEst: "₹30",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Compatible power switch",
          useCase: "Any suitably rated switch can perform the same job.",
          whyItWorks: "Any suitably rated switch can perform the same job."
        }
      },
      {
        id: "soc-wir-01",
        name: "Jumper Wires",
        whatIsIt: "Wires used to connect the electronics.",
        whyUsed: "They carry power and control signals between the controller and other parts.",
        qty: 1,
        spec: "Suitable jumper or hook-up wire.",
        category: "Structure",
        priceEst: "₹80",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Hook-up wire",
          useCase: "Suitable hook-up wire can make the same connections.",
          whyItWorks: "Suitable hook-up wire can make the same connections."
        }
      },
      {
        id: "soc-hrd-01",
        name: "Mounting Hardware",
        whatIsIt: "Screws, nuts and spacers used to attach the components.",
        whyUsed: "They keep the robot parts firmly attached to the chassis.",
        qty: 1,
        spec: "Hardware matched to the selected chassis and components.",
        category: "Structure",
        priceEst: "₹60",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Compatible mounting hardware",
          useCase: "Equivalent hardware can be used when the size and thread match.",
          whyItWorks: "Equivalent hardware can be used when the size and thread match."
        }
      }
    ],
    pinout: [
      { componentPin: "Motor Driver ENA", targetPin: "D5", wireColor: "White", type: "PWM", notes: "Controls the speed of the left motor." },
      { componentPin: "Motor Driver IN1", targetPin: "D7", wireColor: "Green", type: "Digital", notes: "Controls the direction of the left motor." },
      { componentPin: "Motor Driver IN2", targetPin: "D8", wireColor: "Yellow", type: "Digital", notes: "Controls the direction of the left motor." },
      { componentPin: "Motor Driver ENB", targetPin: "D6", wireColor: "Gray", type: "PWM", notes: "Controls the speed of the right motor." },
      { componentPin: "Motor Driver IN3", targetPin: "D9", wireColor: "Blue", type: "Digital", notes: "Controls the direction of the right motor." },
      { componentPin: "Motor Driver IN4", targetPin: "D10", wireColor: "Purple", type: "Digital", notes: "Controls the direction of the right motor." },
      { componentPin: "HC-05 (TX/RX)", targetPin: "D2 / D3", wireColor: "Orange", type: "Digital", notes: "Receives wireless movement commands." },
      { componentPin: "Motor Driver GND", targetPin: "GND", wireColor: "Black", type: "Ground", notes: "Creates a common electrical reference." },
      { componentPin: "Motor Driver Power", targetPin: "Battery supply", wireColor: "Red", type: "Power", notes: "Provides power for the motors." }
    ],
    steps: [
      {
        stepNumber: 1,
        stage: "Step 1: Chassis",
        title: "Build the Chassis",
        time: "20 mins",
        description: "Prepare the robot base.",
        whatToDo: "Prepare the robot base.",
        howToDo: "Attach the required brackets and mounting parts.",
        whatYouSee: "The chassis should sit flat.",
        checkpoints: ["The chassis should sit flat."],
        tip: "Keep wires away from the wheels."
      },
      {
        stepNumber: 2,
        stage: "Step 2: Motors",
        title: "Attach the Motors",
        time: "20 mins",
        description: "Attach one motor to each side.",
        whatToDo: "Attach one motor to each side.",
        howToDo: "Use the supplied mounting hardware.",
        whatYouSee: "Both motors should be firmly attached.",
        checkpoints: ["Both motors should be firmly attached."],
        tip: "Check the left and right motor directions before driving."
      },
      {
        stepNumber: 3,
        stage: "Step 3: Wheels",
        title: "Attach the Wheels",
        time: "15 mins",
        description: "Connect one wheel to each motor.",
        whatToDo: "Connect one wheel to each motor.",
        howToDo: "Push or screw the wheels onto the motor shafts.",
        whatYouSee: "Both wheels should spin freely.",
        checkpoints: ["Both wheels should spin freely."],
        tip: "Test the motors with the robot lifted off the ground first."
      },
      {
        stepNumber: 4,
        stage: "Step 4: Controller",
        title: "Mount the Controller",
        time: "15 mins",
        description: "Place the Arduino on the chassis.",
        whatToDo: "Place the Arduino on the chassis.",
        howToDo: "Use suitable mounting hardware or a secure electronics mount.",
        whatYouSee: "The Arduino should not move around.",
        checkpoints: ["The Arduino should not move around."],
        tip: "Keep the USB connection accessible for code updates."
      },
      {
        stepNumber: 5,
        stage: "Step 5: Driver",
        title: "Mount the Motor Driver",
        time: "15 mins",
        description: "Place the motor driver on the chassis.",
        whatToDo: "Place the motor driver on the chassis.",
        howToDo: "Keep it away from moving wheels.",
        whatYouSee: "The driver should be secure.",
        checkpoints: ["The driver should be secure."],
        tip: "Keep wires away from the wheels."
      },
      {
        stepNumber: 6,
        stage: "Step 6: Motor Wiring",
        title: "Connect the Motors",
        time: "15 mins",
        description: "Connect the left and right motors to the motor driver.",
        whatToDo: "Connect the left and right motors to the motor driver.",
        howToDo: "Connect the left motor to one motor channel and the right motor to the other.",
        whatYouSee: "Each motor should have two motor wires connected.",
        checkpoints: ["Each motor should have two motor wires connected."],
        tip: "Tighten screw terminals firmly so motor wires don't pull out."
      },
      {
        stepNumber: 7,
        stage: "Step 7: Signal Wiring",
        title: "Connect the Controller",
        time: "20 mins",
        description: "Connect the Arduino to the motor driver.",
        whatToDo: "Connect the Arduino to the motor driver.",
        howToDo: "Follow the pin connection table.",
        whatYouSee: "Every required control wire should be connected.",
        checkpoints: ["Every required control wire should be connected (D5, D6, D7, D8, D9, D10)."],
        tip: "Follow the pin table provided so speed and direction controls match the program."
      },
      {
        stepNumber: 8,
        stage: "Step 8: Bluetooth",
        title: "Connect Bluetooth",
        time: "15 mins",
        description: "Connect the HC-05 Bluetooth module.",
        whatToDo: "Connect the HC-05 Bluetooth module.",
        howToDo: "Connect its power and serial communication wires.",
        whatYouSee: "The module should receive power.",
        checkpoints: ["The module should receive power (D2 / D3 for communication)."],
        tip: "Unplug RX/TX temporarily while uploading code to avoid serial interference."
      },
      {
        stepNumber: 9,
        stage: "Step 9: Power",
        title: "Connect the Battery",
        time: "15 mins",
        description: "Connect the battery through the power switch.",
        whatToDo: "Connect the battery through the power switch.",
        howToDo: "Check polarity before switching the robot on.",
        whatYouSee: "The robot should receive power when the switch is turned on.",
        checkpoints: ["The robot should receive power when the switch is turned on."],
        tip: "Keep the battery securely mounted."
      },
      {
        stepNumber: 10,
        stage: "Step 10: Program Upload",
        title: "Upload the Program",
        time: "15 mins",
        description: "Upload the robot-control program.",
        whatToDo: "Upload the robot-control program.",
        howToDo: "Connect the Arduino to your computer and upload the code.",
        whatYouSee: "The upload should finish without errors.",
        checkpoints: ["The upload should finish without errors in Arduino IDE."],
        tip: "Start with a low motor speed while testing."
      },
      {
        stepNumber: 11,
        stage: "Step 11: Movement Test",
        title: "Test Movement",
        time: "20 mins",
        description: "Test forward, backward and turning.",
        whatToDo: "Test forward, backward and turning.",
        howToDo: "Send one movement command at a time.",
        whatYouSee: "The robot should move in the expected direction.",
        checkpoints: ["The robot should move in the expected direction."],
        tip: "If one wheel moves faster, you can adjust PWM speed in code."
      },
      {
        stepNumber: 12,
        stage: "Step 12: Ball Play",
        title: "Test With the Ball",
        time: "25 mins",
        description: "Try the robot with a lightweight ball.",
        whatToDo: "Try the robot with a lightweight ball.",
        howToDo: "Move slowly and practice controlling the robot around the ball.",
        whatYouSee: "The robot should move smoothly without losing control.",
        checkpoints: ["The robot should move smoothly without losing control."],
        tip: "Use a lightweight ball for the first tests."
      }
    ],
    arduinoCode: `// =================================================================
// RoboNest Beginner Kit - RoboSoccer_Bluetooth.ino
// Controller: Arduino Uno
// Commands: F = Forward, B = Backward, L = Left, R = Right, S = Stop
// =================================================================

#include <SoftwareSerial.h>

SoftwareSerial bluetooth(2, 3);

const int ENA = 5;
const int IN1 = 7;
const int IN2 = 8;

const int ENB = 6;
const int IN3 = 9;
const int IN4 = 10;

void setup() {

  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);

  pinMode(ENB, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  bluetooth.begin(9600);

  stopRobot();
}

void loop() {

  if (bluetooth.available()) {

    char command = bluetooth.read();

    if (command == 'F') {
      forward();
    }

    else if (command == 'B') {
      backward();
    }

    else if (command == 'L') {
      left();
    }

    else if (command == 'R') {
      right();
    }

    else if (command == 'S') {
      stopRobot();
    }
  }
}

void forward() {

  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);

  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);

  analogWrite(ENA, 180);
  analogWrite(ENB, 180);
}

void backward() {

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);

  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);

  analogWrite(ENA, 180);
  analogWrite(ENB, 180);
}

void left() {

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);

  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);

  analogWrite(ENA, 160);
  analogWrite(ENB, 160);
}

void right() {

  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);

  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);

  analogWrite(ENA, 160);
  analogWrite(ENB, 160);
}

void stopRobot() {

  analogWrite(ENA, 0);
  analogWrite(ENB, 0);

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);

  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
}`,
    faqs: [
      {
        q: "What does the motor driver do?",
        a: "It lets the Arduino control the motors while handling the higher motor power."
      },
      {
        q: "Why are two motors enough?",
        a: "The two motors control the left and right sides, allowing the robot to move and turn."
      },
      {
        q: "What does Bluetooth do?",
        a: "It lets the robot receive movement commands wirelessly."
      },
      {
        q: "Why is the robot moving backward?",
        a: "One or both motor wires may be reversed. Check the motor connections and direction settings."
      },
      {
        q: "Can I use another motor driver?",
        a: "Yes, if it can safely control the selected motors and its control pins match the program."
      },
      {
        q: "Why is one wheel moving faster?",
        a: "The motors may have slightly different speeds. You can adjust their PWM values in the program."
      }
    ],
    tips: [
      "Test the motors with the robot lifted off the ground first.",
      "Check the left and right motor directions before driving.",
      "Keep the battery securely mounted.",
      "Start with a low motor speed while testing.",
      "Use a lightweight ball for the first tests.",
      "Keep wires away from the wheels."
    ]
  },
{
    slug: "robomaze",
    title: "RoboMaze Ultrasonic Solver",
    badge: "MAZE SOLVER",
    description: "A smart roving robot that uses sound sensors like a bat to detect walls, navigate a maze, and find its way out without hitting obstacles.",
    howItWorks: "Three ultrasonic sensors send out sound pulses to measure the distance to walls on the left, front, and right. The controller steers into open corridors.",
    category: "Maze Solvers",
    level: "Beginner",
    timeEstimate: "4.5 Hours",
    partsCount: 15,
    microcontroller: "Arduino Nano (compact computer)",
    sensors: ["3x Ultrasonic Distance Sensors (sound sensors to measure wall distances)"],
    motorDriver: "L298N Dual Motor Driver",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCZ_tAwkuBy7hf0XplAkpaXT9iu3r438Xec48FiQBvarFwab-HvzBsbW0_zd4pOEqV7LfFMxziULaehG2BkEfDz-FCU63mbxQX1M1Y7lrjgD2bAcABfiae03NjA7ZVXhqg73YtBe2EcqP16BvJpm1bXOw174RHeMDVpgVaXCKNLd_hBBgXSSKTWpfh5JEQA8q4hNii2V2ujKlLWnlYMmWAsK9DonHYmCMQlpDgFO1pmiSfjXV9RuaoP",
    realImage: "/projects/robomaze-real.jpg",
    bom: [
      {
        id: "mz-mcu-01",
        name: "Arduino Nano V3.0 Microcontroller",
        whatIsIt: "A compact computer board that fits directly into a breadboard.",
        whyUsed: "It runs the maze-solving algorithm, measuring wall distances and choosing open paths.",
        qty: 1,
        spec: "ATmega328P 16MHz controller with Mini-USB/Type-C programming port and 30 pin headers.",
        category: "Electronics",
        priceEst: "₹340",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Arduino Uno R3",
          useCase: "You have an Arduino Uno and do not mind a slightly wider chassis.",
          whyItWorks: "Has the exact same processor, memory, and code compatibility as the Nano."
        }
      },
      {
        id: "mz-sen-01",
        name: "HC-SR04 Ultrasonic Distance Sensors",
        whatIsIt: "Sound wave sensors with two metal cylinders (one speaker, one microphone).",
        whyUsed: "One sensor points left, one points forward, and one points right to measure distances to maze walls simultaneously.",
        qty: 3,
        spec: "40kHz ultrasonic echo distance sensor measuring from 2cm to 400cm with 3mm precision.",
        category: "Electronics",
        priceEst: "₹255",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "HC-SR04P (3.3V/5V version)",
          useCase: "Standard 5V HC-SR04 is unavailable.",
          whyItWorks: "Functions identically with ultrasonic sound waves while supporting both 3.3V and 5V circuits."
        }
      },
      {
        id: "mz-drv-01",
        name: "L298N Dual H-Bridge Motor Driver",
        whatIsIt: "The motor power board that drives the two wheels.",
        whyUsed: "It takes steering commands from the Arduino Nano and delivers battery current to turn the wheels.",
        qty: 1,
        spec: "Dual H-bridge controller with aluminum heatsink and screw terminals.",
        category: "Electronics",
        priceEst: "₹175",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "L9110S Dual Motor Driver Module",
          useCase: "You want a smaller, lighter driver module for tight maze alleys.",
          whyItWorks: "An ultra-compact driver board that powers two small DC motors and fits tight maze chassis."
        }
      },
      {
        id: "mz-bb-01",
        name: "Mini 170-Tie-Point Solderless Breadboard",
        whatIsIt: "A small plastic board with internal spring clips.",
        whyUsed: "The Arduino Nano plugs directly into this board, allowing quick push-in wiring without soldering.",
        qty: 1,
        spec: "170 contact points, standard 2.54mm pitch, with self-adhesive backing tape.",
        category: "Electronics",
        priceEst: "₹50",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Arduino Nano Expansion Shield",
          useCase: "You want dedicated screw terminals or 3-pin sensor headers.",
          whyItWorks: "Has dedicated 3-pin headers for every sensor and motor wire."
        }
      },
      {
        id: "mz-mot-01",
        name: "TT Geared DC Motors (Yellow, 1:48)",
        whatIsIt: "Electric motors with internal reduction gearboxes.",
        whyUsed: "They turn the wheels with precise speed to navigate narrow maze corridors.",
        qty: 2,
        spec: "3V-6V DC motors with dual shafts and internal noise-filtering capacitors.",
        category: "Movement",
        priceEst: "₹130",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "N20 Micro Metal Gear Motors (6V)",
          useCase: "Building an ultra-narrow maze bot.",
          whyItWorks: "Very compact metal gear motors that fit exceptionally narrow maze lanes."
        }
      },
      {
        id: "mz-whl-01",
        name: "65mm High-Traction Rubber Grip Wheels",
        whatIsIt: "Rubber tires on plastic rims that press onto the motor shafts.",
        whyUsed: "They prevent wheel slip on slick maze floors so distance calculations remain accurate.",
        qty: 2,
        spec: "65mm diameter with high-friction silicone rubber tread.",
        category: "Movement",
        priceEst: "₹70",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "60mm Silicone Narrow Wheels",
          useCase: "65mm wheels are too wide for your maze corridors.",
          whyItWorks: "Standard TT motor fit wheels with great grip."
        }
      },
      {
        id: "mz-cst-01",
        name: "Dual Ball Caster Roller Assemblies (Front & Rear)",
        whatIsIt: "Smooth gliding steel ball rollers mounted front and back.",
        whyUsed: "Having two casters keeps the narrow maze bot completely level and prevents tipping during pivot turns.",
        qty: 2,
        spec: "15mm metal ball bearings with M3 mounting hardware.",
        category: "Movement",
        priceEst: "₹90",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "Skid Plugs / Teflon Glider Pads",
          useCase: "Caster wheels add too much height.",
          whyItWorks: "Low-friction rounded nylon pads let the robot slide smoothly on smooth floors."
        }
      },
      {
        id: "mz-pwr-01",
        name: "2x 18650 Battery Holder with Integrated Switch",
        whatIsIt: "Enclosed battery case with red/black lead wires and slide switch.",
        whyUsed: "Holds the rechargeable power cells securely and lets you quickly shut off the robot when caught in a dead end.",
        qty: 1,
        spec: "Holds two 18650 cells in series delivering 7.4V nominal.",
        category: "Power",
        priceEst: "₹85",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "6x AA Battery Holder with Switch",
          useCase: "18650 cells are unavailable.",
          whyItWorks: "Supplies ~7.2V-9V using standard rechargeable or alkaline AA batteries."
        }
      },
      {
        id: "mz-bat-01",
        name: "18650 3.7V Rechargeable Li-ion Batteries",
        whatIsIt: "Rechargeable lithium battery cells.",
        whyUsed: "Supplies steady power to keep the Arduino Nano and ultrasonic sensors running consistently.",
        qty: 2,
        spec: "3.7V nominal (4.2V peak), 2200-2600mAh capacity.",
        category: "Power",
        priceEst: "₹240",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "2S 7.4V LiPo Battery Pack",
          useCase: "You already have RC hobby batteries.",
          whyItWorks: "Supplies the same 7.4V voltage range with high discharge capacity."
        }
      },
      {
        id: "mz-chs-01",
        name: "Narrow Laser-Cut Maze Solver Chassis Plate",
        whatIsIt: "A slim acrylic robot baseplate specially sized for narrow maze alleys.",
        whyUsed: "It keeps the robot narrow enough to pass through standard maze turns without clipping walls.",
        qty: 1,
        spec: "3mm clear acrylic plate (approx. 140mm x 90mm) with motor and sensor bracket cutouts.",
        category: "Structure",
        priceEst: "₹180",
        inStock: true,
        storesAvailable: 3,
        alternative: {
          name: "3D-Printed Custom Narrow Maze Frame",
          useCase: "You have a 3D printer and want a custom form factor.",
          whyItWorks: "Can be 3D printed with integrated ultrasonic sensor clips."
        }
      },
      {
        id: "mz-brk-01",
        name: "Acrylic Ultrasonic Sensor Mounting Brackets",
        whatIsIt: "L-shaped plastic brackets with twin cutouts for ultrasonic sensor eyes.",
        whyUsed: "They lock the 3 ultrasonic sensors firmly at 90-degree angles (Left, Center, Right) so distance readings are pointed in the right direction.",
        qty: 3,
        spec: "3mm acrylic/ABS 90-degree brackets with pre-cut holes matching HC-SR04 sensors.",
        category: "Structure",
        priceEst: "₹75",
        inStock: true,
        storesAvailable: 4,
        alternative: {
          name: "3D-Printed Sensor Clips or Double-Sided Foam Tape",
          useCase: "Pre-cut acrylic brackets are unavailable.",
          whyItWorks: "Securely mounts the sensors facing outward at the correct orientation."
        }
      },
      {
        id: "mz-wir-01",
        name: "DuPont Jumper Wire Ribbon (40 pcs)",
        whatIsIt: "Multi-colored flexible wires with push-on pins.",
        whyUsed: "Connects all 3 ultrasonic sensors (12 wires total) and the motor driver to the Arduino breadboard.",
        qty: 1,
        spec: "20cm 28AWG colored jumper wires with molded pins.",
        category: "Structure",
        priceEst: "₹80",
        inStock: true,
        storesAvailable: 4,
        alternative: null
      }
    ],
    steps: [
      {
        stepNumber: 1,
        stage: "Step 1: Frame Prep",
        title: "Unpack Parts and Prepare Narrow Chassis",
        time: "15 mins",
        description: "Peel protective paper from the narrow maze solver plate and organize mounting hardware.",
        whatToDo: "Inspect the narrow acrylic baseplate and check pre-drilled holes for motors, breadboard, and sensor brackets.",
        howToDo: "Peel protective film from both sides of the narrow plate. Confirm the three front bracket slots (Left 45°/90°, Center, Right 45°/90°) are clear.",
        whatYouSee: "A clean, compact acrylic body plate designed to squeeze through tight maze corridors.",
        checkpoints: [
          "Check that the narrow chassis has no hairline fractures near the wheel cutouts",
          "Ensure pre-cut bracket mounting holes are clean"
        ],
        tip: "A narrow chassis is essential for maze solving so the robot can pivot freely without clipping corner walls."
      },
      {
        stepNumber: 2,
        stage: "Step 2: Dual Casters",
        title: "Mount Front and Rear Ball Casters",
        time: "15 mins",
        description: "Fasten the dual gliding metal ball rollers to the underside of the chassis.",
        whatToDo: "Attach one ball caster to the front center and one ball caster to the rear center.",
        howToDo: "Use M3 screws and nuts to fasten both caster housings into their dedicated holes. Ensure both steel balls roll smoothly in all directions.",
        whatYouSee: "The chassis balances evenly with two low-friction pivot points at front and back.",
        checkpoints: [
          "Check that both caster balls spin freely by hand without sticking",
          "Ensure mounting screws do not protrude above the top plate surface"
        ],
        tip: "Dual casters keep the narrow rover completely horizontal, preventing sensor tilt during sharp turns."
      },
      {
        stepNumber: 3,
        stage: "Step 3: Drive Motors",
        title: "Fasten TT Gear Motors to Chassis Underside",
        time: "20 mins",
        description: "Attach the two yellow drive motors using acrylic brackets and long M3 bolts.",
        whatToDo: "Mount the left and right DC gear motors symmetrically at the center of the chassis.",
        howToDo: "Thread M3 bolts through the clear brackets and motor gearboxes. Fasten lock nuts so the white axles point outward through the wheel cutouts.",
        whatYouSee: "Both motors are firmly secured, aligned directly across the chassis center of gravity.",
        checkpoints: [
          "Ensure motor axles spin freely without rubbing on the acrylic chassis edges",
          "Orient motor solder tabs facing inward toward the center"
        ],
        tip: "Positioning the drive motors near the center lets the robot perform zero-radius tank turns in place."
      },
      {
        stepNumber: 4,
        stage: "Step 4: Wheels",
        title: "Press-Fit High-Traction Rubber Wheels",
        time: "10 mins",
        description: "Attach the 65mm rubber grip wheels onto the flat-sided motor axles.",
        whatToDo: "Push both rubber wheels firmly onto the motor shafts.",
        howToDo: "Line up the double-flat hole in each wheel hub with the motor axle flat faces and press straight in.",
        whatYouSee: "The robot rests level on its 4-point stance: two drive wheels and two gliding casters.",
        checkpoints: [
          "Ensure rubber tires are seated squarely on the rims without wobbling",
          "Check that all 4 ground contact points touch a flat desk evenly"
        ],
        tip: "High-traction rubber wheels eliminate tire slippage on smooth floors, ensuring precise 90-degree turn angles."
      },
      {
        stepNumber: 5,
        stage: "Step 5: Ultrasonic Brackets",
        title: "Mount the 3 Ultrasonic Sensor Brackets",
        time: "20 mins",
        description: "Install the three acrylic mounting brackets that hold the sonar distance sensors.",
        whatToDo: "Fasten the Left, Center, and Right sensor brackets to the front nose of the robot.",
        howToDo: "Screw the center bracket pointing straight ahead (0°). Screw the left bracket angled outward (45° to 90° left) and the right bracket angled outward (45° to 90° right).",
        whatYouSee: "Three rigid bracket faces forming a 3-way sensor crown at the front of the robot.",
        checkpoints: [
          "Confirm each bracket is perpendicular to the baseplate and tightened securely",
          "Verify the twin circular sensor eye holes are aligned horizontally"
        ],
        tip: "Angled side brackets let the robot monitor side wall clearance while simultaneously checking for corridors ahead."
      },
      {
        stepNumber: 6,
        stage: "Step 6: Ultrasonic Sensors",
        title: "Insert HC-SR04 Sensors into Brackets",
        time: "15 mins",
        description: "Press the three ultrasonic sensors into the bracket cutouts.",
        whatToDo: "Install the Left, Center, and Right HC-SR04 sonar modules into their brackets.",
        howToDo: "Push the two metal transducer cylinders through the bracket holes until the circuit board sits flush against the back. Secure with a drop of adhesive or a zip tie.",
        whatYouSee: "Six metal sensor cylinders pointing left, forward, and right, ready to ping sound waves at maze walls.",
        checkpoints: [
          "Ensure sensor pins point upward for easy breadboard wire access",
          "Confirm no transducer face is blocked or covered"
        ],
        tip: "The metal cylinders are miniature speakers and microphones that calculate distance by timing sound echoes."
      },
      {
        stepNumber: 7,
        stage: "Step 7: Breadboard & Nano",
        title: "Mount Mini Breadboard and Arduino Nano",
        time: "15 mins",
        description: "Stick the solderless mini breadboard onto the top plate and insert the Arduino Nano controller.",
        whatToDo: "Peel adhesive backing from the mini breadboard, press it onto the chassis center, and plug in the Nano.",
        howToDo: "Center the breadboard on the chassis top deck. Straddle the Arduino Nano across the center divider trench of the breadboard and press down firmly until all pins seat.",
        whatYouSee: "The Arduino Nano sits securely plugged into the breadboard with its USB port facing rearward.",
        checkpoints: [
          "Ensure the Nano spans the center trench so left and right pins remain electrically isolated",
          "Verify the USB port is easily reachable by a programming cable"
        ],
        tip: "Plugging the Nano into a mini breadboard allows completely solderless, tool-free wiring changes."
      },
      {
        stepNumber: 8,
        stage: "Step 8: Driver & Battery",
        title: "Mount Motor Driver and Battery Holder",
        time: "20 mins",
        description: "Fasten the L298N motor driver and 2x 18650 battery case to the chassis.",
        whatToDo: "Install M3 standoffs for the L298N driver and screw down the battery box at the rear.",
        howToDo: "Mount the L298N driver behind the breadboard. Fasten the dual 18650 battery box with integrated switch at the rear top plate using countersunk screws.",
        whatYouSee: "All major mechanical and electrical modules are firmly fastened to the chassis deck.",
        checkpoints: [
          "Check that the battery box slide switch is easily accessible by hand",
          "Ensure driver heatsink has cool ventilation airflow"
        ],
        tip: "Mounting the battery at the rear balances the weight of the three front ultrasonic sensors."
      },
      {
        stepNumber: 9,
        stage: "Step 9: Motor Wiring",
        title: "Wire Traction Motors to Driver Terminals",
        time: "15 mins",
        description: "Connect the left and right motor wires to the high-power green screw terminals.",
        whatToDo: "Strip 5mm of motor wire insulation and clamp into terminals OUT1, OUT2, OUT3, and OUT4.",
        howToDo: "Left motor wires go to OUT1 & OUT2. Right motor wires go to OUT3 & OUT4. Tighten the screws with a small flathead screwdriver.",
        whatYouSee: "Both motor wire pairs are firmly clamped and do not slip under gentle tugging.",
        checkpoints: [
          "Verify the terminal screws clamp bare copper wire and not plastic insulation",
          "Check that no loose copper strands bridge adjacent terminals"
        ],
        tip: "Twist motor wire pairs together along their length to reduce electrical noise on sensor wires."
      },
      {
        stepNumber: 10,
        stage: "Step 10: Sensor Wiring",
        title: "Connect Ultrasonic Sonar Pins to Arduino Nano",
        time: "25 mins",
        description: "Wire the 4 pins (VCC, Trig, Echo, GND) of all three ultrasonic sensors to the Arduino Nano.",
        whatToDo: "Run DuPont jumper wires from the three sensors to the breadboard distribution rails and Nano pins.",
        howToDo: "Connect all three sensor VCC pins to the 5V rail and all three GND pins to the GND rail. Connect Left Sensor: Trig -> D2, Echo -> D3. Center Sensor: Trig -> D4, Echo -> D5. Right Sensor: Trig -> D6, Echo -> D7.",
        whatYouSee: "Neat, color-coded jumper bundles routing from the front sensor crown into the Arduino Nano.",
        checkpoints: [
          "Double-check Trig and Echo pin assignments for each of the three sensors",
          "Confirm common 5V and GND rail connections on the breadboard"
        ],
        tip: "Group sensor wires with small cable ties to keep the sensor sightlines completely unobstructed."
      },
      {
        stepNumber: 11,
        stage: "Step 11: Driver Signals & Power",
        title: "Wire Driver Direction Pins and Power Leads",
        time: "20 mins",
        description: "Connect Arduino control pins to driver inputs IN1–IN4 and distribute 7.4V battery power.",
        whatToDo: "Wire Nano pins D8, D9, D10, D11 to driver direction pins, and connect battery leads.",
        howToDo: "Connect Nano D8 -> IN1, D9 -> IN2, D10 -> IN3, D11 -> IN4. Connect battery red (+) through the switch to the driver '12V In' terminal. Connect driver '+5V Out' to the Nano 'VIN' pin. Connect battery negative, driver GND, and Nano GND together into a common ground rail.",
        whatYouSee: "All electronics share a single solid ground reference, and battery power flows cleanly through the switch.",
        checkpoints: [
          "CRITICAL: Connect battery (-), driver GND, and Nano GND together for common reference",
          "Verify driver 5V regulator jumper is installed to step down 7.4V to 5V"
        ],
        tip: "The onboard regulator on the L298N cleanly steps down the 7.4V battery voltage into safe 5V power for the Nano."
      },
      {
        stepNumber: 12,
        stage: "Step 12: Upload & Maze Run",
        title: "Upload Maze Solver Code and Test Navigation",
        time: "30 mins",
        description: "Upload the wall-follower algorithm via USB, place the robot in a test maze, and verify decisions.",
        whatToDo: "Connect the Nano to your computer, upload the sketch in Arduino IDE, and test hallway navigation.",
        howToDo: "Select 'Arduino Nano' and processor 'ATmega328P' in Arduino IDE, then click Upload. Set up cardboard corridors (approx. 25cm to 30cm wide). Place the robot inside, turn on the battery switch, and observe how it detects dead ends and steers into open paths.",
        whatYouSee: "The robot measures wall distances in real-time, avoids dead ends, and navigates smooth 90-degree corridor turns.",
        checkpoints: [
          "Verify front stopping: The robot should stop 15cm before hitting a dead-end wall",
          "Verify turning: The robot chooses whichever side corridor has greater open distance"
        ],
        tip: "Cardboard boxes make ideal modular maze walls for testing your robot's maze-solving algorithms!"
      }
    ],
    pinout: [
      { componentPin: "Left Sensor Trigger (Trig)", targetPin: "Arduino Nano D2", wireColor: "Yellow", type: "Digital", notes: "Sends 10us sound pulse from the left sensor" },
      { componentPin: "Left Sensor Echo", targetPin: "Arduino Nano D3", wireColor: "Green", type: "Digital", notes: "Listens for returning sound echo from left wall" },
      { componentPin: "Center Sensor Trigger (Trig)", targetPin: "Arduino Nano D4", wireColor: "Yellow", type: "Digital", notes: "Sends 10us sound pulse straight ahead" },
      { componentPin: "Center Sensor Echo", targetPin: "Arduino Nano D5", wireColor: "Green", type: "Digital", notes: "Listens for returning echo from obstacles ahead" },
      { componentPin: "Right Sensor Trigger (Trig)", targetPin: "Arduino Nano D6", wireColor: "Yellow", type: "Digital", notes: "Sends 10us sound pulse from the right sensor" },
      { componentPin: "Right Sensor Echo", targetPin: "Arduino Nano D7", wireColor: "Green", type: "Digital", notes: "Listens for returning sound echo from right wall" },
      { componentPin: "L298N IN1 (Left Forward)", targetPin: "Arduino Nano D8", wireColor: "Blue", type: "Digital", notes: "Drives left wheel forward" },
      { componentPin: "L298N IN2 (Left Reverse)", targetPin: "Arduino Nano D9", wireColor: "Purple", type: "Digital", notes: "Drives left wheel backward" },
      { componentPin: "L298N IN3 (Right Forward)", targetPin: "Arduino Nano D10", wireColor: "Blue", type: "Digital", notes: "Drives right wheel forward" },
      { componentPin: "L298N IN4 (Right Reverse)", targetPin: "Arduino Nano D11", wireColor: "Purple", type: "Digital", notes: "Drives right wheel backward" },
      { componentPin: "L298N 5V Out", targetPin: "Arduino Nano VIN", wireColor: "Red", type: "Power", notes: "Supplies regulated 5V power to the controller" },
      { componentPin: "System Ground", targetPin: "Arduino GND + Driver GND + Battery (-)", wireColor: "Black", type: "Ground", notes: "Common electrical return path for all circuits" }
    ],
    arduinoCode: `// =================================================================
// RoboNest Beginner Kit - RoboMaze_Ultrasonic_Solver.ino
// Controller: Arduino Nano (ATmega328P)
// What this program does:
// 1. Pings Left, Front, and Right ultrasonic sensors like a bat.
// 2. Calculates distances to maze walls in centimeters.
// 3. If front is open, drives straight forward smoothly.
// 4. If front is blocked, compares left and right wall distances.
// 5. Turns toward whichever side corridor has more open space.
// =================================================================

// --- Ultrasonic Sensor Pins ---
#define TRIG_LEFT    2
#define ECHO_LEFT    3
#define TRIG_FRONT   4
#define ECHO_FRONT   5
#define TRIG_RIGHT   6
#define ECHO_RIGHT   7

// --- Motor Driver Pins (L298N) ---
#define MOTOR_L_IN1  8   // Left forward
#define MOTOR_L_IN2  9   // Left reverse
#define MOTOR_R_IN3  10  // Right forward
#define MOTOR_R_IN4  11  // Right reverse

// Distance thresholds (in centimeters)
const int WALL_STOP_DIST = 15;  // Stop when front wall is closer than 15cm
const int SIDE_CLEARANCE = 10;  // Minimum clearance from side walls

void setup() {
  Serial.begin(9600);
  Serial.println("RoboNest RoboMaze Solver Initializing...");

  // Sensor Trigger pins are outputs (we send sound pulses)
  pinMode(TRIG_LEFT, OUTPUT);
  pinMode(TRIG_FRONT, OUTPUT);
  pinMode(TRIG_RIGHT, OUTPUT);

  // Sensor Echo pins are inputs (we listen for returning sound)
  pinMode(ECHO_LEFT, INPUT);
  pinMode(ECHO_FRONT, INPUT);
  pinMode(ECHO_RIGHT, INPUT);

  // Motor pins are outputs
  pinMode(MOTOR_L_IN1, OUTPUT);
  pinMode(MOTOR_L_IN2, OUTPUT);
  pinMode(MOTOR_R_IN3, OUTPUT);
  pinMode(MOTOR_R_IN4, OUTPUT);

  stopMotors();
  delay(1000);
}

void loop() {
  // Read distances to walls in all three directions (in cm)
  long distFront = readUltrasonicCM(TRIG_FRONT, ECHO_FRONT);
  long distLeft  = readUltrasonicCM(TRIG_LEFT, ECHO_LEFT);
  long distRight = readUltrasonicCM(TRIG_RIGHT, ECHO_RIGHT);

  Serial.print("Front: "); Serial.print(distFront);
  Serial.print("cm | Left: "); Serial.print(distLeft);
  Serial.print("cm | Right: "); Serial.print(distRight); Serial.println("cm");

  // Rule 1: Front corridor is open -> Drive straight forward!
  if (distFront > WALL_STOP_DIST) {
    // Slight steering corrections if drifting too close to a side wall
    if (distLeft < SIDE_CLEARANCE) {
      steerGentleRight();
    } else if (distRight < SIDE_CLEARANCE) {
      steerGentleLeft();
    } else {
      driveStraight();
    }
  }
  // Rule 2: Front is blocked! Choose between Left and Right corridors
  else {
    stopMotors();
    delay(200);

    // If left corridor is more open than right, turn left
    if (distLeft > distRight && distLeft > SIDE_CLEARANCE) {
      turnLeft90();
    }
    // If right corridor is more open, turn right
    else if (distRight > SIDE_CLEARANCE) {
      turnRight90();
    }
    // Dead-end! Turn around 180 degrees
    else {
      turnAround180();
    }
  }

  delay(30);
}

// Function that sends an ultrasonic sound pulse and measures return time
long readUltrasonicCM(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  // Read sound return travel time in microseconds (timeout 25ms = ~4 meters)
  long duration = pulseIn(echoPin, HIGH, 25000);
  if (duration == 0) return 300; // Open air fallback

  // Speed of sound is 343 m/s (29 microseconds per cm round trip)
  return duration / 58;
}

// --- Movement Functions ---

void driveStraight() {
  digitalWrite(MOTOR_L_IN1, HIGH);
  digitalWrite(MOTOR_L_IN2, LOW);
  digitalWrite(MOTOR_R_IN3, HIGH);
  digitalWrite(MOTOR_R_IN4, LOW);
}

void steerGentleRight() {
  digitalWrite(MOTOR_L_IN1, HIGH);
  digitalWrite(MOTOR_L_IN2, LOW);
  digitalWrite(MOTOR_R_IN3, LOW);
  digitalWrite(MOTOR_R_IN4, LOW);
}

void steerGentleLeft() {
  digitalWrite(MOTOR_L_IN1, LOW);
  digitalWrite(MOTOR_L_IN2, LOW);
  digitalWrite(MOTOR_R_IN3, HIGH);
  digitalWrite(MOTOR_R_IN4, LOW);
}

void turnLeft90() {
  digitalWrite(MOTOR_L_IN1, LOW);
  digitalWrite(MOTOR_L_IN2, HIGH);
  digitalWrite(MOTOR_R_IN3, HIGH);
  digitalWrite(MOTOR_R_IN4, LOW);
  delay(420); // Time required for 90-degree pivot turn
  stopMotors();
}

void turnRight90() {
  digitalWrite(MOTOR_L_IN1, HIGH);
  digitalWrite(MOTOR_L_IN2, LOW);
  digitalWrite(MOTOR_R_IN3, LOW);
  digitalWrite(MOTOR_R_IN4, HIGH);
  delay(420); // Time required for 90-degree pivot turn
  stopMotors();
}

void turnAround180() {
  digitalWrite(MOTOR_L_IN1, HIGH);
  digitalWrite(MOTOR_L_IN2, LOW);
  digitalWrite(MOTOR_R_IN3, LOW);
  digitalWrite(MOTOR_R_IN4, HIGH);
  delay(850); // Time required for 180-degree turnaround
  stopMotors();
}

void stopMotors() {
  digitalWrite(MOTOR_L_IN1, LOW);
  digitalWrite(MOTOR_L_IN2, LOW);
  digitalWrite(MOTOR_R_IN3, LOW);
  digitalWrite(MOTOR_R_IN4, LOW);
}`,
    faqs: [
      {
        q: "Why does the ultrasonic sensor sometimes give crazy high distance readings inside a maze?",
        a: "Ultrasonic sensors work by bouncing sound waves off hard, flat surfaces. If the maze wall is made of soft cloth or angled sharply, the sound wave bounces away instead of returning to the sensor microphone. Use rigid cardboard, plastic, or wooden walls for consistent sound reflection."
      },
      {
        q: "How do I make the robot turn exactly 90 degrees in my maze?",
        a: "In the code, find the turnLeft90() and turnRight90() functions. Adjust the delay time (currently set to 420 milliseconds). If the robot turns too far (more than 90°), reduce the delay to 380ms. If it doesn't turn far enough, increase it to 460ms."
      },
      {
        q: "Why do the three ultrasonic sensors trigger one after another rather than all at the same time?",
        a: "If all three sensors sent sound pulses at the exact same instant, the left sensor's microphone could accidentally hear the sound wave emitted by the center sensor, causing false distance readings. Reading each sensor sequentially prevents acoustic crosstalk."
      },
      {
        q: "What should I do if the robot clips a corner during a turn?",
        a: "Ensure the robot has come to a complete stop before starting the pivot turn. Increasing the WALL_STOP_DIST constant from 15cm to 18cm or 20cm gives the robot more turning clearance before reaching the wall."
      }
    ]
  },
  {
    slug: "smart-agro-rover",
    title: "Smart Agro Rover",
    badge: "AGRI-ROBOT",
    description: "A four-wheel field rover that drives between crop rows, pushes an N-P-K probe into the soil, logs nutrient readings with their GPS position and takes crop photos from a camera mast.",
    shortDescription: "A 4WD field rover that measures soil nutrients, logs where it took each reading, and photographs the crops.",
    howItWorks: "An Arduino Mega drives four geared motors through an L298N and watches the way ahead with two ultrasonic sensors. At each stop a servo lowers the N-P-K probe into the soil, the Mega reads nitrogen, phosphorus and potassium over RS485, tags the reading with the GPS position, and asks the ESP32-CAM on the mast to take a photo.",
    category: "IoT & Sensors",
    level: "Advanced",
    timeEstimate: "8 Hours",
    partsCount: 19,
    microcontroller: "Arduino Mega 2560 R3 (the control brain)",
    sensors: ["N-P-K Soil Nutrient Sensor (RS485)", "NEO-6M GPS Receiver", "ESP32-CAM Camera Module", "2x Ultrasonic Distance Sensors (obstacle detection)"],
    motorDriver: "L298N Dual Motor Driver (left and right motor pairs)",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    bom: [
      { id: "ag-mcu-01", name: "Arduino Mega 2560 R3", whatIsIt: "A large Arduino board with 54 digital pins and four hardware serial ports.", whyUsed: "The rover talks to three serial devices at once (GPS, the soil sensor and the camera), which needs the Mega's extra serial ports.", qty: 1, spec: "ATmega2560, 16 MHz, 5V logic, 4 hardware UARTs, VIN 7–12 V.", category: "Electronics", priceEst: "₹1,150", inStock: true, storesAvailable: 4, alternative: { name: "ESP32 DevKit", useCase: "You want Wi-Fi on the main board.", whyItWorks: "It also has spare UARTs, but runs at 3.3 V, so every 5 V sensor needs level shifting." } },
      { id: "ag-drv-01", name: "L298N Dual Motor Driver", whatIsIt: "A red board with a black heatsink that switches battery power to the motors.", whyUsed: "It drives the left motor pair and the right motor pair, with speed control on ENA/ENB.", qty: 1, spec: "Dual H-bridge, up to 2 A per channel, 5–35 V motor supply, onboard 5 V regulator.", category: "Electronics", priceEst: "₹160", inStock: true, storesAvailable: 4, alternative: { name: "TB6612FNG", useCase: "You want less heat and voltage loss.", whyItWorks: "A more efficient MOSFET driver with the same IN/PWM control style." } },
      { id: "ag-mot-01", name: "25GA370 12V DC Gear Motors (200 RPM)", whatIsIt: "Metal-gearbox DC motors with a 4 mm D-shaft.", whyUsed: "Four of them give the rover 4WD torque to climb over soil clods and furrows.", qty: 4, spec: "12 V, 200 RPM, metal gearbox, 4 mm D-shaft.", category: "Movement", priceEst: "₹420", inStock: true, storesAvailable: 3, alternative: null },
      { id: "ag-whl-01", name: "85mm Off-Road Rubber Wheels", whatIsIt: "Deep-tread rubber tyres on plastic rims with a 4 mm hex coupler.", whyUsed: "The deep tread grips loose soil and grass where smooth wheels would spin.", qty: 4, spec: "85 mm diameter, 35 mm wide, 4 mm coupler included.", category: "Movement", priceEst: "₹180", inStock: true, storesAvailable: 3, alternative: null },
      { id: "ag-brk-01", name: "Motor Mounting Brackets with Suspension", whatIsIt: "Metal L-brackets for 25 mm motors, with a small spring-damper.", whyUsed: "They hold each motor under the lower plate and let each wheel follow uneven ground.", qty: 4, spec: "25 mm motor clamp, M3 holes, 50 mm spring damper.", category: "Structure", priceEst: "₹120", inStock: true, storesAvailable: 2, alternative: { name: "Plain 25 mm motor brackets", useCase: "You will only drive on flat paths.", whyItWorks: "They hold the motors just as well; you only lose the suspension." } },
      { id: "ag-chs-01", name: "Two-Deck Round Carbon-Fibre Chassis Plates", whatIsIt: "A lower and an upper round carbon-fibre plate with pre-cut slots.", whyUsed: "The lower deck carries the drive electronics, the upper deck the Mega and battery.", qty: 1, spec: "2 × 220 mm round plates, 3 mm carbon fibre, pre-drilled for M3.", category: "Structure", priceEst: "₹1,200", inStock: true, storesAvailable: 2, alternative: { name: "4 mm acrylic plates", useCase: "You want a cheaper frame.", whyItWorks: "Same layout; acrylic is heavier and can crack on rough ground." } },
      { id: "ag-cov-01", name: "Transparent Protective Top Cover", whatIsIt: "A clear acrylic disc that closes the top of the rover.", whyUsed: "It keeps dust, dew and leaves off the Mega and the wiring while still showing the build.", qty: 1, spec: "220 mm clear acrylic, 3 mm, with a mast cut-out.", category: "Structure", priceEst: "₹250", inStock: true, storesAvailable: 2, alternative: null },
      { id: "ag-hw-01", name: "M3 Metal Standoffs & Fasteners Pack", whatIsIt: "Hex standoffs, screws and nuts.", whyUsed: "They stack the lower deck, upper deck and cover, and hold every board off the plates.", qty: 1, spec: "M3 × 40 mm and M3 × 10 mm standoffs, screws, nuts.", category: "Structure", priceEst: "₹180", inStock: true, storesAvailable: 4, alternative: null },
      { id: "ag-son-01", name: "HC-SR04 Ultrasonic Distance Sensors", whatIsIt: "Sound-echo distance sensors with two silver cylinders.", whyUsed: "Two of them look ahead-left and ahead-right on the front bracket so the rover stops before plants, stakes or people.", qty: 2, spec: "40 kHz, 2–400 cm, 5 V.", category: "Electronics", priceEst: "₹90", inStock: true, storesAvailable: 4, alternative: null },
      { id: "ag-npk-01", name: "RS485 N-P-K Soil Nutrient Sensor", whatIsIt: "A three-prong steel probe that measures nitrogen, phosphorus and potassium in the soil.", whyUsed: "It is the rover's main instrument: each stop gives one N-P-K reading of the soil.", qty: 1, spec: "RS485 Modbus RTU, 4800 baud, 9–24 V supply, readings in mg/kg.", category: "Electronics", priceEst: "₹3,200", inStock: true, storesAvailable: 2, alternative: { name: "Capacitive soil moisture sensor", useCase: "You only need to know if the soil is dry.", whyItWorks: "Much cheaper and reads with one analog pin, but gives moisture only, not nutrients." } },
      { id: "ag-485-01", name: "MAX485 TTL to RS485 Module", whatIsIt: "A tiny board that converts the Mega's serial signals to RS485.", whyUsed: "The N-P-K sensor talks RS485, which the Mega cannot read directly.", qty: 1, spec: "MAX485, 5 V, DE/RE direction control, A/B screw terminals.", category: "Electronics", priceEst: "₹60", inStock: true, storesAvailable: 4, alternative: null },
      { id: "ag-srv-01", name: "MG996R Servo with Rack Probe Actuator", whatIsIt: "A high-torque servo turning a pinion that slides a rack up and down a vertical rail.", whyUsed: "It pushes the N-P-K probe into the soil at each stop and lifts it before the rover drives on.", qty: 1, spec: "MG996R metal-gear servo, 10 kg·cm at 6 V; 60 mm rack travel.", category: "Movement", priceEst: "₹450", inStock: true, storesAvailable: 3, alternative: null },
      { id: "ag-gps-01", name: "NEO-6M GPS Module with Active Antenna", whatIsIt: "A GPS receiver with a puck antenna.", whyUsed: "It tags every soil reading and photo with the latitude and longitude where it was taken.", qty: 1, spec: "u-blox NEO-6M, 9600 baud UART, 3–5 V, active ceramic antenna.", category: "Electronics", priceEst: "₹420", inStock: true, storesAvailable: 4, alternative: null },
      { id: "ag-cam-01", name: "ESP32-CAM Camera Module (OV2640)", whatIsIt: "A small Wi-Fi board with a 2 MP camera and a micro-SD slot.", whyUsed: "Mounted on the mast, it photographs the crop at each stop and saves the picture to its SD card.", qty: 1, spec: "ESP32 + OV2640, 3.3 V logic, 5 V supply, micro-SD.", category: "Electronics", priceEst: "₹550", inStock: true, storesAvailable: 4, alternative: null },
      { id: "ag-mst-01", name: "Camera & GPS Mast Support", whatIsIt: "A short printed tower that lifts the camera and GPS antenna above the cover.", whyUsed: "Height gives the camera a view over the crop and the GPS antenna a clear sky.", qty: 1, spec: "120 mm printed PLA/PETG mast with M3 holes.", category: "Structure", priceEst: "₹150", inStock: true, storesAvailable: 2, alternative: null },
      { id: "ag-bat-01", name: "3S 11.1V 2200mAh Li-Po Battery (XT60)", whatIsIt: "A rechargeable lithium-polymer pack.", whyUsed: "It powers the motors directly, the Mega through VIN and everything else through the buck converter.", qty: 1, spec: "3S 11.1 V nominal (12.6 V full), 2200 mAh, 25C, XT60 plug.", category: "Power", priceEst: "₹1,450", inStock: true, storesAvailable: 3, alternative: null },
      { id: "ag-swt-01", name: "Toggle Switch with XT60 Battery Lead", whatIsIt: "A panel toggle switch wired into an XT60 lead.", whyUsed: "One flick cuts all power, so the rover can be stopped fast in the field.", qty: 1, spec: "15 A toggle, 14 AWG silicone lead, XT60 female.", category: "Power", priceEst: "₹90", inStock: true, storesAvailable: 3, alternative: null },
      { id: "ag-buck-01", name: "LM2596 Buck Converter (5V Power Distribution)", whatIsIt: "An adjustable step-down regulator.", whyUsed: "It turns the 11.1 V battery into a clean 5 V rail for the servo, sensors, GPS and camera.", qty: 1, spec: "LM2596, 4–35 V in, set to 5.0 V out, 3 A max.", category: "Power", priceEst: "₹120", inStock: true, storesAvailable: 4, alternative: null },
      { id: "ag-wir-01", name: "Jumper Wires & Silicone Power Wire Kit", whatIsIt: "DuPont jumpers for signals and thick silicone wire for power.", whyUsed: "Jumpers carry the signals to the Mega; the silicone wire carries motor and battery current.", qty: 1, spec: "40 × 20 cm DuPont jumpers, 2 m of 18 AWG red/black silicone wire.", category: "Structure", priceEst: "₹150", inStock: true, storesAvailable: 4, alternative: null },
    ],
    steps: [
      { stepNumber: 1, stage: "Step 1: Frame Prep", title: "Prepare the Two-Deck Chassis", time: "20 mins", description: "Lay out both carbon-fibre plates, the cover and the hardware pack.", whatToDo: "Check the lower plate, upper plate and clear cover, and sort the standoffs and screws.", howToDo: "Peel any film off the cover. Match the lower plate's motor-bracket holes to the bracket pattern, and check the mast cut-out in the cover lines up with the upper plate's centre slot.", whatYouSee: "Two round carbon plates and a clear disc, with M3 standoffs sorted by length.", checkpoints: ["No cracks or splits at the plate edges", "40 mm standoffs for the decks and 10 mm standoffs for the boards are sorted separately"], tip: "Carbon fibre dust is irritating: never sand the plates without a mask." },
      { stepNumber: 2, stage: "Step 2: Suspension", title: "Fit the Motor Brackets and Suspension", time: "25 mins", description: "Bolt the four suspension brackets under the lower plate.", whatToDo: "Fit one bracket at each corner of the lower plate.", howToDo: "Use M3 screws and lock nuts through the corner holes. Fit each spring-damper between the bracket arm and the plate tab, with the motor clamp hanging below.", whatYouSee: "Four metal brackets under the plate, each able to rock a little against its spring.", checkpoints: ["Each bracket swings and springs back freely", "All four clamps are at the same height"], tip: "Fit all four springs the same way round so the rover sits level." },
      { stepNumber: 3, stage: "Step 3: Drive Motors", title: "Mount the Four DC Gear Motors", time: "25 mins", description: "Clamp a 25GA370 gear motor into each bracket.", whatToDo: "Slide each motor into its clamp with the shaft pointing outward.", howToDo: "Tighten the clamp screws evenly. Route each motor's two wires inward toward the centre slot of the lower plate.", whatYouSee: "Four metal gear motors under the lower plate, shafts pointing out to the sides.", checkpoints: ["All four shafts point straight out, square to the plate", "Motor wires reach the centre slot without strain"], tip: "Label the wires FL, FR, RL, RR now: it saves guesswork when wiring the driver." },
      { stepNumber: 4, stage: "Step 4: Wheels", title: "Attach the Off-Road Wheels", time: "15 mins", description: "Fit the four 85 mm off-road wheels.", whatToDo: "Fit a hex coupler to each shaft, then push a wheel onto each coupler.", howToDo: "Tighten each coupler's grub screw on the flat of the D-shaft, then fix the wheel with its centre screw.", whatYouSee: "The rover stands on four chunky wheels with the lower plate clear of the ground.", checkpoints: ["No wheel wobbles when spun by hand", "All four tyres touch a flat floor"], tip: "Put a drop of thread-lock on the grub screws: field vibration loosens them." },
      { stepNumber: 5, stage: "Step 5: Lower Deck", title: "Mount the Driver, Buck Converter and MAX485", time: "20 mins", description: "Fit the drive electronics on the lower deck.", whatToDo: "Mount the L298N in the middle, the LM2596 buck converter on the right and the MAX485 module on the left.", howToDo: "Use 10 mm standoffs under each board. Before mounting the buck converter, power it from the battery and turn its trimmer until the output reads 5.0 V on a multimeter.", whatYouSee: "Three boards on the lower deck: red driver in the middle, blue buck converter and small MAX485 either side.", checkpoints: ["Buck converter output set to 5.0 V before anything is connected to it", "Driver heatsink has air around it"], tip: "Setting the buck to 5.0 V first is essential: out of the box it can output far more and destroy the 5 V parts." },
      { stepNumber: 6, stage: "Step 6: Motor Wiring", title: "Wire the Motors to the L298N", time: "25 mins", description: "Connect the left motor pair and the right motor pair to the driver outputs.", whatToDo: "Join the two left motors in parallel to OUT1/OUT2 and the two right motors to OUT3/OUT4.", howToDo: "Twist each pair's matching wires together (red with red, black with black) and clamp them in the driver's screw terminals. Clamp bare copper, not insulation.", whatYouSee: "Four motor wires from each side meeting at the driver's side terminals.", checkpoints: ["The front and rear motor on each side are wired the same way round", "No loose strands touch the next terminal"], tip: "If one wheel later spins the wrong way, swap only that motor's two wires." },
      { stepNumber: 7, stage: "Step 7: Front Sensors", title: "Fit the Front Ultrasonic Sensors", time: "15 mins", description: "Mount the two HC-SR04 sensors on the front bracket.", whatToDo: "Fit the front bracket to the lower plate's nose, then clip the two sensors into it.", howToDo: "Screw the bracket to the front holes. Angle the left sensor a little left and the right one a little right, cylinders facing forward.", whatYouSee: "Two pairs of silver 'eyes' at the front of the rover, just above the wheels.", checkpoints: ["Nothing blocks the cylinders", "The pins point up so the wires can reach them"], tip: "Mount them high enough that they don't see the ground or the tops of short grass as an obstacle." },
      { stepNumber: 8, stage: "Step 8: Probe Actuator", title: "Build the N-P-K Probe Actuator", time: "30 mins", description: "Assemble the servo, rack and N-P-K probe on the side rail.", whatToDo: "Fix the rail to the right side of the lower plate, fit the MG996R at its top and clamp the N-P-K sensor to the rack.", howToDo: "Bolt the rail upright. Mount the servo with its pinion meshing the rack, then clamp the sensor body to the bottom of the rack with the three prongs pointing down.", whatYouSee: "A vertical rail on the rover's side with the probe hanging above the ground.", checkpoints: ["The rack slides its full travel without catching", "With the rack fully down the prongs reach about 4 cm into the ground"], tip: "Centre the servo (90°) before fitting the pinion so the full travel is available both ways." },
      { stepNumber: 9, stage: "Step 9: Upper Deck", title: "Stack the Upper Deck with the Mega and Battery", time: "25 mins", description: "Fit the upper plate and mount the Arduino Mega, the battery and the toggle switch.", whatToDo: "Screw the 40 mm standoffs onto the lower plate, fit the upper plate, then mount the Mega in the centre and the battery at the rear.", howToDo: "Pass the driver, MAX485 and sensor wires up through the centre slot before fitting the upper plate. Mount the Mega on 10 mm standoffs and strap the battery down with a Velcro strap. Fit the toggle switch on the right edge.", whatYouSee: "Two decks, the blue Mega in the middle of the top deck, the battery behind it and the switch at the side.", checkpoints: ["All wires from below come up through the slot without pinching", "The battery strap is tight"], tip: "Keep the battery at the rear to balance the weight of the probe actuator." },
      { stepNumber: 10, stage: "Step 10: Signal Wiring", title: "Wire the Signals to the Arduino Mega", time: "40 mins", description: "Connect the driver, sensors, MAX485 and servo to the Mega.", whatToDo: "Wire every signal in the pin table: driver ENA/IN1–IN4/ENB, both sonars, the MAX485 and the servo.", howToDo: "Use jumper wires: ENA → D5, IN1 → D8, IN2 → D9, IN3 → D10, IN4 → D11, ENB → D6; left sonar Trig/Echo → D22/D23, right sonar → D24/D25; MAX485 RO → RX2 (D17), DI → TX2 (D16), DE + RE → D4; servo signal → D3. Power the sonars, MAX485 and servo from the buck converter's 5 V rail.", whatYouSee: "A neat fan of coloured jumpers from the Mega's pin headers down to each module.", checkpoints: ["Remove the L298N's ENA/ENB jumper caps so D5/D6 control speed", "MAX485 A and B go to the N-P-K sensor's yellow (A) and blue (B) wires"], tip: "Tie the sensor wires into a bundle and keep them away from the motor wires to avoid noise." },
      { stepNumber: 11, stage: "Step 11: Power Wiring", title: "Wire the Battery, Switch and Common Ground", time: "25 mins", description: "Connect switched battery power to the driver, the Mega, the buck converter and the N-P-K sensor.", whatToDo: "Run the switched battery + to the L298N 12V input, the Mega's VIN, the buck converter's IN+ and the N-P-K sensor's brown wire. Join every ground together.", howToDo: "Use silicone wire for battery current. Join the battery (−), driver GND, buck GND, Mega GND and the sensor's black wire on one ground point.", whatYouSee: "A short red and black power harness from the switch to each board.", checkpoints: ["Switch OFF and battery unplugged while wiring", "One common ground joins every board"], tip: "A shared ground is critical: without it the Mega's signals mean nothing to the driver and the MAX485." },
      { stepNumber: 12, stage: "Step 12: Mast & Cover", title: "Mount the Mast, GPS and Camera, Then the Cover", time: "30 mins", description: "Fit the mast with the GPS antenna on top and the ESP32-CAM facing forward, then close the cover.", whatToDo: "Bolt the mast to the upper plate through the cover's cut-out, mount the GPS puck on top and the ESP32-CAM below it facing forward.", howToDo: "Wire the GPS TX → Mega RX1 (D19) and RX → TX1 (D18); the ESP32-CAM U0T → RX3 (D15) and U0R → TX3 (D14) through a 1 kΩ/2 kΩ divider. Power both from the 5 V rail. Fit the cover on its standoffs last.", whatYouSee: "A camera and GPS antenna standing above the clear cover, like the rover's head.", checkpoints: ["The GPS antenna faces the sky with nothing metal above it", "The ESP32-CAM's RX has the voltage divider"], tip: "The first GPS fix outdoors can take a few minutes: leave the rover still under open sky." },
      { stepNumber: 13, stage: "Step 13: Program & Field Test", title: "Upload the Code and Test in the Field", time: "45 mins", description: "Upload the rover program and run a sampling route.", whatToDo: "Upload the sketch to the Mega, then test driving, obstacle stops, probe sampling and GPS logging.", howToDo: "Install the TinyGPSPlus and Servo libraries, upload with the battery switch OFF, then switch on. Open the Serial Monitor at 115200 baud and watch for N-P-K readings with GPS positions at each stop.", whatYouSee: "The rover drives, stops, lowers its probe and prints a line like 'N 42  P 18  K 120 mg/kg @ 28.61234, 77.20912'.", checkpoints: ["Readings change when the probe is in moist soil", "The rover stops before an obstacle about 30 cm ahead"], tip: "N-P-K sensors need moist soil: in dry ground they read near zero. Water a test patch first." },
    ],
    pinout: [
      { componentPin: "L298N ENA (Left Speed)", targetPin: "Mega D5 (PWM)", wireColor: "White", type: "PWM", notes: "Speed of the left motor pair. Remove the ENA jumper cap." },
      { componentPin: "L298N IN1", targetPin: "Mega D8", wireColor: "Blue", type: "Digital", notes: "Left pair forward" },
      { componentPin: "L298N IN2", targetPin: "Mega D9", wireColor: "Purple", type: "Digital", notes: "Left pair backward" },
      { componentPin: "L298N IN3", targetPin: "Mega D10", wireColor: "Orange", type: "Digital", notes: "Right pair forward" },
      { componentPin: "L298N IN4", targetPin: "Mega D11", wireColor: "Brown", type: "Digital", notes: "Right pair backward" },
      { componentPin: "L298N ENB (Right Speed)", targetPin: "Mega D6 (PWM)", wireColor: "Gray", type: "PWM", notes: "Speed of the right motor pair. Remove the ENB jumper cap." },
      { componentPin: "Left Sonar Trig", targetPin: "Mega D22", wireColor: "Yellow", type: "Digital", notes: "Sends the left sensor's sound pulse" },
      { componentPin: "Left Sonar Echo", targetPin: "Mega D23", wireColor: "Green", type: "Digital", notes: "Times the left sensor's echo" },
      { componentPin: "Right Sonar Trig", targetPin: "Mega D24", wireColor: "Yellow", type: "Digital", notes: "Sends the right sensor's sound pulse" },
      { componentPin: "Right Sonar Echo", targetPin: "Mega D25", wireColor: "Green", type: "Digital", notes: "Times the right sensor's echo" },
      { componentPin: "GPS TX", targetPin: "Mega RX1 (D19)", wireColor: "Yellow", type: "Digital", notes: "Position data from the GPS at 9600 baud" },
      { componentPin: "GPS RX", targetPin: "Mega TX1 (D18)", wireColor: "Blue", type: "Digital", notes: "Optional: configuration commands to the GPS" },
      { componentPin: "MAX485 RO", targetPin: "Mega RX2 (D17)", wireColor: "Green", type: "Digital", notes: "Soil readings coming back from the N-P-K sensor" },
      { componentPin: "MAX485 DI", targetPin: "Mega TX2 (D16)", wireColor: "White", type: "Digital", notes: "Read requests going out to the N-P-K sensor" },
      { componentPin: "MAX485 DE + RE", targetPin: "Mega D4", wireColor: "Orange", type: "Digital", notes: "HIGH to send, LOW to listen (both pins joined)" },
      { componentPin: "ESP32-CAM U0T", targetPin: "Mega RX3 (D15)", wireColor: "Yellow", type: "Digital", notes: "Photo confirmations from the camera" },
      { componentPin: "ESP32-CAM U0R", targetPin: "Mega TX3 (D14)", wireColor: "Blue", type: "Digital", notes: "Photo commands to the camera, through a 1 kΩ/2 kΩ voltage divider (the ESP32 is 3.3 V)" },
      { componentPin: "Probe Servo Signal", targetPin: "Mega D3 (PWM)", wireColor: "Orange", type: "PWM", notes: "Lowers and lifts the N-P-K probe" },
      { componentPin: "Li-Po Battery + (via switch)", targetPin: "Mega VIN", wireColor: "Red", type: "Power", notes: "11.1 V into the Mega's own regulator" },
      { componentPin: "L298N 12V In", targetPin: "Battery + (via switch)", wireColor: "Red", type: "Power", notes: "Switched battery power for the motors" },
      { componentPin: "System Ground", targetPin: "Mega GND + Driver GND + Buck GND + Battery (-)", wireColor: "Black", type: "Ground", notes: "One common ground for every board" },
    ],
    arduinoCode: `// =================================================================
// Smart Agro Rover — Arduino Mega 2560
// Drives a sampling route, avoids obstacles, lowers an N-P-K probe
// at each stop, tags the reading with GPS and triggers a crop photo.
// Libraries: TinyGPSPlus, Servo
// =================================================================
#include <TinyGPSPlus.h>
#include <Servo.h>

// ---------- Motor driver (L298N) ----------
const int ENA = 5, IN1 = 8, IN2 = 9;     // left motor pair
const int ENB = 6, IN3 = 10, IN4 = 11;   // right motor pair
const int DRIVE_SPEED = 170;             // 0-255

// ---------- Front ultrasonic sensors ----------
const int TRIG_L = 22, ECHO_L = 23;
const int TRIG_R = 24, ECHO_R = 25;
const int STOP_DIST_CM = 30;

// ---------- N-P-K sensor over RS485 (MAX485 on Serial2) ----------
const int RS485_DIR = 4;                 // DE + RE joined
const byte REQ_N[] = {0x01, 0x03, 0x00, 0x1E, 0x00, 0x01, 0xE4, 0x0C};
const byte REQ_P[] = {0x01, 0x03, 0x00, 0x1F, 0x00, 0x01, 0xB5, 0xCC};
const byte REQ_K[] = {0x01, 0x03, 0x00, 0x20, 0x00, 0x01, 0x85, 0xC0};

// ---------- Probe actuator ----------
const int PROBE_SERVO = 3;
const int PROBE_UP = 20, PROBE_DOWN = 160;   // servo angles
Servo probe;

// ---------- Route ----------
const unsigned long LEG_MS = 4000;       // drive time between stops
TinyGPSPlus gps;

void setup() {
  Serial.begin(115200);                  // to the computer
  Serial1.begin(9600);                   // GPS
  Serial2.begin(4800);                   // N-P-K sensor
  Serial3.begin(115200);                 // ESP32-CAM

  int outs[] = {ENA, IN1, IN2, ENB, IN3, IN4, TRIG_L, TRIG_R, RS485_DIR};
  for (int p : outs) pinMode(p, OUTPUT);
  pinMode(ECHO_L, INPUT);
  pinMode(ECHO_R, INPUT);
  digitalWrite(RS485_DIR, LOW);          // listen by default

  probe.attach(PROBE_SERVO);
  probe.write(PROBE_UP);
  stopMotors();
  Serial.println("Smart Agro Rover ready");
}

void loop() {
  unsigned long legStart = millis();
  while (millis() - legStart < LEG_MS) {
    feedGps();
    if (min(readCm(TRIG_L, ECHO_L), readCm(TRIG_R, ECHO_R)) < STOP_DIST_CM) {
      stopMotors();
      delay(300);
      turnAway();
    } else {
      drive(DRIVE_SPEED, DRIVE_SPEED);
    }
  }
  stopMotors();
  takeSample();
}

// ---------- Driving ----------
void drive(int left, int right) {
  digitalWrite(IN1, left >= 0);  digitalWrite(IN2, left < 0);
  digitalWrite(IN3, right >= 0); digitalWrite(IN4, right < 0);
  analogWrite(ENA, abs(left));
  analogWrite(ENB, abs(right));
}

void stopMotors() { drive(0, 0); }

void turnAway() {
  // turn toward the side with more room
  bool leftClear = readCm(TRIG_L, ECHO_L) > readCm(TRIG_R, ECHO_R);
  if (leftClear) drive(-DRIVE_SPEED, DRIVE_SPEED);
  else drive(DRIVE_SPEED, -DRIVE_SPEED);
  delay(450);
  stopMotors();
}

long readCm(int trig, int echo) {
  digitalWrite(trig, LOW);  delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long us = pulseIn(echo, HIGH, 25000);  // time out after ~4 m
  return us == 0 ? 400 : us / 58;
}

// ---------- Sampling ----------
void takeSample() {
  probe.write(PROBE_DOWN);               // push the probe into the soil
  delay(2500);                           // let the reading settle
  int n = readNpk(REQ_N);
  int p = readNpk(REQ_P);
  int k = readNpk(REQ_K);
  probe.write(PROBE_UP);

  Serial3.println("SNAP");               // ask the ESP32-CAM for a photo
  delay(800);

  feedGps();
  Serial.print("N "); Serial.print(n);
  Serial.print("  P "); Serial.print(p);
  Serial.print("  K "); Serial.print(k);
  Serial.print(" mg/kg @ ");
  if (gps.location.isValid()) {
    Serial.print(gps.location.lat(), 5); Serial.print(", ");
    Serial.println(gps.location.lng(), 5);
  } else {
    Serial.println("no GPS fix yet");
  }
}

int readNpk(const byte *request) {
  while (Serial2.available()) Serial2.read();   // clear old bytes
  digitalWrite(RS485_DIR, HIGH);
  Serial2.write(request, 8);
  Serial2.flush();
  digitalWrite(RS485_DIR, LOW);

  byte reply[7];
  unsigned long start = millis();
  int got = 0;
  while (got < 7 && millis() - start < 500) {
    if (Serial2.available()) reply[got++] = Serial2.read();
  }
  if (got < 7) return -1;                // no answer: check A/B and 12 V
  return (reply[3] << 8) | reply[4];
}

void feedGps() {
  while (Serial1.available()) gps.encode(Serial1.read());
}`,
    faqs: [
      { q: "Why does the rover use an Arduino Mega instead of an Uno?", a: "It needs three serial ports at once: GPS on Serial1, the N-P-K sensor on Serial2 and the camera on Serial3. The Uno has only one hardware serial port, which is also used for uploading." },
      { q: "The N-P-K readings are all -1. What is wrong?", a: "-1 means the sensor did not answer. Check that the sensor's brown wire has switched battery power (it needs 9–24 V), that its yellow wire goes to MAX485 A and blue to B, and that DE and RE are joined and wired to D4." },
      { q: "The readings are close to zero even in the garden.", a: "N-P-K probes only read reliably in moist soil. Water a patch before testing and push the probe fully in so all three prongs are buried." },
      { q: "The GPS never gets a fix.", a: "GPS needs open sky. Indoors or next to buildings it may never lock. Leave the rover still outside for 2–5 minutes the first time, with nothing metal over the antenna." },
      { q: "How does the ESP32-CAM save the photos?", a: "The Mega only sends the word SNAP over Serial3. The ESP32-CAM needs its own small sketch (flashed separately) that listens for SNAP, takes a photo and saves it to its micro-SD card." },
    ],
  },
  {
    slug: "balancebot-pro",
    title: "BalanceBot Pro",
    badge: "SELF-BALANCING",
    description: "A two-wheeled robot that balances upright on its own, just like a person balancing a broom on their hand.",
    shortDescription: "A two-wheeled, four-deck robot that keeps itself upright with a gyro, wheel encoders and a PID controller, and drives where you steer it from your phone.",
    howItWorks: "An MPU6050 gyro-accelerometer measures which way the robot is leaning, hundreds of times a second. A PID controller on the Arduino Uno turns that tilt into motor commands, driving the wheels under the robot to catch it. Wheel encoders stop it drifting away, and an HC-05 Bluetooth link lets you steer it from a phone.",
    category: "Autonomous Rovers",
    level: "Intermediate",
    timeEstimate: "5.5 Hours",
    partsCount: 15,
    microcontroller: "Arduino Uno R3",
    sensors: ["MPU6050 Gyro + Accelerometer (senses which way the robot leans)", "Hall Wheel Encoders (measure wheel speed)", "ESP32-CAM Camera (FPV view)"],
    motorDriver: "TB6612FNG Dual Motor Driver",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80",
    bom: [
      { id: "bb-mcu-01", name: "Arduino Uno R3", whatIsIt: "The robot's small computer board.", whyUsed: "It runs the balancing loop: reads the tilt, works out the PID correction and drives the motors about 200 times a second.", qty: 1, spec: "ATmega328P, 16 MHz, 5 V logic, interrupts on D2 and D3.", category: "Electronics", priceEst: "₹650", inStock: true, storesAvailable: 4, alternative: { name: "Arduino Nano", useCase: "You want a smaller board.", whyItWorks: "Same chip and pins, including the D2/D3 interrupts the encoders need." } },
      { id: "bb-imu-01", name: "MPU6050 Gyro + Accelerometer (IMU)", whatIsIt: "A tiny board with a 3-axis gyroscope and a 3-axis accelerometer.", whyUsed: "It tells the robot exactly how far and how fast it is tipping, the single most important number for balancing.", qty: 1, spec: "MPU6050 on a GY-521 board, I²C at address 0x68, 3.3–5 V.", category: "Electronics", priceEst: "₹150", inStock: true, storesAvailable: 4, alternative: { name: "MPU9250", useCase: "You also want a compass.", whyItWorks: "Same gyro and accelerometer readings over I²C, plus a magnetometer." } },
      { id: "bb-drv-01", name: "TB6612FNG Dual Motor Driver", whatIsIt: "A small, efficient H-bridge board for two DC motors.", whyUsed: "It switches the battery to the motors fast and with little voltage loss, so the motors react instantly to each correction.", qty: 1, spec: "1.2 A per channel (3.2 A peak), VM up to 15 V, PWM up to 100 kHz, STBY pin.", category: "Electronics", priceEst: "₹250", inStock: true, storesAvailable: 4, alternative: { name: "L298N", useCase: "You already have one.", whyItWorks: "It works, but drops about 2 V and reacts more slowly, so balancing is less crisp." } },
      { id: "bb-mot-01", name: "JGB37-520 12V Gear Motors with Hall Encoders", whatIsIt: "Metal-gearbox DC motors with a magnetic encoder disc on the back.", whyUsed: "High torque catches the robot quickly; the encoders count wheel turns so the robot can hold its position.", qty: 2, spec: "12 V, 330 RPM, 6 mm D-shaft, 11-pulse Hall encoder (A/B outputs), 5 V encoder supply.", category: "Movement", priceEst: "₹850", inStock: true, storesAvailable: 3, alternative: null },
      { id: "bb-brk-01", name: "37mm Motor Mounting Brackets", whatIsIt: "L-shaped metal brackets sized for 37 mm gear motors.", whyUsed: "They bolt each motor firmly under the base plate so the wheels can't flex under load.", qty: 2, spec: "37 mm motor face, M3 holes, with screws.", category: "Structure", priceEst: "₹120", inStock: true, storesAvailable: 3, alternative: null },
      { id: "bb-whl-01", name: "85mm High-Traction Rubber Wheels with 6mm Couplings", whatIsIt: "Rubber-tyred wheels with a metal hub and a coupling for 6 mm shafts.", whyUsed: "Soft rubber grips the floor so the wheels never slip when the robot catches itself.", qty: 2, spec: "85 mm diameter, 6 mm hex coupling with grub screws.", category: "Movement", priceEst: "₹220", inStock: true, storesAvailable: 3, alternative: null },
      { id: "bb-chs-01", name: "Four-Deck Round Carbon-Fibre Chassis Plates", whatIsIt: "Four round plates: base, intermediate, middle and top.", whyUsed: "Stacking the parts in decks puts the heavy battery low and the IMU near the middle, which makes balancing easier to tune.", qty: 1, spec: "4 × 160 mm round plates, 3 mm carbon fibre, pre-drilled for M3.", category: "Structure", priceEst: "₹1,400", inStock: true, storesAvailable: 2, alternative: { name: "4 mm acrylic plates", useCase: "You want a cheaper frame.", whyItWorks: "Same layout; slightly heavier and less stiff." } },
      { id: "bb-hw-01", name: "M3 Brass Standoffs & Fasteners Pack", whatIsIt: "Hex standoffs, screws and nuts.", whyUsed: "They stack the four decks and hold the boards off the plates.", qty: 1, spec: "M3 × 45 mm deck standoffs, M3 × 10 mm board standoffs, screws and nuts.", category: "Structure", priceEst: "₹180", inStock: true, storesAvailable: 4, alternative: null },
      { id: "bb-bat-01", name: "3S 11.1V 1500mAh Li-Po Battery (XT60)", whatIsIt: "A rechargeable lithium-polymer pack.", whyUsed: "It powers the motors through the driver and the Arduino through VIN; mounted on the base deck, its weight keeps the robot's centre low.", qty: 1, spec: "3S 11.1 V nominal (12.6 V full), 1500 mAh, 25C, XT60.", category: "Power", priceEst: "₹1,200", inStock: true, storesAvailable: 3, alternative: null },
      { id: "bb-swt-01", name: "Toggle Switch with XT60 Battery Lead", whatIsIt: "A panel toggle switch wired into an XT60 lead.", whyUsed: "One flick cuts all power when the robot falls or runs off.", qty: 1, spec: "15 A toggle, 16 AWG silicone lead, XT60 female.", category: "Power", priceEst: "₹90", inStock: true, storesAvailable: 3, alternative: null },
      { id: "bb-buck-01", name: "LM2596 Buck Converter (5V Power Distribution)", whatIsIt: "An adjustable step-down regulator.", whyUsed: "It makes a separate 5 V supply for the camera, so its Wi-Fi bursts don't disturb the Arduino.", qty: 1, spec: "LM2596, 4–35 V in, set to 5.0 V out, 3 A max.", category: "Power", priceEst: "₹120", inStock: true, storesAvailable: 4, alternative: null },
      { id: "bb-bt-01", name: "HC-05 Bluetooth Module", whatIsIt: "A Bluetooth serial module with a small antenna.", whyUsed: "It receives forward, back and turn commands from a phone app so you can drive the robot while it balances.", qty: 1, spec: "Bluetooth 2.0 SPP, 9600 baud, 3.3 V logic on RX, 5 V supply.", category: "Electronics", priceEst: "₹280", inStock: true, storesAvailable: 4, alternative: null },
      { id: "bb-cam-01", name: "ESP32-CAM Camera Module (FPV)", whatIsIt: "A small Wi-Fi board with a 2 MP camera.", whyUsed: "It streams a first-person view from the top plate to your phone or laptop over Wi-Fi.", qty: 1, spec: "ESP32 + OV2640, 5 V supply, runs its own streaming sketch.", category: "Electronics", priceEst: "₹550", inStock: true, storesAvailable: 4, alternative: null },
      { id: "bb-mst-01", name: "Printed Camera Mount", whatIsIt: "A small printed bracket that holds the camera upright.", whyUsed: "It points the camera forward from the top plate.", qty: 1, spec: "PLA/PETG, M3 holes.", category: "Structure", priceEst: "₹100", inStock: true, storesAvailable: 2, alternative: null },
      { id: "bb-wir-01", name: "Jumper Wires & Silicone Power Wire Kit", whatIsIt: "DuPont jumpers for signals and silicone wire for power.", whyUsed: "Jumpers carry the IMU, encoder and driver signals; silicone wire carries the battery and motor current.", qty: 1, spec: "40 × 20 cm DuPont jumpers, 1 m of 18 AWG red/black silicone wire.", category: "Structure", priceEst: "₹150", inStock: true, storesAvailable: 4, alternative: null },
    ],
    steps: [
      { stepNumber: 1, stage: "Step 1: Frame Prep", title: "Prepare the Four-Deck Chassis", time: "15 mins", description: "Lay out the four carbon plates and sort the standoffs.", whatToDo: "Identify the base, intermediate, middle and top plates and sort the 45 mm and 10 mm standoffs.", howToDo: "The base plate has the two motor-bracket slots; the top plate has the camera cut-out. Check every plate has its six pillar holes lined up.", whatYouSee: "Four round carbon plates stacked loosely in order, with the hardware sorted.", checkpoints: ["All six pillar holes line up through all four plates", "Long and short standoffs are sorted"], tip: "Never sand carbon fibre without a mask." },
      { stepNumber: 2, stage: "Step 2: Motor Brackets", title: "Mount the Motor Brackets on the Base Plate", time: "15 mins", description: "Bolt the two 37 mm brackets under the base plate.", whatToDo: "Fit one bracket on each side of the base plate, motor faces pointing outward.", howToDo: "Use M3 screws and nuts through the bracket slots. Both brackets must sit on the same line through the plate's centre.", whatYouSee: "Two metal brackets hanging under the base plate, facing left and right.", checkpoints: ["Both brackets are on one straight line through the centre", "Screws are tight"], tip: "The wheels must be exactly opposite each other, or the robot will turn as it balances." },
      { stepNumber: 3, stage: "Step 3: Encoder Motors", title: "Fit the Encoder Gear Motors", time: "20 mins", description: "Screw a JGB37-520 motor into each bracket.", whatToDo: "Fit each motor with its shaft through the bracket and its encoder board facing the centre.", howToDo: "Use the M3 screws supplied with the motors through the bracket face. Route each motor's 6-wire encoder cable inward.", whatYouSee: "Two metal gear motors under the base plate, shafts pointing out to the sides.", checkpoints: ["Both shafts are at the same height", "Encoder cables reach the centre without strain"], tip: "Note which motor is left and which is right on its cable before wiring." },
      { stepNumber: 4, stage: "Step 4: Wheels", title: "Attach the Wheels with Their Couplings", time: "10 mins", description: "Fit the 6 mm couplings and the 85 mm wheels.", whatToDo: "Fix a coupling on each motor shaft, then bolt a wheel to each coupling.", howToDo: "Tighten each coupling's grub screws on the flat of the D-shaft, then fix the wheel to the coupling with its screws.", whatYouSee: "The chassis stands on two wheels (it falls over until it's switched on).", checkpoints: ["No wheel wobbles when spun", "Both wheels touch the floor at the same time"], tip: "Thread-lock the grub screws: balancing makes the motors reverse hundreds of times a minute." },
      { stepNumber: 5, stage: "Step 5: Battery Deck", title: "Fit the Battery on the Base Deck", time: "15 mins", description: "Strap the Li-Po to the base plate and fit the intermediate plate above it.", whatToDo: "Strap the battery to the middle of the base plate, then screw on the first set of standoffs and the intermediate plate.", howToDo: "Use a Velcro strap through the base plate slots. Pass the battery lead and both motor cables up through the intermediate plate's slot before fitting it.", whatYouSee: "The battery sits low between the base and intermediate plates.", checkpoints: ["The battery is centred left-to-right", "Battery lead and motor cables come up through the slot"], tip: "A low, centred battery makes the robot much easier to balance." },
      { stepNumber: 6, stage: "Step 6: Driver Deck", title: "Mount the Motor Driver and Buck Converter", time: "20 mins", description: "Fit the TB6612FNG and the LM2596 on the intermediate deck.", whatToDo: "Mount the motor driver in the centre and the buck converter at the side.", howToDo: "Use 10 mm standoffs. Before mounting the buck converter, power it from the battery and set its output to 5.0 V with a multimeter.", whatYouSee: "The small driver board in the middle of the deck and the blue buck converter beside it.", checkpoints: ["Buck converter output set to 5.0 V", "Driver pins are reachable from above"], tip: "Set the buck to 5.0 V before connecting anything: out of the box it can put out far more." },
      { stepNumber: 7, stage: "Step 7: Motor Wiring", title: "Wire the Motors to the Driver", time: "15 mins", description: "Connect each motor's power pair to the TB6612FNG outputs.", whatToDo: "Left motor M1/M2 to A01/A02, right motor M1/M2 to B01/B02.", howToDo: "Use the red and white motor-power wires from each encoder cable. Keep the four encoder wires (VCC, GND, A, B) free for later.", whatYouSee: "Two thick motor pairs reaching the driver's output pins.", checkpoints: ["Left motor on A, right motor on B", "Encoder wires kept separate"], tip: "If a wheel later turns the wrong way, swap that motor's two power wires." },
      { stepNumber: 8, stage: "Step 8: Brain Deck", title: "Mount the Arduino Uno on the Middle Deck", time: "15 mins", description: "Fit the middle plate and mount the Uno on it.", whatToDo: "Screw on the next standoffs and the middle plate, then mount the Uno with its USB port toward the back.", howToDo: "Use 10 mm standoffs under the Uno. Fit the toggle switch on the edge of the middle deck where you can reach it.", whatYouSee: "The blue Uno in the middle of the robot with the switch on the side.", checkpoints: ["The USB port can be reached for uploading", "The switch can be flicked from outside"], tip: "Keep the Uno's USB toward the back so the cable doesn't snag when the robot leans." },
      { stepNumber: 9, stage: "Step 9: IMU", title: "Mount the MPU6050 Firmly at the Centre", time: "10 mins", description: "Fix the IMU flat, level and centred on the middle deck.", whatToDo: "Mount the MPU6050 next to the Uno, flat on the plate, with its X arrow pointing forward.", howToDo: "Use two short standoffs or strong double-sided foam tape. It must not wobble at all.", whatYouSee: "The small blue IMU board lying flat beside the Uno.", checkpoints: ["The IMU doesn't move when you tap the deck", "Its X arrow points to the robot's front"], tip: "A loose IMU is the most common cause of a wobbly robot: mount it rigidly." },
      { stepNumber: 10, stage: "Step 10: Signal Wiring", title: "Wire the Driver, IMU and Encoders to the Uno", time: "35 mins", description: "Connect every signal from the pin table.", whatToDo: "Driver PWMA/AIN1/AIN2/PWMB/BIN1/BIN2/STBY, IMU SDA/SCL, both encoders and the HC-05.", howToDo: "PWMA → D5, AIN1 → D7, AIN2 → D8, PWMB → D6, BIN1 → D9, BIN2 → D10, STBY → D4; IMU SDA → A4, SCL → A5; left encoder A → D2, B → D11; right encoder A → D3, B → A0; HC-05 TX → A2, RX → A3 through a 1 kΩ/2 kΩ divider. Power the IMU, encoders, HC-05 and the driver's VCC from the Uno's 5V and GND.", whatYouSee: "A fan of jumpers from the Uno down to the driver and out to the motors and IMU.", checkpoints: ["Encoder A channels are on D2 and D3 (the interrupt pins)", "The HC-05 RX has the voltage divider"], tip: "Keep the IMU wires short and away from the motor wires." },
      { stepNumber: 11, stage: "Step 11: Power Wiring", title: "Wire the Battery, Switch and Common Ground", time: "20 mins", description: "Run switched battery power to the driver, the Uno and the buck converter.", whatToDo: "Battery + to the switch; switched + to the driver's VM, the Uno's VIN and the buck's IN+. Join every ground.", howToDo: "Use silicone wire for the battery current. Join battery (−), driver GND, Uno GND and buck GND at one point.", whatYouSee: "A short red and black power harness from the switch to the boards.", checkpoints: ["Switch OFF and battery unplugged while wiring", "One common ground joins every board"], tip: "Without a common ground the driver ignores the Uno's signals." },
      { stepNumber: 12, stage: "Step 12: Top Plate", title: "Fit the Top Plate with the HC-05 and Camera", time: "20 mins", description: "Close the tower with the top plate carrying the Bluetooth module and the camera.", whatToDo: "Mount the HC-05 and the camera mount on the top plate, then fit it on the last standoffs.", howToDo: "Wire the ESP32-CAM's 5V and GND to the buck converter's output. Stand the HC-05 antenna upright.", whatYouSee: "The finished four-deck tower with the camera looking forward from the top.", checkpoints: ["The camera faces the robot's front", "Nothing on the top plate hangs off to one side"], tip: "Keep the top light: weight high up makes the robot slower to fall but harder to correct." },
      { stepNumber: 13, stage: "Step 13: Program & Tune", title: "Upload, Find the Balance Point and Tune the PID", time: "45 mins", description: "Upload the sketch, set the balance angle and tune Kp, Ki and Kd.", whatToDo: "Upload with the switch OFF, then hold the robot upright and switch on.", howToDo: "Open the Serial Monitor at 115200 baud and note the angle when the robot is perfectly balanced by hand: put it in BALANCE_ANGLE. Raise Kp until it oscillates, then add Kd to calm it, then a little Ki to stop slow drift.", whatYouSee: "The robot stands on its own and rocks gently back and forth while holding its place.", checkpoints: ["The robot catches itself when nudged", "It holds its position instead of rolling away"], tip: "Tune with the robot held loosely over a soft surface: it will fall a lot at first." },
    ],
    pinout: [
      { componentPin: "TB6612 PWMA (Left Speed)", targetPin: "Arduino D5 (PWM)", wireColor: "White", type: "PWM", notes: "Speed of the left motor" },
      { componentPin: "TB6612 AIN1", targetPin: "Arduino D7", wireColor: "Blue", type: "Digital", notes: "Left motor direction" },
      { componentPin: "TB6612 AIN2", targetPin: "Arduino D8", wireColor: "Purple", type: "Digital", notes: "Left motor direction" },
      { componentPin: "TB6612 PWMB (Right Speed)", targetPin: "Arduino D6 (PWM)", wireColor: "Gray", type: "PWM", notes: "Speed of the right motor" },
      { componentPin: "TB6612 BIN1", targetPin: "Arduino D9", wireColor: "Orange", type: "Digital", notes: "Right motor direction" },
      { componentPin: "TB6612 BIN2", targetPin: "Arduino D10", wireColor: "Brown", type: "Digital", notes: "Right motor direction" },
      { componentPin: "TB6612 STBY", targetPin: "Arduino D4", wireColor: "Yellow", type: "Digital", notes: "HIGH to enable the driver" },
      { componentPin: "MPU6050 SDA", targetPin: "Arduino A4", wireColor: "Green", type: "Digital", notes: "I²C data" },
      { componentPin: "MPU6050 SCL", targetPin: "Arduino A5", wireColor: "Yellow", type: "Digital", notes: "I²C clock" },
      { componentPin: "MPU6050 VCC", targetPin: "Arduino 5V", wireColor: "Red", type: "Power", notes: "The GY-521 board has its own 3.3 V regulator" },
      { componentPin: "Left Encoder A", targetPin: "Arduino D2 (INT0)", wireColor: "Yellow", type: "Digital", notes: "Interrupt pin: counts left wheel pulses" },
      { componentPin: "Left Encoder B", targetPin: "Arduino D11", wireColor: "Green", type: "Digital", notes: "Gives the left wheel's direction" },
      { componentPin: "Right Encoder A", targetPin: "Arduino D3 (INT1)", wireColor: "Yellow", type: "Digital", notes: "Interrupt pin: counts right wheel pulses" },
      { componentPin: "Right Encoder B", targetPin: "Arduino A0", wireColor: "Green", type: "Digital", notes: "Gives the right wheel's direction" },
      { componentPin: "HC-05 TX", targetPin: "Arduino A2", wireColor: "Yellow", type: "Digital", notes: "SoftwareSerial RX: steering commands from the phone" },
      { componentPin: "HC-05 RX", targetPin: "Arduino A3", wireColor: "Blue", type: "Digital", notes: "Through a 1 kΩ/2 kΩ divider (the HC-05 RX is 3.3 V)" },
      { componentPin: "TB6612 VCC (logic)", targetPin: "Arduino 5V", wireColor: "Red", type: "Power", notes: "Logic supply for the driver chip" },
      { componentPin: "TB6612 VM", targetPin: "Battery + (via toggle switch)", wireColor: "Red", type: "Power", notes: "Switched 11.1 V for the motors" },
      { componentPin: "Li-Po Battery + (via switch)", targetPin: "Arduino VIN", wireColor: "Red", type: "Power", notes: "11.1 V into the Uno's regulator" },
      { componentPin: "System Ground", targetPin: "Arduino GND + Driver GND + Buck GND + Battery (-)", wireColor: "Black", type: "Ground", notes: "One common ground for every board" },
    ],
    arduinoCode: `// =================================================================
// BalanceBot Pro — Arduino Uno
// Self-balancing with an MPU6050 (complementary filter + PID),
// Hall encoders to hold position, HC-05 Bluetooth steering.
// Libraries: Wire, SoftwareSerial (both built in)
// =================================================================
#include <Wire.h>
#include <SoftwareSerial.h>

// ---------- TB6612FNG ----------
const int PWMA = 5, AIN1 = 7, AIN2 = 8;      // left motor
const int PWMB = 6, BIN1 = 9, BIN2 = 10;     // right motor
const int STBY = 4;

// ---------- Encoders (A channels on the interrupt pins) ----------
const int ENC_LA = 2, ENC_LB = 11, ENC_RA = 3, ENC_RB = A0;
volatile long ticksL = 0, ticksR = 0;

// ---------- Bluetooth ----------
SoftwareSerial bt(A2, A3);                   // RX, TX

// ---------- Tuning ----------
float BALANCE_ANGLE = 0.0;                   // degrees when perfectly upright
float Kp = 28.0, Ki = 0.6, Kd = 1.2;         // tilt PID
float Kpos = 0.02;                            // how strongly it holds position
const float ALPHA = 0.98;                     // complementary filter weight

const int MPU = 0x68;
float angle = 0, integral = 0, lastError = 0;
float drive = 0, turn = 0;                    // from the phone
unsigned long lastUs;

void setup() {
  Serial.begin(115200);
  bt.begin(9600);
  Wire.begin();
  Wire.beginTransmission(MPU); Wire.write(0x6B); Wire.write(0); Wire.endTransmission(); // wake up

  int outs[] = {PWMA, AIN1, AIN2, PWMB, BIN1, BIN2, STBY};
  for (int p : outs) pinMode(p, OUTPUT);
  pinMode(ENC_LB, INPUT_PULLUP); pinMode(ENC_RB, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(ENC_LA), countL, RISING);
  attachInterrupt(digitalPinToInterrupt(ENC_RA), countR, RISING);
  digitalWrite(STBY, HIGH);

  angle = readAccelAngle();
  lastUs = micros();
}

void loop() {
  readBluetooth();

  // run the balance loop every 5 ms
  if (micros() - lastUs < 5000) return;
  float dt = (micros() - lastUs) / 1e6;
  lastUs = micros();

  // complementary filter: trust the gyro short-term, the accelerometer long-term
  angle = ALPHA * (angle + readGyroRate() * dt) + (1 - ALPHA) * readAccelAngle();

  // fallen over: stop the motors until it is stood up again
  if (abs(angle - BALANCE_ANGLE) > 45) { setMotors(0, 0); integral = 0; return; }

  // hold position: lean slightly against any drift the encoders see
  long pos = (ticksL + ticksR) / 2;
  float target = BALANCE_ANGLE + Kpos * pos - drive;

  float error = target - angle;
  integral = constrain(integral + error * dt, -50, 50);
  float out = Kp * error + Ki * integral + Kd * (error - lastError) / dt;
  lastError = error;

  setMotors(out + turn, out - turn);
  Serial.println(angle);
}

// ---------- Sensors ----------
int16_t read16(byte reg) {
  Wire.beginTransmission(MPU); Wire.write(reg); Wire.endTransmission(false);
  Wire.requestFrom(MPU, 2);
  return (Wire.read() << 8) | Wire.read();
}

float readAccelAngle() {
  // pitch from gravity: forward/back (Y) against down (Z)
  return atan2((float)read16(0x3D), (float)read16(0x3F)) * 180.0 / PI;
}

float readGyroRate() {
  return read16(0x43) / 131.0;                // degrees per second around X
}

void countL() { ticksL += digitalRead(ENC_LB) ? 1 : -1; }
void countR() { ticksR += digitalRead(ENC_RB) ? -1 : 1; }

// ---------- Motors ----------
void setMotors(float left, float right) {
  setOne(PWMA, AIN1, AIN2, left);
  setOne(PWMB, BIN1, BIN2, right);
}

void setOne(int pwm, int in1, int in2, float v) {
  int s = constrain(abs(v), 0, 255);
  digitalWrite(in1, v >= 0);
  digitalWrite(in2, v < 0);
  analogWrite(pwm, s);
}

// ---------- Phone steering: F, B, L, R, S ----------
void readBluetooth() {
  if (!bt.available()) return;
  char c = bt.read();
  if (c == 'F') drive = 2.0;
  else if (c == 'B') drive = -2.0;
  else if (c == 'L') turn = -40;
  else if (c == 'R') turn = 40;
  else if (c == 'S') { drive = 0; turn = 0; }
}`,
    faqs: [
      { q: "The robot falls over straight away. Where do I start?", a: "First check BALANCE_ANGLE: hold the robot perfectly upright and read the angle in the Serial Monitor, then put that number in the code. Then check the motors push the right way: when you tilt it forward, both wheels must spin forward to catch it. If not, swap that motor's power wires." },
      { q: "It shakes back and forth quickly.", a: "Kp is too high or Kd too low. Lower Kp by about 10% or raise Kd a little until the shaking stops." },
      { q: "It balances but slowly rolls away.", a: "Raise Ki a little, and check the encoders: the A channels must be on D2 and D3 (the interrupt pins) and both encoders need 5 V and GND." },
      { q: "Why is the battery on the bottom deck?", a: "Putting the heaviest part low and centred keeps the robot's centre of mass close to the axle, so a small correction is enough to catch it." },
      { q: "How do I view the camera?", a: "The ESP32-CAM runs its own streaming sketch (the CameraWebServer example). Once it joins your Wi-Fi, open its address in a browser. It only needs 5 V and GND from the buck converter, with no wires to the Uno." },
    ],
  },
  {
    slug: "vision-sorter",
    title: "Vision Sorter Station",
    badge: "CAMERA SORTER",
    description: "A desktop conveyor belt machine with a camera that sorts small items by color and shape.",
    shortDescription: "A T-slot conveyor station where a Raspberry Pi camera spots each item's colour and a servo pusher sweeps it down the right chute.",
    howItWorks: "Items ride the belt into the vision arch. An infrared sensor sees each one arrive, the LED bars light it evenly, and the Raspberry Pi camera takes a picture. OpenCV decides whether it's red, green or blue; red and green items are swept into their chutes by servo pushers further down the belt, and everything else rides off the end. The touchscreen on the arm shows the counts.",
    category: "Robotic Arms",
    level: "Advanced",
    timeEstimate: "9 Hours",
    partsCount: 18,
    microcontroller: "Raspberry Pi 4 Model B (the station's controller)",
    sensors: ["Raspberry Pi Camera Module 3 (sees each item's colour)", "E18-D80NK Infrared Item Sensor"],
    motorDriver: "L298N Motor Driver (conveyor) + PCA9685 Servo Driver (pushers)",
    image: "https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=800&q=80",
    bom: [
      { id: "vs-pi-01", name: "Raspberry Pi 4 Model B (4GB)", whatIsIt: "A credit-card-size Linux computer.", whyUsed: "It runs the camera and OpenCV colour detection, drives the conveyor and pushers, and shows the counts on the touchscreen: it is the station's 'PLC'.", qty: 1, spec: "Quad-core 1.8 GHz, 4 GB RAM, 40-pin GPIO (3.3 V logic), CSI camera and DSI display ports, 5 V 3 A supply.", category: "Electronics", priceEst: "₹5,200", inStock: true, storesAvailable: 4, alternative: { name: "Raspberry Pi 5", useCase: "You want faster image processing.", whyItWorks: "Same GPIO layout; needs the Pi 5 camera and display cables." } },
      { id: "vs-cam-01", name: "Raspberry Pi Camera Module 3", whatIsIt: "A 12 MP autofocus camera on a ribbon cable.", whyUsed: "It looks straight down from the vision arch and photographs every item that passes.", qty: 1, spec: "Sony IMX708, 12 MP, autofocus, CSI ribbon.", category: "Electronics", priceEst: "₹2,600", inStock: true, storesAvailable: 3, alternative: { name: "USB webcam", useCase: "You already have one.", whyItWorks: "OpenCV can read it as camera 0; image quality and mounting vary." } },
      { id: "vs-hmi-01", name: "Raspberry Pi 7\" Touch Display", whatIsIt: "The official 7-inch capacitive touchscreen.", whyUsed: "It's the station's HMI panel: live camera view, colour counts and start/stop buttons.", qty: 1, spec: "800 × 480, 10-point touch, DSI ribbon, 5 V from the GPIO header.", category: "Electronics", priceEst: "₹6,500", inStock: true, storesAvailable: 3, alternative: { name: "5\" HDMI touch display", useCase: "You want a cheaper panel.", whyItWorks: "Works the same through HDMI and USB touch." } },
      { id: "vs-pca-01", name: "PCA9685 16-Channel Servo Driver", whatIsIt: "A small board that makes steady servo pulses over I²C.", whyUsed: "The Pi's own pulses jitter; the PCA9685 holds the pusher servos rock-steady.", qty: 1, spec: "PCA9685, I²C address 0x40, 16 channels, separate V+ servo supply.", category: "Electronics", priceEst: "₹250", inStock: true, storesAvailable: 4, alternative: null },
      { id: "vs-srv-01", name: "MG90S Metal-Gear Servos", whatIsIt: "Small, fast servos with metal gears.", whyUsed: "Each one swings a pusher paddle across the belt to sweep an item into its chute.", qty: 2, spec: "MG90S, 2.2 kg·cm, 0.1 s/60°, 5 V.", category: "Movement", priceEst: "₹220", inStock: true, storesAvailable: 4, alternative: null },
      { id: "vs-mot-01", name: "12V DC Gear Motor (100 RPM) for the Conveyor", whatIsIt: "A geared DC motor with a 6 mm shaft.", whyUsed: "It turns the conveyor's drive roller at a steady, slow belt speed.", qty: 1, spec: "12 V, 100 RPM, 6 mm D-shaft, with mounting bracket and coupler.", category: "Movement", priceEst: "₹450", inStock: true, storesAvailable: 3, alternative: null },
      { id: "vs-drv-01", name: "L298N Motor Driver", whatIsIt: "A red H-bridge board with a heatsink.", whyUsed: "It switches 12 V to the conveyor motor and lets the Pi set its speed.", qty: 1, spec: "2 A per channel, 5–35 V, ENA speed input.", category: "Electronics", priceEst: "₹160", inStock: true, storesAvailable: 4, alternative: null },
      { id: "vs-ir-01", name: "E18-D80NK Infrared Item Sensor", whatIsIt: "An adjustable-range infrared proximity sensor in a metal barrel.", whyUsed: "It sees each item arrive under the camera, so the Pi knows exactly when to take the picture.", qty: 1, spec: "3–80 cm adjustable, NPN output, 5 V.", category: "Electronics", priceEst: "₹350", inStock: true, storesAvailable: 3, alternative: null },
      { id: "vs-led-01", name: "12V LED Inspection Light Bars", whatIsIt: "Short aluminium-backed LED strips.", whyUsed: "Even, bright light stops shadows and room lighting from fooling the colour detection.", qty: 2, spec: "12 V, 6000 K white, 20 cm, about 3 W each.", category: "Electronics", priceEst: "₹180", inStock: true, storesAvailable: 3, alternative: null },
      { id: "vs-mos-01", name: "IRLZ44N Logic-Level MOSFET Switch Module", whatIsIt: "A small switch board the Pi can turn on with 3.3 V.", whyUsed: "It switches the 12 V LED bars on only while an item is being inspected.", qty: 1, spec: "IRLZ44N, fully on at 3.3 V gate, screw terminals.", category: "Electronics", priceEst: "₹90", inStock: true, storesAvailable: 3, alternative: null },
      { id: "vs-belt-01", name: "Mini Conveyor Belt Kit (Belt, Rollers, Bed, Side Guards)", whatIsIt: "A PVC belt with a drive roller, an idler roller, a support bed and side guards.", whyUsed: "It carries the items smoothly and straight through the vision arch and past the pushers.", qty: 1, spec: "600 × 80 mm PVC belt, 30 mm rollers with bearings, aluminium bed and guards.", category: "Movement", priceEst: "₹1,800", inStock: true, storesAvailable: 2, alternative: null },
      { id: "vs-frm-01", name: "2020 Aluminium T-Slot Frame Kit", whatIsIt: "Aluminium extrusions, corner brackets, T-nuts and levelling feet.", whyUsed: "It builds the table frame, the vision arch and the HMI arm, all square and adjustable.", qty: 1, spec: "2020 profile, cut lengths, 20 corner brackets, M5 T-nuts, 4 levelling feet.", category: "Structure", priceEst: "₹2,400", inStock: true, storesAvailable: 2, alternative: null },
      { id: "vs-chu-01", name: "Sorting Chutes & Collection Bins", whatIsIt: "Two printed chutes and two stackable bins.", whyUsed: "They catch the pushed items and guide them into the red and green bins.", qty: 1, spec: "2 PETG chutes, 2 × 1 L bins (red, green).", category: "Structure", priceEst: "₹350", inStock: true, storesAvailable: 2, alternative: null },
      { id: "vs-cab-01", name: "Control Cabinet with Clear Door, DIN Rail & Terminal Blocks", whatIsIt: "An ABS enclosure with a transparent door, a DIN rail and screw terminal blocks.", whyUsed: "It keeps the Pi and drivers together, tidy and safe, with one place where every wire lands.", qty: 1, spec: "250 × 300 × 150 mm, clear polycarbonate door, 35 mm DIN rail, 10 terminal blocks.", category: "Structure", priceEst: "₹1,200", inStock: true, storesAvailable: 2, alternative: null },
      { id: "vs-psu-01", name: "12V 5A Power Adapter with Panel Jack", whatIsIt: "A plug-in 12 V power brick and a panel-mount barrel jack.", whyUsed: "It powers the whole station without any mains wiring inside the cabinet.", qty: 1, spec: "12 V 5 A, 5.5 × 2.1 mm barrel plug, panel jack with screw terminals.", category: "Power", priceEst: "₹650", inStock: true, storesAvailable: 4, alternative: null },
      { id: "vs-buck-01", name: "12V to 5V 5A Buck Converter", whatIsIt: "A step-down regulator.", whyUsed: "It makes the 5 V for the Pi, the touchscreen and the servos.", qty: 1, spec: "XL4015 or similar, 12 V in, set to 5.1 V out, 5 A.", category: "Power", priceEst: "₹250", inStock: true, storesAvailable: 4, alternative: null },
      { id: "vs-est-01", name: "Emergency Stop Button (Latching, NC)", whatIsIt: "A big red push-to-stop, twist-to-release button.", whyUsed: "One slap cuts the 12 V to the motor, LEDs and buck converter: the whole station stops.", qty: 1, spec: "22 mm, latching, normally-closed contact, 10 A.", category: "Power", priceEst: "₹220", inStock: true, storesAvailable: 3, alternative: null },
      { id: "vs-wir-01", name: "Wires, Jumpers & Ferrules Kit", whatIsIt: "DuPont jumpers, 20 AWG wire and crimp ferrules.", whyUsed: "Jumpers for the Pi's signals; ferruled wire for every screw terminal.", qty: 1, spec: "40 jumpers, 5 m of 20 AWG in four colours, 200 ferrules.", category: "Structure", priceEst: "₹250", inStock: true, storesAvailable: 4, alternative: null },
    ],
    steps: [
      { stepNumber: 1, stage: "Step 1: Frame", title: "Build the Aluminium T-Slot Frame", time: "45 mins", description: "Assemble the table frame from the 2020 extrusions and corner brackets.", whatToDo: "Build the rectangular top, four legs and the lower stretchers, then fit the levelling feet.", howToDo: "Slide T-nuts into the slots before closing each joint, then fix every joint with a corner bracket. Measure both diagonals of the top: they must be equal.", whatYouSee: "A stiff, square aluminium table standing on four feet.", checkpoints: ["Both diagonals of the top match within 1 mm", "The frame doesn't rock on a flat floor"], tip: "Put spare T-nuts into every slot you might use later: you can't add them once both ends are closed." },
      { stepNumber: 2, stage: "Step 2: Conveyor", title: "Mount the Conveyor Rollers, Bed and Belt", time: "40 mins", description: "Fit the rollers at each end, the support bed between them and the belt over the top.", whatToDo: "Bolt the drive roller at the left end and the idler at the right, fit the bed, loop the belt and tension it.", howToDo: "Use the slotted idler mounts to tension the belt until it doesn't sag, then adjust until it runs centred. Fit the side guards along both edges.", whatYouSee: "A flat belt running along the top of the frame between two side guards.", checkpoints: ["The belt runs centred without drifting to one side", "The belt doesn't slip on the drive roller"], tip: "Too tight wears the bearings; just tight enough not to slip is right." },
      { stepNumber: 3, stage: "Step 3: Drive", title: "Mount the Conveyor Motor", time: "20 mins", description: "Fix the gear motor to the frame and couple it to the drive roller.", whatToDo: "Mount the motor bracket on the frame below the drive roller and join the shafts with the coupler.", howToDo: "Line the motor shaft up with the roller shaft before tightening the coupler's grub screws.", whatYouSee: "The motor sitting beside the left end of the belt, coupled to the drive roller.", checkpoints: ["Turning the roller by hand turns the motor smoothly", "The coupler doesn't wobble"], tip: "A misaligned coupler makes the belt pulse: line the shafts up carefully." },
      { stepNumber: 4, stage: "Step 4: Vision Arch", title: "Build the Vision Arch, Camera and LED Bars", time: "35 mins", description: "Stand the arch over the belt and fit the camera and lights.", whatToDo: "Bolt the two arch posts to the frame and the cross-beam on top; mount the camera in the centre of the beam looking straight down, and the two LED bars either side.", howToDo: "Set the camera about 20 cm above the belt. Angle the LED bars inward so the light is even under the camera.", whatYouSee: "An arch over the belt with the camera pointing down between two light bars.", checkpoints: ["The camera looks straight down at the centre of the belt", "No bright reflections or dark shadows under the camera"], tip: "Even light matters more than an expensive camera for colour sorting." },
      { stepNumber: 5, stage: "Step 5: Item Sensor", title: "Mount the Infrared Item Sensor", time: "15 mins", description: "Fix the E18-D80NK on the side guard at the arch.", whatToDo: "Mount the sensor on the side guard, just before the camera, pointing across the belt.", howToDo: "Adjust its range screw until it sees an item on the belt but not the far guard.", whatYouSee: "A small metal sensor on the guard, its red LED lighting when an item passes.", checkpoints: ["The LED lights for every test item", "It doesn't trigger on the empty belt"], tip: "Set the range with the smallest, darkest item you plan to sort." },
      { stepNumber: 6, stage: "Step 6: Pushers & Chutes", title: "Fit the Pusher Servos, Chutes and Bins", time: "30 mins", description: "Mount the two servo pushers on the far side and the chutes on the near side.", whatToDo: "Mount servo A (red) and servo B (green) on the far guard, each with a paddle; fit a chute opposite each, and set the bins under the chutes.", howToDo: "Centre each servo before fitting its paddle, so the paddle rests parallel to the belt and swings across it.", whatYouSee: "Two paddles resting along the far guard, two chutes on the near side leading to a red and a green bin.", checkpoints: ["Each paddle sweeps fully across the belt", "Items slide down each chute into the right bin"], tip: "Line each chute up exactly opposite its paddle." },
      { stepNumber: 7, stage: "Step 7: Cabinet", title: "Mount the Control Cabinet and DIN Rail", time: "25 mins", description: "Fix the cabinet beside the frame and fit the DIN rail, terminal blocks, power jack and E-stop.", whatToDo: "Bolt the cabinet to the frame's right end, fit the DIN rail and terminal blocks inside, the panel jack on the side and the E-stop on the front.", howToDo: "Mark the terminal blocks: 12 V, 0 V and 5 V. Fit the E-stop where you can hit it without reaching over the belt.", whatYouSee: "A grey cabinet with a clear door, a DIN rail inside and a red E-stop on the front.", checkpoints: ["The door opens fully", "The E-stop can be reached instantly"], tip: "Label every terminal now: it makes wiring and fault-finding far easier." },
      { stepNumber: 8, stage: "Step 8: Electronics", title: "Mount the Pi, Drivers and Buck Converter", time: "25 mins", description: "Fit the Raspberry Pi, PCA9685, L298N, MOSFET module and buck converter inside the cabinet.", whatToDo: "Mount each board on standoffs on the cabinet's back panel.", howToDo: "Before connecting anything to it, power the buck converter and set its output to 5.1 V with a multimeter.", whatYouSee: "The green Pi, the red driver and the small boards in neat rows on the back panel.", checkpoints: ["The buck converter reads 5.1 V", "The Pi's USB and Ethernet ports can be reached"], tip: "Set the buck first: too much voltage destroys the Pi instantly." },
      { stepNumber: 9, stage: "Step 9: HMI", title: "Fit the HMI Arm and Touch Display", time: "20 mins", description: "Mount the display on its arm above the cabinet.", whatToDo: "Bolt the arm upright on the cabinet, mount the 7\" display on it and route its ribbon into the cabinet.", howToDo: "Run the DSI ribbon inside the arm or along it, without folding it sharply.", whatYouSee: "The touchscreen at eye level above the cabinet, tilted toward you.", checkpoints: ["The ribbon has no sharp folds", "The screen faces the operator"], tip: "The DSI ribbon is fragile: support it along its whole length." },
      { stepNumber: 10, stage: "Step 10: Motor & Lights", title: "Wire the Conveyor Motor and LED Bars", time: "20 mins", description: "Connect the motor to the L298N and the LED bars to the MOSFET module.", whatToDo: "Motor to OUT1/OUT2; both LED bars' + to the MOSFET module's V+ and − to its V−.", howToDo: "Use ferruled wire in every screw terminal. Run the cables along the frame's top rail into the cabinet.", whatYouSee: "Cables running neatly along the frame into the cabinet.", checkpoints: ["No bare copper outside a terminal", "Cables clipped clear of the belt"], tip: "If the belt later runs backwards, swap the motor's two wires." },
      { stepNumber: 11, stage: "Step 11: Signals", title: "Wire the Pi's Signals, Camera and Display", time: "35 mins", description: "Connect every signal from the pin table.", whatToDo: "L298N ENA/IN1/IN2, PCA9685 SDA/SCL, the item sensor, the MOSFET signal, both servos to the PCA9685, the camera ribbon and the display ribbon.", howToDo: "ENA → GPIO18, IN1 → GPIO23, IN2 → GPIO24; PCA9685 SDA → GPIO2, SCL → GPIO3, VCC → 3.3V; item sensor OUT → GPIO17 through a 10 kΩ/20 kΩ divider; MOSFET SIG → GPIO27; servo A → channel 0, servo B → channel 1.", whatYouSee: "Jumpers from the Pi's header to each board, and two ribbons to the camera and screen.", checkpoints: ["The item sensor's output goes through the divider (the Pi is 3.3 V)", "Ribbons are fully seated with their contacts the right way round"], tip: "Never put 5 V on a Pi GPIO pin: it damages the Pi permanently." },
      { stepNumber: 12, stage: "Step 12: Power", title: "Wire the Power, E-Stop and Common Ground", time: "25 mins", description: "Run the 12 V from the jack through the E-stop to the driver, LEDs and buck converter, and the 5 V to the Pi and servos.", whatToDo: "Jack + → E-stop → 12 V terminals → L298N 12V, MOSFET VIN, buck IN+; buck 5 V → Pi 5V and PCA9685 V+; join every ground.", howToDo: "Use the terminal blocks as the 12 V, 5 V and 0 V buses. Test the E-stop with a multimeter before plugging in.", whatYouSee: "Red, black and orange wires from the jack through the E-stop to the terminal blocks.", checkpoints: ["Pressing the E-stop cuts the 12 V bus", "One common ground joins every board"], tip: "The adapter must be unplugged while you wire." },
      { stepNumber: 13, stage: "Step 13: Software & Test", title: "Install the Software, Calibrate Colours and Test", time: "60 mins", description: "Install the libraries, run the sorter and tune the colour ranges.", whatToDo: "Install picamera2, OpenCV, gpiozero and adafruit-circuitpython-servokit, then run the sorter script.", howToDo: "Run with a few red, green and blue items. Adjust the HSV ranges in COLOURS until every item is named correctly, and PUSH_DELAY until each paddle hits its item.", whatYouSee: "Items ride through the arch, the lights flash, and red and green items are swept into their bins.", checkpoints: ["Every test item is named correctly", "Each pusher hits its item squarely"], tip: "Calibrate under the station's own LED light, not daylight." },
    ],
    pinout: [
      { componentPin: "L298N ENA (Belt Speed)", targetPin: "Pi GPIO18 (PWM0)", wireColor: "White", type: "PWM", notes: "Conveyor speed. Remove the ENA jumper cap." },
      { componentPin: "L298N IN1", targetPin: "Pi GPIO23", wireColor: "Blue", type: "Digital", notes: "Belt forward" },
      { componentPin: "L298N IN2", targetPin: "Pi GPIO24", wireColor: "Purple", type: "Digital", notes: "Belt reverse" },
      { componentPin: "PCA9685 SDA", targetPin: "Pi GPIO2 (SDA)", wireColor: "Green", type: "Digital", notes: "I²C data to the servo driver" },
      { componentPin: "PCA9685 SCL", targetPin: "Pi GPIO3 (SCL)", wireColor: "Yellow", type: "Digital", notes: "I²C clock" },
      { componentPin: "PCA9685 VCC (logic)", targetPin: "Pi 3.3V", wireColor: "Red", type: "Power", notes: "Logic supply; the servos get their own 5 V on V+" },
      { componentPin: "E18-D80NK Sensor OUT", targetPin: "Pi GPIO17", wireColor: "Yellow", type: "Digital", notes: "Through a 10 kΩ/20 kΩ divider: the sensor is 5 V, the Pi is 3.3 V" },
      { componentPin: "E18-D80NK Sensor VCC", targetPin: "Pi 5V", wireColor: "Red", type: "Power", notes: "The sensor needs 5 V" },
      { componentPin: "LED MOSFET SIG", targetPin: "Pi GPIO27", wireColor: "Orange", type: "Digital", notes: "Turns the inspection lights on" },
      { componentPin: "Camera Module 3 ribbon", targetPin: "Pi CSI camera port", wireColor: "Gray", type: "Digital", notes: "Ribbon cable, contacts toward the HDMI ports" },
      { componentPin: "Touch Display ribbon", targetPin: "Pi DSI display port", wireColor: "Gray", type: "Digital", notes: "Ribbon cable; the display also takes 5V and GND from the header" },
      { componentPin: "5V Buck OUT+", targetPin: "Pi 5V", wireColor: "Red", type: "Power", notes: "5.1 V into the Pi's 5V pins (pin 2)" },
      { componentPin: "L298N 12V In", targetPin: "12V Power Supply + (via E-stop)", wireColor: "Red", type: "Power", notes: "Switched 12 V for the motor" },
      { componentPin: "System Ground", targetPin: "Pi GND + Driver GND + Buck GND + Supply (-)", wireColor: "Black", type: "Ground", notes: "One common ground for every board" },
    ],
    arduinoCode: `# =================================================================
# Vision Sorter Station — Raspberry Pi 4 (Python 3)
# Item sensor -> lights on -> photo -> colour -> timed servo push.
# Install:  sudo apt install python3-picamera2 python3-opencv
#           pip install gpiozero adafruit-circuitpython-servokit
# =================================================================
import time
import threading
import cv2
import numpy as np
from picamera2 import Picamera2
from gpiozero import PWMOutputDevice, DigitalOutputDevice, DigitalInputDevice
from adafruit_servokit import ServoKit

# ---------- Pins (BCM numbering) ----------
belt_speed = PWMOutputDevice(18, frequency=1000)   # L298N ENA
belt_fwd = DigitalOutputDevice(23)                 # L298N IN1
belt_rev = DigitalOutputDevice(24)                 # L298N IN2
lights = DigitalOutputDevice(27)                   # MOSFET SIG
item_sensor = DigitalInputDevice(17, pull_up=True) # E18-D80NK (low = item)

# ---------- Pushers on the PCA9685 ----------
kit = ServoKit(channels=16)
PUSHERS = {"red": 0, "green": 1}                   # PCA9685 channels
REST, PUSH = 0, 75                                  # paddle angles
PUSH_DELAY = {"red": 1.4, "green": 2.6}            # seconds from camera to paddle

# ---------- Colour ranges (HSV): tune these in step 13 ----------
COLOURS = {
    "red":   [((0, 120, 80), (10, 255, 255)), ((170, 120, 80), (180, 255, 255))],
    "green": [((40, 80, 60), (85, 255, 255))],
    "blue":  [((95, 100, 60), (130, 255, 255))],
}
MIN_AREA = 1500                                     # pixels

counts = {"red": 0, "green": 0, "blue": 0, "other": 0}

def run_belt(speed=0.55):
    belt_fwd.on(); belt_rev.off()
    belt_speed.value = speed

def stop_belt():
    belt_speed.value = 0
    belt_fwd.off(); belt_rev.off()

def classify(frame):
    hsv = cv2.cvtColor(frame, cv2.COLOR_RGB2HSV)
    best, best_area = "other", MIN_AREA
    for name, ranges in COLOURS.items():
        mask = np.zeros(hsv.shape[:2], np.uint8)
        for lo, hi in ranges:
            mask |= cv2.inRange(hsv, np.array(lo), np.array(hi))
        area = cv2.countNonZero(mask)
        if area > best_area:
            best, best_area = name, area
    return best

def push_later(colour):
    def go():
        time.sleep(PUSH_DELAY[colour])
        kit.servo[PUSHERS[colour]].angle = PUSH
        time.sleep(0.35)
        kit.servo[PUSHERS[colour]].angle = REST
    threading.Thread(target=go, daemon=True).start()

def main():
    cam = Picamera2()
    cam.configure(cam.create_still_configuration(main={"size": (640, 480)}))
    cam.start()
    for ch in PUSHERS.values():
        kit.servo[ch].angle = REST
    run_belt()
    print("Vision Sorter running - Ctrl+C to stop")
    try:
        while True:
            item_sensor.wait_for_inactive()        # sensor goes low when an item arrives
            lights.on()
            time.sleep(0.08)                      # let the light settle
            colour = classify(cam.capture_array())
            lights.off()
            counts[colour] += 1
            print(colour, counts)
            if colour in PUSHERS:
                push_later(colour)
            item_sensor.wait_for_active()         # wait for the item to pass
    except KeyboardInterrupt:
        pass
    finally:
        stop_belt()
        lights.off()
        cam.stop()

if __name__ == "__main__":
    main()`,
    codeNote: "This station runs Python on the Raspberry Pi, not an Arduino sketch.",
    faqs: [
      { q: "Why a Raspberry Pi instead of an Arduino?", a: "Colour detection needs a camera and image processing (OpenCV), which an Arduino can't run. The Pi does the vision, the control and the touchscreen, acting as the station's PLC." },
      { q: "Items are sorted into the wrong bin.", a: "Tune the HSV ranges in COLOURS under the station's own LED light: print the hue of a test item and widen or narrow that colour's range. Even lighting matters more than the camera." },
      { q: "The pusher misses the item.", a: "Adjust PUSH_DELAY for that colour: increase it if the paddle swings too early, decrease it if too late. Keep the belt speed fixed once you've tuned it." },
      { q: "The Pi reboots when a pusher moves.", a: "The servos are drawing from the Pi's supply. Make sure the PCA9685's V+ terminal gets 5 V straight from the buck converter, not from the Pi's header." },
      { q: "Why is there a divider on the item sensor?", a: "The E18-D80NK runs on 5 V and its output can reach 5 V, but the Pi's GPIO pins are 3.3 V only. The 10 kΩ/20 kΩ divider brings the signal down to a safe 3.3 V." },
    ],
  }
];
