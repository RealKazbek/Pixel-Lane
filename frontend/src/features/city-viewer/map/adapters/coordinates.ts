/**
 * The one place City Model coordinates are converted to/from MapLibre's
 * `[lng, lat]` tuples. No other module should do this conversion (see
 * map/README.md).
 *
 * - `WGS84`: `Point.x`/`Point.y` already are lon/lat -- passthrough,
 *   lossless.
 * - `LOCAL_CARTESIAN`: has no real-world reference point at all. To keep
 *   local-coordinate example/demo cities viewable on the same MapLibre
 *   map, this anchors them at an arbitrary point (0, 0) and treats local
 *   units as meters offset from it via an inverse equirectangular
 *   projection. This placement is **not geographically meaningful** --
 *   it exists only so the map has *some* valid [lng, lat] to draw.
 */

import type { CoordinateSystem, Point } from "../../types/city";

const EARTH_RADIUS_M = 6_371_000;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const LOCAL_ANCHOR_LON = 0;
const LOCAL_ANCHOR_LAT = 0;

export type LngLat = [number, number];

export function toLngLat(
  coordinateSystem: CoordinateSystem,
  point: Point,
): LngLat {
  if (coordinateSystem === "WGS84") {
    return [point.x, point.y];
  }
  const lat = LOCAL_ANCHOR_LAT + (point.y / EARTH_RADIUS_M) * RAD_TO_DEG;
  const lon =
    LOCAL_ANCHOR_LON +
    (point.x / (EARTH_RADIUS_M * Math.cos(LOCAL_ANCHOR_LAT * DEG_TO_RAD))) *
      RAD_TO_DEG;
  return [lon, lat];
}

/** Inverse of `toLngLat` -- used when an edited MapLibre/Terra Draw
 * geometry is converted back into a City Model `Point` for saving. */
export function fromLngLat(
  coordinateSystem: CoordinateSystem,
  lngLat: LngLat,
): Point {
  const [lon, lat] = lngLat;
  if (coordinateSystem === "WGS84") {
    return { x: lon, y: lat };
  }
  const y = (lat - LOCAL_ANCHOR_LAT) * DEG_TO_RAD * EARTH_RADIUS_M;
  const x =
    (lon - LOCAL_ANCHOR_LON) *
    DEG_TO_RAD *
    (EARTH_RADIUS_M * Math.cos(LOCAL_ANCHOR_LAT * DEG_TO_RAD));
  return { x, y };
}
