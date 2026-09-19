import type { City, Point, Road } from "../types/city";

export function createEditorEntityId(seed: string): string {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  const tail = `${hex}${hex}${hex}${hex}`.slice(0, 32);
  return `${tail.slice(0, 8)}-${tail.slice(8, 12)}-4${tail.slice(13, 16)}-8${tail.slice(17, 20)}-${tail.slice(20)}`;
}

/** The initial, intentionally local editor document for PL-005.01. */
export function buildEditorWorkspace(): City {
  const now = new Date(0).toISOString();
  return {
    id: "editor-workspace",
    name: "Editor workspace",
    description: "The initial Pixel Lane road editor workspace.",
    coordinate_system: "LOCAL_CARTESIAN",
    created_at: now,
    updated_at: now,
    roads: [
      makeEditorRoad("editor-road-a", "Road A", [
        { x: -260, y: 220 },
        { x: 100, y: 220 },
      ]),
      makeEditorRoad("editor-road-b", "Road B", [
        { x: 0, y: -180 },
        { x: 0, y: 120 },
      ]),
      makeEditorRoad("editor-road-c", "Road C", [
        { x: 260, y: -100 },
        { x: 500, y: 140 },
      ]),
    ],
    intersections: [],
    traffic_lights: [],
    parking_zones: [],
    bus_stops: [],
    crosswalks: [],
  };
}

/** Empty pre-load state; backend Demo City data is authoritative. */
export function buildEmptyEditorCity(): City {
  const now = new Date(0).toISOString();
  return {
    id: "",
    name: "",
    description: "",
    coordinate_system: "LOCAL_CARTESIAN",
    created_at: now,
    updated_at: now,
    roads: [],
    intersections: [],
    traffic_lights: [],
    parking_zones: [],
    bus_stops: [],
    crosswalks: [],
  };
}

export function createEditorRoad(
  id: string,
  name: string,
  points: [Point, Point],
): Road {
  return makeEditorRoad(id, name, points);
}

function makeEditorRoad(id: string, name: string, points: [Point, Point]) {
  return {
    id,
    city_id: "editor-workspace",
    name,
    road_type: "ARTERIAL" as const,
    geometry: { points },
    smoothing: 0,
    default_speed_limit_kmh: null,
    width_m: 8,
    is_width_estimated: false,
    carriageway_count: 1,
    median: "NONE" as const,
    lanes: [
      makeEditorLane(`${id}-lane-0`, id, 0, "FORWARD"),
      makeEditorLane(`${id}-lane-1`, id, 1, "BACKWARD"),
    ],
  };
}

function makeEditorLane(
  id: string,
  roadId: string,
  index: number,
  direction: "FORWARD" | "BACKWARD",
) {
  return {
    id,
    road_id: roadId,
    index,
    direction,
    allowed_movements: [],
    lane_type: "GENERAL" as const,
    speed_limit_kmh: null,
  };
}
