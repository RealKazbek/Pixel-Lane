/**
 * Approximates a lane's centerline as a perpendicular offset from the
 * road's centerline. This is a visualization approximation, not GIS-grade
 * geometry: joints between segments use an averaged normal rather than a
 * true miter/bevel, which is visibly fine at road-network zoom levels.
 */

import type { Point } from "../types/city";

export const LANE_WIDTH = 3.2; // meters -- a typical urban lane width

/** Perpendicular unit normal (rotated 90° left of travel direction) for
 * each segment of `points`. */
function segmentNormals(points: Point[]): Point[] {
  const normals: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const length = Math.hypot(dx, dy) || 1;
    normals.push({ x: -dy / length, y: dx / length });
  }
  return normals;
}

/** Offsets every point of `points` by `distance` along the local normal
 * (positive = left of travel direction, negative = right). */
export function offsetPolyline(points: Point[], distance: number): Point[] {
  if (points.length < 2 || distance === 0) return points;
  const normals = segmentNormals(points);

  return points.map((point, i) => {
    let nx: number;
    let ny: number;
    if (i === 0) {
      ({ x: nx, y: ny } = normals[0]);
    } else if (i === points.length - 1) {
      ({ x: nx, y: ny } = normals[normals.length - 1]);
    } else {
      nx = (normals[i - 1].x + normals[i].x) / 2;
      ny = (normals[i - 1].y + normals[i].y) / 2;
      const length = Math.hypot(nx, ny) || 1;
      nx /= length;
      ny /= length;
    }
    return { x: point.x + nx * distance, y: point.y + ny * distance };
  });
}

/** Assigns each lane on a road a distinct offset from the centerline:
 * FORWARD lanes fan out to one side (right of travel), BACKWARD lanes to
 * the other, each ordered by `index` outward from the centerline. */
export function laneOffsetDistance(
  laneDirection: "FORWARD" | "BACKWARD",
  laneIndex: number,
  laneWidth: number = LANE_WIDTH,
): number {
  const slot = laneIndex + 0.5;
  return laneDirection === "FORWARD" ? -slot * laneWidth : slot * laneWidth;
}

/** Total length of a polyline, used to space direction arrows evenly. */
export function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.hypot(
      points[i + 1].x - points[i].x,
      points[i + 1].y - points[i].y,
    );
  }
  return total;
}

export interface ArrowPlacement {
  position: Point;
  /** Unit vector pointing along the direction of travel. */
  direction: Point;
}

/** Points (with heading) evenly spaced along a polyline, at roughly
 * `spacing` apart, for drawing direction arrows without cluttering the
 * view. `reverse` flips travel direction (for BACKWARD lanes). */
export function arrowPlacements(
  points: Point[],
  spacing: number,
  reverse = false,
): ArrowPlacement[] {
  const ordered = reverse ? [...points].reverse() : points;
  const total = polylineLength(ordered);
  if (total < spacing / 2) return [];

  const count = Math.max(1, Math.floor(total / spacing));
  const placements: ArrowPlacement[] = [];
  let segmentIndex = 0;
  let segmentStart = 0;

  for (let step = 1; step <= count; step++) {
    const target = (total * step) / (count + 1);
    while (
      segmentIndex < ordered.length - 2 &&
      segmentStart +
        Math.hypot(
          ordered[segmentIndex + 1].x - ordered[segmentIndex].x,
          ordered[segmentIndex + 1].y - ordered[segmentIndex].y,
        ) <
        target
    ) {
      segmentStart += Math.hypot(
        ordered[segmentIndex + 1].x - ordered[segmentIndex].x,
        ordered[segmentIndex + 1].y - ordered[segmentIndex].y,
      );
      segmentIndex++;
    }
    const a = ordered[segmentIndex];
    const b = ordered[segmentIndex + 1] ?? a;
    const segmentLength = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const t = Math.min(1, Math.max(0, (target - segmentStart) / segmentLength));
    placements.push({
      position: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
      direction: {
        x: (b.x - a.x) / segmentLength,
        y: (b.y - a.y) / segmentLength,
      },
    });
  }
  return placements;
}
