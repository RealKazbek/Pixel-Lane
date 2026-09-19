import { describe, expect, it } from "vitest";
import { smoothCenterline } from "../geometry/curveSmoothing";
import type { LngLat } from "../geometry/nodeGeometry";

function isFinitePoints(points: LngLat[]): boolean {
  return points.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
}

describe("smoothCenterline", () => {
  it("never curves a straight 2-point road (no-op)", () => {
    const input: LngLat[] = [
      [0, 0],
      [0, 0.001],
    ];
    expect(smoothCenterline(input)).toEqual(input);
  });

  it("returns the original polyline when smoothing is zero", () => {
    const input: LngLat[] = [
      [0, 0],
      [0.001, 0.001],
      [0.002, 0],
    ];
    expect(smoothCenterline(input, undefined, 0)).toEqual(input);
  });

  it("increases derived curvature with smoothing strength while preserving endpoints", () => {
    const input: LngLat[] = [
      [0, 0],
      [0.001, 0.001],
      [0.002, 0],
    ];
    const low = smoothCenterline(input, undefined, 0.2);
    const high = smoothCenterline(input, undefined, 1);
    expect(high).not.toEqual(low);
    expect(high[0]).toEqual(input[0]);
    expect(high[high.length - 1]).toEqual(input[input.length - 1]);
    expect(isFinitePoints(high)).toBe(true);
  });

  it("smooths internal corners independently", () => {
    const input: LngLat[] = [
      [0, 0],
      [0.001, 0.001],
      [0.002, 0],
      [0.003, 0.001],
    ];
    const firstSharp = smoothCenterline(input, undefined, 1, [0, 0.1, 0]);
    const secondSharp = smoothCenterline(input, undefined, 1, [0, 1, 0]);
    expect(firstSharp).not.toEqual(secondSharp);
    expect(firstSharp[0]).toEqual(input[0]);
    expect(firstSharp[firstSharp.length - 1]).toEqual(input[input.length - 1]);
  });

  it("uses per-corner values even when the road-wide fallback is zero", () => {
    const input: LngLat[] = [
      [0, 0],
      [0.001, 0.001],
      [0.002, 0],
    ];
    const sharp = smoothCenterline(input, undefined, 0, [0, 0, 0]);
    const rounded = smoothCenterline(input, undefined, 0, [0, 1, 0]);
    expect(rounded).not.toEqual(sharp);
    expect(rounded[0]).toEqual(input[0]);
    expect(rounded[rounded.length - 1]).toEqual(input[input.length - 1]);
  });

  it("smooths a bent 3-point road without leaving the original endpoints", () => {
    const input: LngLat[] = [
      [0, 0],
      [0.0005, 0.0005],
      [0, 0.001],
    ];
    const smoothed = smoothCenterline(input);
    expect(smoothed.length).toBeGreaterThan(input.length);
    expect(isFinitePoints(smoothed)).toBe(true);
    expect(smoothed[0]).toEqual(input[0]);
    expect(smoothed[smoothed.length - 1]).toEqual(input[input.length - 1]);
  });

  it("bounds deviation from the original chord via maxTangentInfluence", () => {
    const input: LngLat[] = [
      [0, 0],
      [0.01, 0.01], // a sharp, far-off vertex
      [0, 0.02],
    ];
    const maxTangentInfluence = 0.002;
    const smoothed = smoothCenterline(input, {
      samplesPerSegment: 8,
      maxTangentInfluence,
    });
    expect(isFinitePoints(smoothed)).toBe(true);
    // No smoothed point should be pulled further from the nearest source
    // chord than the configured cap allows (plus a small numeric margin).
    for (const [x, y] of smoothed) {
      const distToNearestSource = Math.min(
        ...input.map(([sx, sy]) => Math.hypot(x - sx, y - sy)),
      );
      expect(distToNearestSource).toBeLessThan(maxTangentInfluence + 0.02);
    }
  });

  it("collapses near-duplicate points instead of producing NaN", () => {
    const input: LngLat[] = [
      [0, 0],
      [0, 0],
      [1e-12, 1e-12],
      [0.001, 0.001],
      [0.002, 0],
    ];
    const smoothed = smoothCenterline(input);
    expect(isFinitePoints(smoothed)).toBe(true);
  });

  it("is deterministic", () => {
    const input: LngLat[] = [
      [0, 0],
      [0.0007, 0.0004],
      [0.0012, 0.0015],
      [0.0005, 0.002],
    ];
    expect(smoothCenterline(input)).toEqual(smoothCenterline(input));
  });

  it("keeps a near-collinear vertex chain close to straight (no bulge from tiny noise)", () => {
    const input: LngLat[] = [
      [0, 0],
      [0.0005, 0.0000001],
      [0.001, -0.0000001],
      [0.0015, 0],
    ];
    const smoothed = smoothCenterline(input);
    expect(isFinitePoints(smoothed)).toBe(true);
    for (const [, y] of smoothed) {
      expect(Math.abs(y)).toBeLessThan(0.0002);
    }
  });

  it("handles a very acute zig-zag vertex without producing NaN", () => {
    const input: LngLat[] = [
      [0, 0],
      [0.001, 0.00001],
      [0.0005, 0.00002],
      [0.0015, 0.00003],
    ];
    const smoothed = smoothCenterline(input);
    expect(isFinitePoints(smoothed)).toBe(true);
  });
});
