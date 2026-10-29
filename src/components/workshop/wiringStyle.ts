import type { ConnKind } from "./kit";

/* How each kind of connection is drawn in the wiring lists and circuit diagrams: colour + line pattern + name,
   never colour alone. */
export const DASH: Record<ConnKind, string | undefined> = { Power: undefined, Digital: undefined, PWM: "2 3", Ground: "7 4", Motor: "11 3 2 3" };
export const WIDTH: Record<ConnKind, number> = { Power: 3.2, Ground: 3, Digital: 2.2, PWM: 2.2, Motor: 3 };
export const KIND_LABEL: Record<ConnKind, string> = { Power: "Power", Ground: "Ground", Digital: "Signal", PWM: "Speed (PWM)", Motor: "Motor lead" };

export const WIRE_HEX: Record<string, number> = {
  yellow: 0xf2c230, green: 0x2f9e5b, red: 0xd8432f, black: 0x22252a, blue: 0x2f6fd6, purple: 0x8a55c9,
  orange: 0xf0862e, brown: 0x7a4b2a, white: 0xf2f0ea, gray: 0x9aa0a6, grey: 0x9aa0a6,
};
export const wireHex = (c: string) => WIRE_HEX[c.toLowerCase()] ?? 0xc8592e;
export const wireCss = (c: string) => `#${wireHex(c).toString(16).padStart(6, "0")}`;
// a white wire on a light background: draw it in a darker cream so it stays visible
export const strokeCss = (c: string) => (c.toLowerCase() === "white" ? "#cfcac0" : wireCss(c));
