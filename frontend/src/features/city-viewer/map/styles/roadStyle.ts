/**
 * Single reusable road-width/hierarchy/color strategy -- the only place
 * these numbers live, so they can be recalibrated against real
 * measurements later without hunting through components (see
 * map/README.md).
 *
 * Palette: a neutral slate/zinc grayscale hierarchy (darker & wider =
 * more important), not the yellow/orange highway coloring used by
 * consumer map products -- this is an engineering tool, not a navigation
 * app (see AGENTS.md's design-neutrality guidance).
 */

import type { Road, RoadType } from "../../types/city";

export const LANE_WIDTH_M = 3.2;
const SEPARATOR_WIDTH_M = 0.3;
const SHOULDER_WIDTH_M = 0.5;
const CASING_EXTRA_M = 1.2;

/** roadWidth = laneCount * laneWidth + separator + shoulder. Meters are
 * not calibrated to real-world Almaty measurements yet -- the goal for
 * this iteration is consistent, proportional width, not exact accuracy. */
export function roadWidthMeters(road: Pick<Road, "lanes">): number {
  const laneCount = Math.max(1, road.lanes.length);
  return laneCount * LANE_WIDTH_M + SEPARATOR_WIDTH_M + SHOULDER_WIDTH_M;
}

export function roadCasingWidthMeters(road: Pick<Road, "lanes">): number {
  return roadWidthMeters(road) + CASING_EXTRA_M;
}

export type RoadHierarchy =
  "HIGHWAY" | "ARTERIAL" | "COLLECTOR" | "RESIDENTIAL" | "SERVICE" | "OTHER";

const KNOWN_ROAD_TYPES: readonly RoadType[] = [
  "HIGHWAY",
  "ARTERIAL",
  "COLLECTOR",
  "RESIDENTIAL",
  "SERVICE",
];

/** Normalizes a City Model `RoadType` into a rendering hierarchy tier.
 * Any value outside the known set (future road types) falls back to
 * "OTHER" rather than breaking rendering. */
export function roadHierarchy(roadType: RoadType): RoadHierarchy {
  return (KNOWN_ROAD_TYPES as readonly string[]).includes(roadType)
    ? (roadType as RoadHierarchy)
    : "OTHER";
}

export const ROAD_SURFACE_COLOR: Record<RoadHierarchy, string> = {
  HIGHWAY: "#64748b", // slate-500
  ARTERIAL: "#71717a", // zinc-500
  COLLECTOR: "#a1a1aa", // zinc-400
  RESIDENTIAL: "#d4d4d8", // zinc-300
  SERVICE: "#e4e4e7", // zinc-200
  OTHER: "#d1d5db", // gray-300
};

export const ROAD_CASING_COLOR: Record<RoadHierarchy, string> = {
  HIGHWAY: "#1e293b", // slate-800
  ARTERIAL: "#27272a", // zinc-800
  COLLECTOR: "#3f3f46", // zinc-700
  RESIDENTIAL: "#52525b", // zinc-600
  SERVICE: "#71717a", // zinc-500
  OTHER: "#52525b",
};

export const SELECTED_COLOR = "#2563eb"; // blue-600
