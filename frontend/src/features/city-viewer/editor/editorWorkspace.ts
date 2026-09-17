import type { City } from "../types/city";

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
      {
        id: "editor-road-a",
        city_id: "editor-workspace",
        name: "Road A",
        road_type: "ARTERIAL",
        geometry: {
          points: [
            { x: -90, y: 0 },
            { x: 90, y: 0 },
          ],
        },
        default_speed_limit_kmh: null,
        width_m: 8,
        is_width_estimated: false,
        carriageway_count: 1,
        median: "NONE",
        lanes: [],
      },
    ],
    intersections: [],
    traffic_lights: [],
    parking_zones: [],
    bus_stops: [],
    crosswalks: [],
  };
}
