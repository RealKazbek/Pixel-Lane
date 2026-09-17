import type { Point } from "../../types/city";

export function updateRoadEndpoint(
  points: [Point, Point],
  endpointIndex: 0 | 1,
  next: Point,
  minimumDistance = 1,
): [Point, Point] | null {
  const opposite = points[endpointIndex === 0 ? 1 : 0];
  if (!Number.isFinite(next.x) || !Number.isFinite(next.y)) return null;
  if (Math.hypot(next.x - opposite.x, next.y - opposite.y) < minimumDistance) {
    return null;
  }
  const result: [Point, Point] = [...points];
  result[endpointIndex] = { x: next.x, y: next.y };
  return result;
}
