import { describe, expect, it } from "vitest";
import type { City, Intersection, Road } from "../types/city";
import { updateIntersectionManeuver } from "./intersectionManeuverState";

const intersection: Intersection = {
  id: "j",
  city_id: "city",
  position: { x: 0, y: 0 },
  connected_road_ids: ["in", "out"],
  connected_lane_ids: [],
  control_type: "UNCONTROLLED",
  traffic_light_id: null,
};
function road(
  id: string,
  direction: "FORWARD" | "BACKWARD",
  points: { x: number; y: number }[],
): Road {
  return {
    id,
    city_id: "city",
    name: id,
    road_type: "RESIDENTIAL",
    geometry: { points },
    default_speed_limit_kmh: 30,
    lanes: [
      {
        id: `${id}-lane`,
        road_id: id,
        index: 0,
        direction,
        allowed_movements: [],
        lane_type: "GENERAL",
        speed_limit_kmh: 30,
      },
    ],
  };
}
function city(): City {
  return {
    id: "city",
    name: "Test",
    description: null,
    coordinate_system: "LOCAL_CARTESIAN",
    created_at: "",
    updated_at: "",
    roads: [
      road("in", "FORWARD", [
        { x: 0, y: -10 },
        { x: 0, y: 0 },
      ]),
      road("out", "BACKWARD", [
        { x: 10, y: 0 },
        { x: 0, y: 0 },
      ]),
    ],
    intersections: [intersection],
    traffic_lights: [],
    parking_zones: [],
    bus_stops: [],
    crosswalks: [],
    lane_connections: [],
  };
}

describe("updateIntersectionManeuver", () => {
  it("updates the City Model connection state and preserves selection-relevant topology", () => {
    const source = city();
    const next = updateIntersectionManeuver(
      source,
      "j",
      "in",
      "in-lane",
      "RIGHT",
      true,
    );
    expect(next.lane_connections).toHaveLength(1);
    expect(next.lane_connections?.[0]).toMatchObject({
      intersection_id: "j",
      from_lane_id: "in-lane",
      maneuver: "RIGHT",
    });
    expect(next.intersections).toEqual(source.intersections);
    expect(next.roads).toEqual(source.roads);
    const removed = updateIntersectionManeuver(
      next,
      "j",
      "in",
      "in-lane",
      "RIGHT",
      false,
    );
    expect(removed.lane_connections).toEqual([]);
  });
});
