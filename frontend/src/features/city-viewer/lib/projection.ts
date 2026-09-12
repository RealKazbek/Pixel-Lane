/**
 * Projects City Model coordinates into a flat local plane for the Canvas
 * viewer.
 *
 * This is a visualization projection, not GIS-grade rendering: for
 * `WGS84` cities it's a simple equirectangular projection around the
 * city's mean latitude (matching the `x`=longitude, `y`=latitude
 * convention documented in the Traffic Engine). It is good enough to draw
 * a self-contained city at city/district scale, not for anything
 * involving a real basemap or long-distance accuracy. `LOCAL_CARTESIAN`
 * coordinates are already a flat plane and pass through unchanged.
 */

import type { CoordinateSystem, Point } from "../types/city";

const EARTH_RADIUS_M = 6_371_000;
const DEG_TO_RAD = Math.PI / 180;

export function meanLatitude(points: Point[]): number {
  if (points.length === 0) return 0;
  return points.reduce((sum, p) => sum + p.y, 0) / points.length;
}

/** Projects one point. `referenceLatitudeDeg` should be the city's mean
 * latitude (see `meanLatitude`) so every point uses the same, consistent
 * longitude-compression factor. */
export function projectPoint(
  coordinateSystem: CoordinateSystem,
  point: Point,
  referenceLatitudeDeg: number,
): Point {
  if (coordinateSystem !== "WGS84") {
    return point;
  }
  const referenceLatRad = referenceLatitudeDeg * DEG_TO_RAD;
  return {
    x: point.x * DEG_TO_RAD * EARTH_RADIUS_M * Math.cos(referenceLatRad),
    y: point.y * DEG_TO_RAD * EARTH_RADIUS_M,
  };
}

export function projectPoints(
  coordinateSystem: CoordinateSystem,
  points: Point[],
  referenceLatitudeDeg: number,
): Point[] {
  return points.map((p) =>
    projectPoint(coordinateSystem, p, referenceLatitudeDeg),
  );
}
