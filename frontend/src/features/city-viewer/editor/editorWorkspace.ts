import type { City, Point, Road } from "../types/city";

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
    default_speed_limit_kmh: null,
    width_m: 8,
    is_width_estimated: false,
    carriageway_count: 1,
    median: "NONE" as const,
    lanes: [],
  };
}
