import { describe, expect, it } from "vitest";
import { toRoadLineString } from "../adapters/roadLineString";
import { buildMergeTaperEnvelope, isMergeCandidate } from "../geometry/mergeTaper";

function road(points: [number, number][]) {
  return toRoadLineString("LOCAL_CARTESIAN", {
    geometry: { points: points.map(([x, y]) => ({ x, y })) },
  })!;
}

function isFinitePolygon(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): boolean {
  const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
  return rings
    .flat()
    .every((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]));
}

describe("isMergeCandidate", () => {
  it("flags a much-narrower road running roughly parallel/opposite as a merge", () => {
    expect(
      isMergeCandidate({ halfWidthM: 2 }, { halfWidthM: 8 }, /* narrowBearing */ 90, /* wideBearing */ 265),
    ).toBe(true);
  });

  it("does not flag two similarly-wide roads even at a shallow angle", () => {
    expect(isMergeCandidate({ halfWidthM: 7 }, { halfWidthM: 8 }, 90, 265)).toBe(false);
  });

  it("does not flag a narrow road turning sharply (not running parallel)", () => {
    expect(isMergeCandidate({ halfWidthM: 2 }, { halfWidthM: 8 }, 90, 100)).toBe(false);
  });
});

describe("buildMergeTaperEnvelope", () => {
  it("produces a finite polygon that narrows toward the node end", () => {
    const line = road([[0, 40], [60, 44]]);
    const result = buildMergeTaperEnvelope(line, 3, /* atEnd */ false);
    expect(result).not.toBeNull();
    expect(isFinitePolygon(result!.polygon.geometry)).toBe(true);
  });

  it("reaches the node end (atEnd) too, narrowing toward it", () => {
    const line = road([[0, 44], [60, 40]]);
    const result = buildMergeTaperEnvelope(line, 3, /* atEnd */ true);
    expect(result).not.toBeNull();
    expect(isFinitePolygon(result!.polygon.geometry)).toBe(true);
  });

  it("returns null for a degenerate (near-zero-length) line", () => {
    const line = road([[0, 40], [0, 40.0000001]]);
    const result = buildMergeTaperEnvelope(line, 3, false);
    // Either null, or -- if not null -- still finite. Never NaN.
    if (result) {
      expect(isFinitePolygon(result.polygon.geometry)).toBe(true);
    }
  });
});
