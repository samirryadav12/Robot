import type { WorkshopKit } from "./kit";
import { DRONE_KIT } from "./droneKit";
import { ARM_KIT } from "./armKit";
import { SOCCER_KIT } from "./soccerKit";
import { MAZE_KIT } from "./mazeKit";
import { AGRO_KIT } from "./agroKit";
import { BAL_KIT } from "./balKit";
import { VS_KIT } from "./vsKit";

/* Projects (on the shared project page) that have a 3D workshop. The Line Follower has its own page. */
const KITS: Record<string, WorkshopKit> = { "drone-explorer": DRONE_KIT, "robotic-arm": ARM_KIT, robosoccer: SOCCER_KIT, robomaze: MAZE_KIT, "smart-agro-rover": AGRO_KIT, "balancebot-pro": BAL_KIT, "vision-sorter": VS_KIT };
export const kitForSlug = (slug: string): WorkshopKit | null => KITS[slug] ?? null;
