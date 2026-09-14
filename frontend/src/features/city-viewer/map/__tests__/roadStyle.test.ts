import { describe, expect, it } from "vitest";
import {
  roadCasingWidthMeters,
  roadHierarchy,
  roadWidthMeters,
} from "../styles/roadStyle";
import type { Lane, RoadType } from "../../types/city";

function makeLanes(count: number): Lane[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `lane-${index}`,
    road_id: "road-1",
    index,
    direction: "FORWARD" as const,
    allowed_movements: [],
    lane_type: "GENERAL" as const,
    speed_limit_kmh: null,
  }));
}

describe("roadWidthMeters", () => {
  it("scales with lane count", () => {
    const narrow = roadWidthMeters({
      lanes: makeLanes(1),
      road_type: "RESIDENTIAL",
    });
    const wide = roadWidthMeters({
      lanes: makeLanes(4),
      road_type: "RESIDENTIAL",
    });
    expect(wide).toBeGreaterThan(narrow);
  });

  it("treats zero lanes as at least one lane", () => {
    expect(roadWidthMeters({ lanes: [], road_type: "RESIDENTIAL" })).toBe(
      roadWidthMeters({ lanes: makeLanes(1), road_type: "RESIDENTIAL" }),
    );
  });

  it("gives a higher hierarchy a wider road at the same lane count", () => {
    const lanes = makeLanes(2);
    const highway = roadWidthMeters({ lanes, road_type: "HIGHWAY" });
    const residential = roadWidthMeters({ lanes, road_type: "RESIDENTIAL" });
    expect(highway).toBeGreaterThan(residential);
  });

  it("prefers an explicit width_m from the backend over the lane-count estimate", () => {
    const explicit = roadWidthMeters({
      lanes: makeLanes(1),
      road_type: "RESIDENTIAL",
      width_m: 30,
    });
    expect(explicit).toBe(30);
  });

  it("falls back to the lane-count estimate when width_m is absent (backward compatibility)", () => {
    const withoutWidth = roadWidthMeters({
      lanes: makeLanes(2),
      road_type: "RESIDENTIAL",
      width_m: null,
    });
    const legacy = roadWidthMeters({ lanes: makeLanes(2), road_type: "RESIDENTIAL" });
    expect(withoutWidth).toBe(legacy);
  });

  it("ignores a non-positive width_m rather than trusting bad data", () => {
    const zeroWidth = roadWidthMeters({
      lanes: makeLanes(2),
      road_type: "RESIDENTIAL",
      width_m: 0,
    });
    const legacy = roadWidthMeters({ lanes: makeLanes(2), road_type: "RESIDENTIAL" });
    expect(zeroWidth).toBe(legacy);
  });
});

describe("roadCasingWidthMeters", () => {
  it("is always wider than the surface width", () => {
    const road = { lanes: makeLanes(2), road_type: "ARTERIAL" as RoadType };
    expect(roadCasingWidthMeters(road)).toBeGreaterThan(roadWidthMeters(road));
  });
});

describe("roadHierarchy", () => {
  it("passes known road types through unchanged", () => {
    const knownTypes: RoadType[] = [
      "RESIDENTIAL",
      "COLLECTOR",
      "ARTERIAL",
      "HIGHWAY",
      "SERVICE",
    ];
    for (const type of knownTypes) {
      expect(roadHierarchy(type)).toBe(type);
    }
  });

  it("falls back to OTHER for an unrecognized road type", () => {
    expect(roadHierarchy("SOMETHING_NEW" as RoadType)).toBe("OTHER");
  });
});
