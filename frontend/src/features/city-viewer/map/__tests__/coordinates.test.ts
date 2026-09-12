import { describe, expect, it } from "vitest";
import { fromLngLat, toLngLat } from "../adapters/coordinates";

describe("toLngLat", () => {
  it("passes WGS84 points through unchanged (x=lon, y=lat)", () => {
    expect(toLngLat("WGS84", { x: 76.9, y: 43.2 })).toEqual([76.9, 43.2]);
  });

  it("anchors LOCAL_CARTESIAN points at a valid, finite lng/lat", () => {
    const [lng, lat] = toLngLat("LOCAL_CARTESIAN", { x: 1000, y: 500 });
    expect(Number.isFinite(lng)).toBe(true);
    expect(Number.isFinite(lat)).toBe(true);
  });

  it("maps the LOCAL_CARTESIAN origin to the anchor (0, 0)", () => {
    expect(toLngLat("LOCAL_CARTESIAN", { x: 0, y: 0 })).toEqual([0, 0]);
  });
});

describe("fromLngLat", () => {
  it("is the inverse of toLngLat for WGS84", () => {
    const point = { x: 76.9, y: 43.2 };
    const roundTripped = fromLngLat("WGS84", toLngLat("WGS84", point));
    expect(roundTripped).toEqual(point);
  });

  it("round-trips LOCAL_CARTESIAN points within a small tolerance", () => {
    const point = { x: 1234.5, y: -678.9 };
    const roundTripped = fromLngLat("LOCAL_CARTESIAN", toLngLat("LOCAL_CARTESIAN", point));
    expect(roundTripped.x).toBeCloseTo(point.x, 3);
    expect(roundTripped.y).toBeCloseTo(point.y, 3);
  });
});
