import { describe, expect, it } from "vitest";
import {
  buildLaneBoundaryFeatureCollection,
  buildLaneSurfaceFeatureCollection,
  buildLaneUseMarkingFeatureCollection,
  buildTurnArrowFeatureCollection,
} from "../adapters/laneGeometry";
import type { Lane, Road } from "../../types/city";

function makeLane(overrides: Partial<Lane> = {}): Lane {
  return {
    id: "lane-0",
    road_id: "road-1",
    index: 0,
    direction: "FORWARD",
    allowed_movements: ["STRAIGHT"],
    lane_type: "GENERAL",
    speed_limit_kmh: null,
    ...overrides,
  };
}

function makeRoad(overrides: Partial<Road> = {}): Road {
  return {
    id: "road-1",
    city_id: "city-1",
    name: "Main St",
    road_type: "ARTERIAL",
    geometry: {
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 0.01 },
      ],
    },
    default_speed_limit_kmh: 50,
    width_m: 8,
    lanes: [makeLane()],
    ...overrides,
  };
}

describe("buildLaneSurfaceFeatureCollection", () => {
  it("emits one offset LineString per lane, ordered left to right by index", () => {
    const road = makeRoad({
      lanes: [makeLane({ index: 0 }), makeLane({ id: "lane-1", index: 1 })],
    });
    const fc = buildLaneSurfaceFeatureCollection([road], "WGS84");

    expect(fc.features).toHaveLength(2);
    const [left, right] = fc.features;
    expect(left.properties.lane_index).toBe(0);
    expect(right.properties.lane_index).toBe(1);
    // Index 0 is leftmost -- its offset longitude should differ from the
    // centerline in the opposite direction from index 1's.
    const centerLon = road.geometry.points[0].x;
    const leftLon = left.geometry.coordinates[0][0];
    const rightLon = right.geometry.coordinates[0][0];
    expect(leftLon).not.toBeCloseTo(rightLon, 6);
    expect(Math.sign(leftLon - centerLon)).not.toBe(
      Math.sign(rightLon - centerLon),
    );
  });

  it("marks a lane BUS only when the source lane_type says so", () => {
    const road = makeRoad({ lanes: [makeLane({ lane_type: "BUS" })] });
    const fc = buildLaneSurfaceFeatureCollection([road], "WGS84");

    expect(fc.features[0].properties.is_bus).toBe(true);
    expect(fc.features[0].properties.lane_type).toBe("BUS");
  });

  it("defaults to GENERAL/not-bus for a MapRoad with a lane count but no per-lane detail array", () => {
    // Backward compatibility: a viewport row predating per-lane detail
    // (or simply with no lanes joined) still has a lane_count but no
    // `lanes` array -- must render safely, never crash or fabricate BUS.
    const mapRoad = {
      id: "road-2",
      name: "Legacy Rd",
      road_type: "RESIDENTIAL" as const,
      geometry: {
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 0.01 },
        ],
      },
      lane_count: 1,
      width_m: 6,
    };
    const fc = buildLaneSurfaceFeatureCollection([mapRoad], "WGS84");

    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties.is_bus).toBe(false);
    expect(fc.features[0].properties.lane_type).toBe("GENERAL");
  });
});

describe("buildLaneBoundaryFeatureCollection", () => {
  it("produces two edges and no separators for a single-lane road", () => {
    const road = makeRoad({ lanes: [makeLane()] });
    const fc = buildLaneBoundaryFeatureCollection([road], "WGS84");

    const kinds = fc.features.map((f) => f.properties.kind);
    expect(kinds.filter((k) => k === "edge")).toHaveLength(2);
    expect(kinds.filter((k) => k === "separator")).toHaveLength(0);
  });

  it("adds one separator per internal lane boundary for a multi-lane road", () => {
    const road = makeRoad({
      lanes: [
        makeLane({ index: 0 }),
        makeLane({ id: "lane-1", index: 1 }),
        makeLane({ id: "lane-2", index: 2 }),
      ],
    });
    const fc = buildLaneBoundaryFeatureCollection([road], "WGS84");

    const kinds = fc.features.map((f) => f.properties.kind);
    expect(kinds.filter((k) => k === "edge")).toHaveLength(2);
    expect(kinds.filter((k) => k === "separator")).toHaveLength(2);
  });
});

describe("buildTurnArrowFeatureCollection", () => {
  it("draws an arrow only for a lane with real turn:lanes data", () => {
    const road = makeRoad({
      lanes: [
        makeLane({ index: 0, allowed_turns: ["LEFT"] }),
        makeLane({ id: "lane-1", index: 1, allowed_turns: null }),
      ],
    });
    const fc = buildTurnArrowFeatureCollection([road], "WGS84");

    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties.lane_index).toBe(0);
  });

  it("combines multiple turns into one glyph string in source order", () => {
    const road = makeRoad({
      lanes: [makeLane({ index: 0, allowed_turns: ["THROUGH", "RIGHT"] })],
    });
    const fc = buildTurnArrowFeatureCollection([road], "WGS84");

    expect(fc.features[0].properties.arrow).toBe("↑→");
  });

  it("never fabricates an arrow when allowed_turns is absent or empty", () => {
    const road = makeRoad({
      lanes: [
        makeLane({ allowed_turns: undefined }),
        makeLane({ id: "lane-1", index: 1, allowed_turns: [] }),
      ],
    });
    const fc = buildTurnArrowFeatureCollection([road], "WGS84");

    expect(fc.features).toHaveLength(0);
  });

  it("does not draw an arrow for an explicit NONE-only token", () => {
    const road = makeRoad({ lanes: [makeLane({ allowed_turns: ["NONE"] })] });
    const fc = buildTurnArrowFeatureCollection([road], "WGS84");

    expect(fc.features).toHaveLength(0);
  });
});

describe("buildLaneUseMarkingFeatureCollection", () => {
  it("draws nothing when parking/cycleway are UNKNOWN (the default)", () => {
    const road = makeRoad();
    const fc = buildLaneUseMarkingFeatureCollection([road], "WGS84");

    expect(fc.features).toHaveLength(0);
  });

  it("draws nothing when parking is explicitly NONE", () => {
    const road = makeRoad({ parking_left: "NONE", parking_right: "NONE" });
    const fc = buildLaneUseMarkingFeatureCollection([road], "WGS84");

    expect(fc.features).toHaveLength(0);
  });

  it("draws a parking marking only on the side with real source data", () => {
    const road = makeRoad({
      parking_left: "PARALLEL",
      parking_right: "UNKNOWN",
    });
    const fc = buildLaneUseMarkingFeatureCollection([road], "WGS84");

    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties).toMatchObject({
      kind: "parking",
      side: "left",
      value: "PARALLEL",
    });
  });

  it("draws a cycleway marking when present, independent of parking", () => {
    const road = makeRoad({ cycleway_right: "TRACK" });
    const fc = buildLaneUseMarkingFeatureCollection([road], "WGS84");

    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties).toMatchObject({
      kind: "cycleway",
      side: "right",
      value: "TRACK",
    });
  });
});
