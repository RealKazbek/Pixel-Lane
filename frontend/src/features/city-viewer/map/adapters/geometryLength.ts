import { toLngLat } from "./coordinates";
import type { CoordinateSystem, Road } from "../../types/city";

const EARTH_RADIUS_M = 6_371_000;
const DEG_TO_RAD = Math.PI / 180;

function haversineMeters(a: [number, number], b: [number, number]): number {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** A road's real-world length in meters, for both coordinate systems --
 * `toLngLat` already places LOCAL_CARTESIAN points at a consistent
 * (if arbitrary) spot on the globe, so haversine distance between them
 * recovers very close to the original meters. */
export function roadLengthMeters(
  road: Pick<Road, "geometry">,
  coordinateSystem: CoordinateSystem,
): number {
  const points = road.geometry.points.map((point) =>
    toLngLat(coordinateSystem, point),
  );
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineMeters(points[i], points[i + 1]);
  }
  return total;
}
