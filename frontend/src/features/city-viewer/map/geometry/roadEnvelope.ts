/**
 * Standalone road footprints use `@turf/buffer`. Connected junction
 * approaches use `buildFlatRoadCorridor` below because round buffer caps are
 * not a valid physical model for a rectangular urban intersection.
 */

import bearing from "@turf/bearing";
import buffer from "@turf/buffer";
import destination from "@turf/destination";
import { point as turfPoint } from "@turf/helpers";

export type PolygonFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon
>;

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

/**
 * Builds a constant-width corridor with explicit flat/butt ends.
 *
 * This is deliberately separate from `buildRoadEnvelope`: Turf's buffer is
 * useful for standalone roads, but its round end caps are the wrong physical
 * model at a connected junction. The corridor is an offset polygon built
 * from the centerline vertices, so its boundary is controlled by road edges
 * and its first/last ends are flat across the road width.
 */
export function buildFlatRoadCorridor(
  line: GeoJSON.Feature<GeoJSON.LineString>,
  halfWidthM: number,
): PolygonFeature | null {
  if (!(halfWidthM > 0)) return null;
  const coordinates = line.geometry.coordinates as [number, number][];
  if (coordinates.length < 2) return null;

  try {
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let i = 0; i < coordinates.length; i++) {
      const previous = coordinates[Math.max(0, i - 1)];
      const next = coordinates[Math.min(coordinates.length - 1, i + 1)];
      if (previous[0] === next[0] && previous[1] === next[1]) continue;
      const direction = bearing(turfPoint(previous), turfPoint(next));
      left.push(
        destination(turfPoint(coordinates[i]), halfWidthM, direction - 90, {
          units: "meters",
        }).geometry.coordinates as [number, number],
      );
      right.push(
        destination(turfPoint(coordinates[i]), halfWidthM, direction + 90, {
          units: "meters",
        }).geometry.coordinates as [number, number],
      );
    }
    if (left.length < 2 || right.length < 2) return null;
    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[...left, ...right.reverse(), left[0]]],
      },
    };
  } catch {
    return null;
  }
}
