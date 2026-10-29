"use client";

import { createContext, createElement, useContext } from "react";
import type { ComponentType, ReactNode } from "react";
import type * as THREE from "three";
import { LINE_FOLLOWER_KIT } from "./lineFollowerKit";

/* A workshop kit: everything the shared workshop (3D viewer, parts explorer, wiring, build steps, shopping list,
   build intro) needs to know about one robot. Each robot keeps its own facts in its own data file and its own
   procedural model; the workshop components read them through this one shape. The Line Follower is the default,
   so pages that don't say otherwise keep working exactly as before. */

export type ConnKind = "Digital" | "PWM" | "Power" | "Ground" | "Motor";

export interface KitPart {
  id: string;
  bomId: string;            // matching BOM entry (src/data/projects.ts)
  label: string;            // what the label in the 3D view says
  where: string;            // where it sits on the robot
  onRobot: boolean;         // false: a BOM item that is not mounted (e.g. a cable or the pilot's transmitter)
  labelled?: boolean;       // shown as a numbered label in the 3D view
}

export interface KitConnection {
  id: string;
  from: { part: string; terminal: string; name: string };
  to: { part: string; terminal: string; name: string };
  color: string;            // wire colour as the guide recommends it
  colorNote?: string;       // when the colour isn't given by the guide
  kind: ConnKind;
  purpose: string;
  warning?: string;
  source: string;           // where in the project data this connection is stated
  jumper: boolean;          // a signal / harness wire (vs a motor or battery lead)
}

export interface KitStepVisual {
  parts: string[];            // highlighted in 3D, listed as "parts needed"
  connections?: string[];     // wires shown being made
  tools?: string[];           // tools and materials the step's text mentions (not BOM items)
  focus?: string[];           // what the camera frames (defaults to parts)
  exploded?: boolean;         // show the parts laid out
  track?: boolean;            // show the model's test track (if it has one)
  detail?: string;            // a named detail to label (see stepDetails)
  seeThrough?: string[];      // parts drawn as glass in this step, so the work underneath stays visible
}

export interface KitStepHelp { mistake: string; safety?: string; check?: string; source: string }

export interface KitPartNode {
  id: string;
  group: THREE.Group;
  home: THREE.Vector3;
  homeQ: THREE.Quaternion;
  away: THREE.Vector3;
  meshes: THREE.Mesh[];
}

export interface KitWire { conn: KitConnection; mesh: THREE.Mesh; plugs: THREE.Mesh[]; mat: THREE.MeshStandardMaterial }

export interface KitModel {
  root: THREE.Group;
  parts: Map<string, KitPartNode>;
  wires: Map<string, KitWire>;
  track?: THREE.Object3D;
  features: Record<string, THREE.Object3D | undefined>;   // named details that get their own label
  setExplode: (k: number) => void;
  setSpread: (x: number, y: number, z: number) => void;
  terminalWorld: (t: string, out: THREE.Vector3) => THREE.Vector3;
  dispose: () => void;
}

type V3 = [number, number, number];

export interface WorkshopKit {
  id: string;                         // storage / event prefix
  noun: string;                       // "robot", "drone"
  title: string;                      // "Line Follower Robot"
  parts: KitPart[];
  connections: KitConnection[];
  stepVisuals: Record<number, KitStepVisual>;
  stepHelp: Record<number, KitStepHelp>;
  partGuide: Record<string, { need: string; tip: string; tipSource: string }>;
  connectionLevel: Record<string, string>;
  openQuestions: string[];
  tools: string[];
  installedAt: Record<string, number>;  // the step each part goes on (so each step shows the build as it stands)
  wiresPart: string;                  // the part id that stands for the loose wires
  wireAnchorConn: string;             // a wire whose middle anchors the wires' label
  basePart: string;                   // the part everything sits on (picked last when parts overlap)
  oneOfSet: (id: string) => boolean;  // one of several identical parts: a step uses 1 of the BOM quantity
  partForBom: (bomId: string) => KitPart | undefined;
  offRobotNote: (id: string) => string;
  partFeatures: { key: string; text: string; part: string; feature: string }[];
  stepDetails: Record<string, { key: string; text: string; feature: string }[]>;
  wiringOverview: string[];           // parts labelled in the wiring view when no wire is chosen
  stepOverview: string[];             // parts labelled in a step that names none
  wiringGroups: { title: string; ids: string[] }[];
  pinText: Record<string, string>;
  Diagram: ComponentType<{ selected: string | null; onSelect: (id: string | null) => void }>;
  camera: {
    target: V3; dir: V3; dist: number;
    explodedTarget: V3; explodedDist: number;               // framing of the exploded view without a custom spread
    explodedFit?: number;                                   // with a custom spread: share of the layout's bounding sphere to fit (default 0.6)
    lowView?: (c: { x: number; y: number; z: number }) => V3 | null;  // parts hidden low down: look from here
  };
  stepSpread: V3;
  intro: { spread: V3; zoom: number; title: string };
  loadModel: () => Promise<() => KitModel>;
}

const KitContext = createContext<WorkshopKit>(LINE_FOLLOWER_KIT);

export function KitProvider({ kit, children }: { kit: WorkshopKit; children: ReactNode }) {
  return createElement(KitContext.Provider, { value: kit }, children);
}

export const useKit = () => useContext(KitContext);
