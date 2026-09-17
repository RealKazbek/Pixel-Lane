import type { Point } from "../../types/city";

export function insertPolylinePoint(
  points: Point[],
  segmentIndex: number,
  position: Point,
): Point[] | null {
  if (
    !Number.isInteger(segmentIndex) ||
    segmentIndex < -1 ||
    segmentIndex >= points.length
  )
    return null;
  const next = [...points];
  next.splice(segmentIndex + 1, 0, { x: position.x, y: position.y });
  return next;
}

export function updatePolylineVertex(
  points: Point[],
  vertexIndex: number,
  position: Point,
  minimumDistance = 1,
): Point[] | null {
  if (
    !Number.isInteger(vertexIndex) ||
    vertexIndex < 0 ||
    vertexIndex >= points.length
  )
    return null;
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
  const next = points.map((point, index) =>
    index === vertexIndex ? { x: position.x, y: position.y } : { ...point },
  );
  if (next.length < 2) return null;
  const other =
    vertexIndex === 0
      ? next[1]
      : vertexIndex === next.length - 1
        ? next[next.length - 2]
        : null;
  if (
    other &&
    Math.hypot(position.x - other.x, position.y - other.y) < minimumDistance
  )
    return null;
  return next;
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
