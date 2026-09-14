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
