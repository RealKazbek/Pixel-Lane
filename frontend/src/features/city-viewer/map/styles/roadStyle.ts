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

import type { Road, RoadType, MapRoad } from "../../types/city";

export function roadLaneCount(road: Pick<Road, "lanes"> | Pick<MapRoad, "lane_count">): number {
  return "lane_count" in road ? road.lane_count : road.lanes.length;
}

export const LANE_WIDTH_M = 3.2;
const SEPARATOR_WIDTH_M = 0.3;
const SHOULDER_WIDTH_M = 0.5;
const CASING_EXTRA_M = 1.6;

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

/** Extra real-world width (meters) added on top of the lane-count-derived
 * width so two roads with the same lane count still read as different
 * classes -- e.g. a two-lane highway vs. a two-lane residential street.
 * Not measured from real Almaty data; calibrated for visual legibility. */
const HIERARCHY_WIDTH_BONUS_M: Record<RoadHierarchy, number> = {
  HIGHWAY: 4,
  ARTERIAL: 2.5,
  COLLECTOR: 1.5,
  RESIDENTIAL: 0.5,
  SERVICE: 0,
  OTHER: 0,
};

type WidthInput =
  | (Pick<Road, "lanes" | "road_type"> & Partial<Pick<Road, "width_m">>)
  | (Pick<MapRoad, "lane_count" | "road_type"> & Partial<Pick<MapRoad, "width_m">>);

/** Real-world road width in meters. Prefers `width_m` from the backend
 * (see `app.city.domain.road_geometry` -- an explicit source width, or a
 * centrally-computed fallback keyed off road class/lane count) when
 * present. Falls back to a local lane-count-derived estimate for roads
 * imported before that field existed (backward compatibility) --
 * roadWidth = laneCount * laneWidth + separator + shoulder + a hierarchy
 * bonus. Neither path is calibrated to real-world Almaty measurements;
 * the goal is consistent, class-legible width, not exact accuracy. */
export function roadWidthMeters(road: WidthInput): number {
  if (typeof road.width_m === "number" && road.width_m > 0) {
    return road.width_m;
  }
  const laneCount = Math.max(1, roadLaneCount(road));
  const base = laneCount * LANE_WIDTH_M + SEPARATOR_WIDTH_M + SHOULDER_WIDTH_M;
  return base + HIERARCHY_WIDTH_BONUS_M[roadHierarchy(road.road_type)];
}

export function roadCasingWidthMeters(road: WidthInput): number {
  return roadWidthMeters(road) + CASING_EXTRA_M;
}

/** Minimum on-screen width (pixels) per hierarchy tier, applied as a
 * floor over the real-world-meters-derived width. Real road widths
 * collapse to sub-pixel size at city-overview zoom levels; without a
 * floor, every road (regardless of class) renders as the same hairline
 * and the map reads as an abstract graph instead of a road network. The
 * floor itself is what keeps hierarchy visible when zoomed out. */
export const ROAD_MIN_PIXEL_WIDTH: Record<RoadHierarchy, number> = {
  HIGHWAY: 3.5,
  ARTERIAL: 2.8,
  COLLECTOR: 2.2,
  RESIDENTIAL: 1.6,
  SERVICE: 1.2,
  OTHER: 1.2,
};

const CASING_MIN_PIXEL_EXTRA = 1.4;

export const ROAD_CASING_MIN_PIXEL_WIDTH: Record<RoadHierarchy, number> =
  Object.fromEntries(
    Object.entries(ROAD_MIN_PIXEL_WIDTH).map(([hierarchy, width]) => [
      hierarchy,
      width + CASING_MIN_PIXEL_EXTRA,
    ]),
  ) as Record<RoadHierarchy, number>;

export const ROAD_SURFACE_COLOR: Record<RoadHierarchy, string> = {
  HIGHWAY: "#78716c", // stone-500 -- lighter surface reads as "paved", not a graph edge
  ARTERIAL: "#a8a29e", // stone-400
  COLLECTOR: "#c4b8ac", // warm light stone
  RESIDENTIAL: "#e5e1da", // near-white warm gray, like light pavement
  SERVICE: "#ece8e1",
  OTHER: "#d6d2ca",
};

export const ROAD_CASING_COLOR: Record<RoadHierarchy, string> = {
  HIGHWAY: "#1c1917", // stone-900
  ARTERIAL: "#292524", // stone-800
  COLLECTOR: "#44403c", // stone-700
  RESIDENTIAL: "#57534e", // stone-600
  SERVICE: "#78716c", // stone-500
  OTHER: "#57534e",
};

export const SELECTED_COLOR = "#2563eb"; // blue-600

/** Draw-priority rank per hierarchy, used both for label collision
 * priority (lower wins) and for deciding which roads get labeled first
 * when space is limited. */
export const HIERARCHY_LABEL_RANK: Record<RoadHierarchy, number> = {
  HIGHWAY: 0,
  ARTERIAL: 1,
  COLLECTOR: 2,
  RESIDENTIAL: 3,
  SERVICE: 4,
  OTHER: 5,
};
