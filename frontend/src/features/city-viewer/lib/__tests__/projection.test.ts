import { describe, expect, it } from "vitest";
import { meanLatitude, projectPoint } from "../projection";

describe("projectPoint", () => {
  it("passes LOCAL_CARTESIAN points through unchanged", () => {
    const point = { x: 12.5, y: -3 };
    expect(projectPoint("LOCAL_CARTESIAN", point, 0)).toEqual(point);
  });

  it("projects WGS84 latitude to roughly meters (1 degree ~= 111km)", () => {
    const projected = projectPoint("WGS84", { x: 0, y: 1 }, 0);
    expect(projected.y).toBeCloseTo(111_320, -3);
  });

  it("compresses longitude by cos(latitude) away from the equator", () => {
    const atEquator = projectPoint("WGS84", { x: 1, y: 0 }, 0);
    const at60North = projectPoint("WGS84", { x: 1, y: 60 }, 60);
    // At 60 degrees latitude, a degree of longitude covers about half the
    // ground distance it does at the equator (cos(60deg) = 0.5).
    expect(at60North.x).toBeCloseTo(atEquator.x * 0.5, 0);
  });
});

describe("meanLatitude", () => {
  it("averages the y coordinate of all points", () => {
    expect(
      meanLatitude([
        { x: 0, y: 10 },
        { x: 0, y: 20 },
      ]),
    ).toBeCloseTo(15);
  });

  it("returns 0 for an empty list", () => {
    expect(meanLatitude([])).toBe(0);
  });
});
