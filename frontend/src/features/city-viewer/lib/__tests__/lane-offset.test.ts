import { describe, expect, it } from "vitest";
import {
  arrowPlacements,
  laneOffsetDistance,
  offsetPolyline,
  polylineLength,
} from "../lane-offset";

describe("offsetPolyline", () => {
  it("offsets a horizontal road perpendicular to its direction", () => {
    const road = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const offset = offsetPolyline(road, 2);
    // Perpendicular to a horizontal segment is vertical.
    expect(offset[0].x).toBeCloseTo(0);
    expect(Math.abs(offset[0].y)).toBeCloseTo(2);
    expect(offset[1].y).toBeCloseTo(offset[0].y);
  });

  it("offsets a vertical road perpendicular to its direction", () => {
    const road = [
      { x: 0, y: 0 },
      { x: 0, y: 10 },
    ];
    const offset = offsetPolyline(road, 3);
    expect(Math.abs(offset[0].x)).toBeCloseTo(3);
    expect(offset[0].y).toBeCloseTo(0);
  });

  it("returns the original points when distance is 0", () => {
    const road = [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
    ];
    expect(offsetPolyline(road, 0)).toEqual(road);
  });
});

describe("laneOffsetDistance", () => {
  it("puts FORWARD and BACKWARD lanes on opposite sides", () => {
    const forward = laneOffsetDistance("FORWARD", 0);
    const backward = laneOffsetDistance("BACKWARD", 0);
    expect(Math.sign(forward)).not.toBe(Math.sign(backward));
  });

  it("fans multiple lanes on the same side out from the centerline", () => {
    const lane0 = laneOffsetDistance("FORWARD", 0);
    const lane1 = laneOffsetDistance("FORWARD", 1);
    expect(Math.abs(lane1)).toBeGreaterThan(Math.abs(lane0));
  });
});

describe("polylineLength", () => {
  it("sums segment lengths", () => {
    const length = polylineLength([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 4 },
    ]);
    expect(length).toBeCloseTo(7);
  });
});

describe("arrowPlacements", () => {
  it("places arrows pointing along the travel direction", () => {
    const placements = arrowPlacements(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      40,
    );
    expect(placements.length).toBeGreaterThan(0);
    for (const placement of placements) {
      expect(placement.direction.x).toBeCloseTo(1);
      expect(placement.direction.y).toBeCloseTo(0);
    }
  });

  it("reverses direction for BACKWARD lanes", () => {
    const [placement] = arrowPlacements(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      40,
      true,
    );
    expect(placement.direction.x).toBeCloseTo(-1);
  });
});
