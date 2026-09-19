import { describe, expect, it } from "vitest";
import { lineString as turfLineString } from "@turf/helpers";
import {
  buildFlatRoadCorridor,
  buildRoadEnvelope,
} from "../geometry/roadEnvelope";

describe("buildRoadEnvelope", () => {
  it("builds a finite polygon for an ordinary line", () => {
    const line = turfLineString([
      [0, 0],
      [0, 0.001],
    ]);
    const polygon = buildRoadEnvelope(line, 4);
    expect(polygon).not.toBeNull();
  });

  it("returns null for a non-positive half-width rather than throwing", () => {
    const line = turfLineString([
      [0, 0],
      [0, 0.001],
    ]);
    expect(buildRoadEnvelope(line, 0)).toBeNull();
    expect(buildRoadEnvelope(line, -1)).toBeNull();
  });

  it("does not throw on a zero-length (degenerate) line", () => {
    const line = turfLineString([
      [0, 0],
      [0, 0],
    ]);
    expect(() => buildRoadEnvelope(line, 4)).not.toThrow();
  });

  it("builds a flat-ended corridor without round-cap vertices", () => {
    const corridor = buildFlatRoadCorridor(
      turfLineString([
        [0, 0],
        [0, 0.001],
      ]),
      4,
    );
    expect(corridor).not.toBeNull();
    expect(corridor!.geometry.type).toBe("Polygon");
    expect(corridor!.geometry.coordinates[0]).toHaveLength(5);
  });
});
