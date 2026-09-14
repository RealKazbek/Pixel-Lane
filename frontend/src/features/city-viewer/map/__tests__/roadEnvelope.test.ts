import { describe, expect, it } from "vitest";
import { lineString as turfLineString } from "@turf/helpers";
import { buildRoadEnvelope } from "../geometry/roadEnvelope";

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
});
