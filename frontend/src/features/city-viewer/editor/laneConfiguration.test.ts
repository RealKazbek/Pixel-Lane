import { describe, expect, it } from "vitest";
import { buildLaneConfiguration } from "./laneConfiguration";
import type { Road } from "../types/city";

const road: Road = {
  id: "road-1",
  city_id: "city-1",
  name: "Main Street",
  road_type: "ARTERIAL",
  geometry: {
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
  },
  default_speed_limit_kmh: null,
  width_m: 7,
  lanes: [
    {
      id: "lane-0",
      road_id: "road-1",
      index: 0,
      direction: "FORWARD",
      allowed_movements: [],
      lane_type: "GENERAL",
      speed_limit_kmh: null,
    },
    {
      id: "lane-1",
      road_id: "road-1",
      index: 1,
      direction: "BACKWARD",
      allowed_movements: [],
      lane_type: "GENERAL",
      speed_limit_kmh: null,
    },
  ],
};

describe("buildLaneConfiguration", () => {
  it("keeps order and existing lane identity while changing directions", () => {
    const result = buildLaneConfiguration(road, 2, 3.5, [
      "BACKWARD",
      "FORWARD",
    ]);
    expect(result?.width_m).toBe(7);
    expect(result?.lanes.map((lane) => lane.id)).toEqual(["lane-0", "lane-1"]);
    expect(result?.lanes.map((lane) => lane.direction)).toEqual([
      "BACKWARD",
      "FORWARD",
    ]);
  });

  it("adds deterministic lanes and truncates from the end", () => {
    const expanded = buildLaneConfiguration(road, 4, 3, [
      "FORWARD",
      "BACKWARD",
      "FORWARD",
      "BACKWARD",
    ]);
    expect(expanded?.lanes.map((lane) => lane.index)).toEqual([0, 1, 2, 3]);
    expect(expanded?.lanes[2].id).toBe("road-1-lane-2");
    const reduced = buildLaneConfiguration(road, 1, 3.5, ["FORWARD"]);
    expect(reduced?.lanes).toHaveLength(1);
  });

  it("rejects a lane configuration above the road width limit", () => {
    expect(
      buildLaneConfiguration(road, 12, 6, Array(12).fill("FORWARD")),
    ).toBeNull();
  });
});
