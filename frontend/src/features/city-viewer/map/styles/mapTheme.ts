/**
 * Explicit map design tokens for Light/Dark appearance -- consumed by
 * every `map/layers/*.ts` builder and `map/layers/icons.ts` instead of a
 * hardcoded hex color.
 *
 * This reverses the map canvas's previous documented policy (a single
 * fixed "engineering map" palette, never theme-reactive -- see git
 * history on docs/theming.md's "map / City Model workspace" section):
 * per an explicit product decision, the map itself must now read
 * correctly in both Light and Dark, the same Definition-of-Done bar as
 * any other user-facing surface (AGENTS.md 21).
 *
 * This module intentionally does NOT reuse `frontend/src/app/globals.css`'s
 * shared app tokens -- the map canvas remains its own self-contained
 * visualization convention (a road/asphalt/paint palette, not app
 * chrome), just now with two calibrated variants instead of one. See
 * docs/theming.md.
 */

import type { RoadHierarchy } from "./roadStyle";

export interface MapThemeColors {
  /** Empty-style canvas background (`styles/mapStyle.ts`'s `EMPTY_STYLE`). */
  background: string;
  gridMinor: string;
  gridMajor: string;
  roadAsphalt: Record<RoadHierarchy, string>;
  roadCasing: Record<RoadHierarchy, string>;
  /** Selected-road surface tint -- distinct from `selected` (the casing/
   * outline accent) so a selected road reads as "lit up", not just
   * outlined. */
  selectedSurface: string;
  selected: string;
  /** Coarse "multi-lane" dashed hint + real lane-separator dashes. */
  laneMarking: string;
  roadEdgeYellow: string;
  roadLabel: string;
  roadLabelHalo: string;
  intersectionFill: string;
  intersectionStroke: string;
  trafficLight: string;
  trafficLightStroke: string;
  busLane: string;
  parking: string;
  cycleway: string;
  laneConnection: string;
  /** Bus/parking badge icon (`layers/icons.ts`) fill + text + border. */
  busBadge: { fill: string; text: string; border: string };
  parkingBadge: { fill: string; text: string; border: string };
}

const LIGHT_ROAD_ASPHALT: Record<RoadHierarchy, string> = {
  HIGHWAY: "#374151",
  ARTERIAL: "#374151",
  COLLECTOR: "#64748b",
  RESIDENTIAL: "#64748b",
  SERVICE: "#94a3b8",
  OTHER: "#64748b",
};

const LIGHT_ROAD_CASING: Record<RoadHierarchy, string> = {
  HIGHWAY: "#111827",
  ARTERIAL: "#1f2937",
  COLLECTOR: "#334155",
  RESIDENTIAL: "#475569",
  SERVICE: "#64748b",
  OTHER: "#334155",
};

// Dark variant: asphalt gets *darker* toward the top of the hierarchy
// (a highway is the darkest, most "paved" surface, same relative
// ordering as light mode) while casing/outlines get *lighter* so they
// still read as a distinct edge against a dark surface -- status colors
// are chosen per theme to stay meaningful, never a mechanical invert
// (see docs/theming.md's "common mistakes" section for the same rule
// applied to the shared app tokens).
const DARK_ROAD_ASPHALT: Record<RoadHierarchy, string> = {
  HIGHWAY: "#1f2937",
  ARTERIAL: "#334155",
  COLLECTOR: "#475569",
  RESIDENTIAL: "#64748b",
  SERVICE: "#94a3b8",
  OTHER: "#475569",
};

const DARK_ROAD_CASING: Record<RoadHierarchy, string> = {
  HIGHWAY: "#f8fafc",
  ARTERIAL: "#e2e8f0",
  COLLECTOR: "#cbd5e1",
  RESIDENTIAL: "#94a3b8",
  SERVICE: "#64748b",
  OTHER: "#cbd5e1",
};

export const LIGHT_MAP_THEME: MapThemeColors = {
  background: "#f2f1ed",
  gridMinor: "rgba(100, 116, 139, 0.15)",
  gridMajor: "rgba(71, 85, 105, 0.28)",
  roadAsphalt: LIGHT_ROAD_ASPHALT,
  roadCasing: LIGHT_ROAD_CASING,
  selectedSurface: "#bfdbfe", // blue-200
  selected: "#2563eb", // blue-600
  laneMarking: "#fafaf9",
  roadEdgeYellow: "#ca8a04",
  roadLabel: "#292524",
  roadLabelHalo: "#fffdf7",
  intersectionFill: "#78716c",
  intersectionStroke: "#1c1917",
  trafficLight: "#f59e0b",
  trafficLightStroke: "#1c1917",
  busLane: "#c2410c", // orange-700
  parking: "#78716c",
  cycleway: "#16a34a",
  laneConnection: "#f97316",
  busBadge: { fill: "#c2410c", text: "#fff7ed", border: "#7c2d12" },
  parkingBadge: { fill: "#57534e", text: "#fafaf9", border: "#292524" },
};

export const DARK_MAP_THEME: MapThemeColors = {
  background: "#1c1a17",
  gridMinor: "rgba(148, 163, 184, 0.14)",
  gridMajor: "rgba(203, 213, 225, 0.28)",
  roadAsphalt: DARK_ROAD_ASPHALT,
  roadCasing: DARK_ROAD_CASING,
  selectedSurface: "#1e3a8a", // blue-900 -- lit-up tint stays legible on a dark surface
  selected: "#60a5fa", // blue-400 -- brighter accent reads against dark asphalt
  laneMarking: "#d6d3d1",
  roadEdgeYellow: "#facc15",
  roadLabel: "#f5f5f4",
  roadLabelHalo: "#1c1917",
  intersectionFill: "#a8a29e",
  intersectionStroke: "#f5f5f4",
  trafficLight: "#fbbf24",
  trafficLightStroke: "#1c1917",
  busLane: "#fb923c", // orange-400 -- brighter than light mode's 700 for dark-surface contrast
  parking: "#d6d3d1",
  cycleway: "#4ade80",
  laneConnection: "#fb923c",
  busBadge: { fill: "#fb923c", text: "#1c1917", border: "#431407" },
  parkingBadge: { fill: "#d6d3d1", text: "#1c1917", border: "#0c0a09" },
};

export type MapAppearance = "light" | "dark";

export function resolveMapTheme(appearance: MapAppearance): MapThemeColors {
  return appearance === "dark" ? DARK_MAP_THEME : LIGHT_MAP_THEME;
}
