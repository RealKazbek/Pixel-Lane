/**
 * A road's physical footprint polygon, generated from its centerline +
 * real-world half-width via `@turf/buffer`. This is the one place a
 * plain constant-width envelope is built -- `mergeTaper.ts` builds the
 * variable-width alternative for a slip-road/merge approach, and
 * `junctionSolver.ts` calls this on each road's *trimmed* centerline
 * (the portion outside the node radius) rather than the full line, so
 * independently-buffered envelopes stop short of a junction instead of
 * overlapping neighboring roads there.
 */

import buffer from "@turf/buffer";

export type PolygonFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;

/** `null` on a degenerate/zero-length input rather than throwing --
 * callers skip rather than propagate invalid geometry. */
export function buildRoadEnvelope(
  line: GeoJSON.Feature<GeoJSON.LineString>,
  halfWidthM: number,
): PolygonFeature | null {
  if (!(halfWidthM > 0)) return null;
  try {
    return buffer(line, halfWidthM, { units: "meters", steps: 8 }) ?? null;
  } catch {
    return null;
  }
}
