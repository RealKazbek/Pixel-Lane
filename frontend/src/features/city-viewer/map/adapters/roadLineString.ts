/**
 * Shared "Road -> turf LineString" conversion, used by every adapter that
 * needs to run real geometric operations (offset, buffer, length) on a
 * Road's centerline -- kept in one place so `laneGeometry.ts` and
 * `roadSurfaceGeometry.ts` don't each carry their own copy (see
 * map/README.md).
 */

import { lineString as turfLineString } from "@turf/helpers";
import { toLngLat } from "./coordinates";
import type { CoordinateSystem, MapRoad, Road } from "../../types/city";

export type AnyRoad = Road | MapRoad;

/** `null` for degenerate geometry (fewer than 2 points) -- callers must
 * skip rather than pass that through to a turf operation, which would
 * throw. */
export function toRoadLineString(
  coordinateSystem: CoordinateSystem,
  road: Pick<AnyRoad, "geometry">,
): GeoJSON.Feature<GeoJSON.LineString> | null {
  const points = road.geometry.points;
  if (points.length < 2) return null;
  const coords = points.map((p) => toLngLat(coordinateSystem, p));
  return turfLineString(coords);
}
