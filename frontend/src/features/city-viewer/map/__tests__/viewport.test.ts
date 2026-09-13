import { describe, expect, it } from "vitest";
import { LngLatBounds } from "maplibre-gl";
import { boundsToBufferedBBox, isBBoxContained } from "../adapters/viewport";

describe("boundsToBufferedBBox", () => {
  it("expands the bounds by a fixed ratio on every side", () => {
    const bounds = new LngLatBounds([10, 10], [11, 12]);
    const bbox = boundsToBufferedBBox(bounds);

    // width=1 -> buffer 0.25 each side; height=2 -> buffer 0.5 each side.
    expect(bbox.minLon).toBeCloseTo(10 - 0.25);
    expect(bbox.maxLon).toBeCloseTo(11 + 0.25);
    expect(bbox.minLat).toBeCloseTo(10 - 0.5);
    expect(bbox.maxLat).toBeCloseTo(12 + 0.5);
  });

  it("clamps the buffer to valid WGS84 ranges near the antimeridian/poles", () => {
    const bounds = new LngLatBounds([179, 89], [179.9, 89.9]);
    const bbox = boundsToBufferedBBox(bounds);

    expect(bbox.maxLon).toBeLessThanOrEqual(180);
    expect(bbox.maxLat).toBeLessThanOrEqual(90);
  });
});

describe("isBBoxContained", () => {
  const outer = { minLon: 0, minLat: 0, maxLon: 10, maxLat: 10 };

  it("is true when inner is fully within outer", () => {
    expect(
      isBBoxContained({ minLon: 1, minLat: 1, maxLon: 9, maxLat: 9 }, outer),
    ).toBe(true);
  });

  it("is true when inner exactly equals outer", () => {
    expect(isBBoxContained(outer, outer)).toBe(true);
  });

  it("is false when inner extends past any edge of outer", () => {
    expect(
      isBBoxContained({ minLon: -1, minLat: 1, maxLon: 9, maxLat: 9 }, outer),
    ).toBe(false);
    expect(
      isBBoxContained({ minLon: 1, minLat: 1, maxLon: 11, maxLat: 9 }, outer),
    ).toBe(false);
  });

  it("is false when inner and outer don't overlap at all", () => {
    expect(
      isBBoxContained(
        { minLon: 20, minLat: 20, maxLon: 21, maxLat: 21 },
        outer,
      ),
    ).toBe(false);
  });
});
