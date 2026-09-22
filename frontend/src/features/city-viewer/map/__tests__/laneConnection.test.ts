import { describe, expect, it } from "vitest";
import distance from "@turf/distance";
import { point } from "@turf/helpers";
import {
  buildLaneConnectorArrowhead,
  buildLaneConnectorCurve,
} from "../geometry/laneConnection";
import type { LngLat } from "../geometry/nodeGeometry";

function isFinitePoints(points: LngLat[]): boolean {
  return points.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
}

describe("buildLaneConnectorCurve", () => {
  it("connects two straight-through lanes with a finite curve reaching both endpoints", () => {
    const from = { point: [0, 0] as LngLat, outwardBearingDeg: 180 };
    const to = { point: [0, 0.0005] as LngLat, outwardBearingDeg: 0 };
    const curve = buildLaneConnectorCurve(from, to);
    expect(curve).not.toBeNull();
    expect(isFinitePoints(curve!)).toBe(true);
    expect(curve![0]).toEqual(from.point);
    expect(curve![curve!.length - 1]).toEqual(to.point);
  });

  it("connects a 90-degree turning pair with a smooth (non-kinked) curve", () => {
    const from = { point: [0, 0] as LngLat, outwardBearingDeg: 180 };
    const to = { point: [0.0005, 0.0003] as LngLat, outwardBearingDeg: 90 };
    const curve = buildLaneConnectorCurve(from, to);
    expect(curve).not.toBeNull();
    expect(isFinitePoints(curve!)).toBe(true);
    // A real curve should have more than just its two endpoints.
    expect(curve!.length).toBeGreaterThan(2);
  });

  it("builds a symmetric open arrowhead at the curve tip", () => {
    const curve = buildLaneConnectorCurve(
      { point: [0, 0] as LngLat, outwardBearingDeg: 180 },
      { point: [0.0005, 0.0003] as LngLat, outwardBearingDeg: 90 },
      "RIGHT",
    );
    const arrowhead = buildLaneConnectorArrowhead(curve!);

    expect(arrowhead).not.toBeNull();
    expect(arrowhead![1]).toEqual(curve!.at(-1));
    expect(arrowhead![0]).not.toEqual(arrowhead![2]);
    expect(
      distance(point(arrowhead![0]), point(arrowhead![1]), {
        units: "meters",
      }),
    ).toBeLessThan(2.2);
  });

  it("gives U-turns enough curvature despite adjacent lane endpoints", () => {
    const from = { point: [0, 0] as LngLat, outwardBearingDeg: 180 };
    const to = { point: [0.00003, 0] as LngLat, outwardBearingDeg: 180 };
    const curve = buildLaneConnectorCurve(from, to, "U_TURN");
    const latitudes = curve!.map((coordinate) => coordinate[1]);

    expect(Math.max(...latitudes) - Math.min(...latitudes)).toBeGreaterThan(
      0.00003,
    );
  });

  it("returns null for coincident endpoints instead of a degenerate curve", () => {
    const from = { point: [0, 0] as LngLat, outwardBearingDeg: 180 };
    const to = { point: [0, 0] as LngLat, outwardBearingDeg: 0 };
    expect(buildLaneConnectorCurve(from, to)).toBeNull();
  });

  it("is deterministic", () => {
    const from = { point: [0, 0] as LngLat, outwardBearingDeg: 170 };
    const to = { point: [0.0004, 0.0006] as LngLat, outwardBearingDeg: 20 };
    expect(buildLaneConnectorCurve(from, to)).toEqual(
      buildLaneConnectorCurve(from, to),
    );
  });
});
