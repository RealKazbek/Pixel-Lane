import { describe, expect, it } from "vitest";
import type { Road } from "../types/city";
import { buildLaneConfiguration } from "./laneConfiguration";
import {
  applyRoadPreset,
  getRoadPreset,
  isValidRoadPreset,
  matchRoadPreset,
  ROAD_PRESETS,
} from "./roadPresets";

const road: Road = {
  id: "road-1",
  city_id: "city-1",
  name: "Main Street",
  road_type: "ARTERIAL",
  geometry: {
    points: [
      { x: 0, y: 0 },
      { x: 5, y: 2 },
      { x: 10, y: 0 },
    ],
  },
  corner_smoothing: [0, 0.6, 0],
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

describe("road presets", () => {
  it("has unique IDs and valid semantic configurations", () => {
    expect(new Set(ROAD_PRESETS.map((preset) => preset.id)).size).toBe(
      ROAD_PRESETS.length,
    );
    expect(ROAD_PRESETS.every(isValidRoadPreset)).toBe(true);
  });

  it("applies the two-way 2-lane preset with a center divider", () => {
    const result = applyRoadPreset(road, getRoadPreset("two-way-2-lane"));
    expect(result?.lanes).toHaveLength(2);
    expect(result?.lanes.map((lane) => lane.direction)).toEqual([
      "FORWARD",
      "BACKWARD",
    ]);
    expect(result?.lane_boundary_markings).toEqual(["DOUBLE_SOLID_WHITE"]);
    expect(result?.left_edge_marking).toBe("SOLID_YELLOW");
    expect(result?.right_edge_marking).toBe("SOLID_YELLOW");
    expect(result?.width_m).toBe(7);
  });

  it("applies the two-way 4-lane preset with inner separators", () => {
    const result = applyRoadPreset(road, getRoadPreset("two-way-4-lane"));
    expect(result?.lanes.map((lane) => lane.direction)).toEqual([
      "FORWARD",
      "FORWARD",
      "BACKWARD",
      "BACKWARD",
    ]);
    expect(result?.lane_boundary_markings).toEqual([
      "DASHED_WHITE",
      "DOUBLE_SOLID_WHITE",
      "DASHED_WHITE",
    ]);
  });

  it.each(["one-way-2-lane", "one-way-3-lane"] as const)(
    "%s contains only one travel direction and dashed separators",
    (presetId) => {
      const result = applyRoadPreset(road, getRoadPreset(presetId));
      expect(result?.lanes.every((lane) => lane.direction === "FORWARD")).toBe(
        true,
      );
      expect(
        result?.lane_boundary_markings?.every(
          (marking) => marking === "DASHED_WHITE",
        ),
      ).toBe(true);
    },
  );

  it("preserves road identity, name, geometry, and smoothing", () => {
    const result = applyRoadPreset(road, getRoadPreset("one-way-3-lane"));
    expect(result?.id).toBe(road.id);
    expect(result?.name).toBe(road.name);
    expect(result?.geometry).toBe(road.geometry);
    expect(result?.corner_smoothing).toBe(road.corner_smoothing);
  });

  it("rejects a preset whose markings do not match its lane layout", () => {
    const preset = getRoadPreset("two-way-2-lane");
    expect(
      applyRoadPreset(road, { ...preset, laneBoundaryMarkings: [] }),
    ).toBeNull();
  });

  it("matches exact presets and becomes custom after a manual override", () => {
    const applied = applyRoadPreset(road, getRoadPreset("two-way-4-lane"));
    expect(applied && matchRoadPreset(applied)?.id).toBe("two-way-4-lane");
    if (!applied) throw new Error("Expected a valid preset result");

    const manualConfiguration = buildLaneConfiguration(
      applied,
      4,
      3.2,
      applied.lanes.map((lane) => lane.direction),
    );
    expect(manualConfiguration).not.toBeNull();
    expect(matchRoadPreset({ ...applied, ...manualConfiguration! })).toBeNull();
  });
});
