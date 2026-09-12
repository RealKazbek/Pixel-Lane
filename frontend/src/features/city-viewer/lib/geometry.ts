import type { Point } from "../types/city";

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** World-space (already-projected) <-> canvas-pixel transform. World Y is
 * up; canvas Y is down, so the transform flips Y. */
export interface Viewport {
  scale: number;
  translateX: number;
  translateY: number;
}

const FALLBACK_HALF_EXTENT = 50;
const MIN_SCALE = 0.01;
const MAX_SCALE = 500;

export function computeBounds(points: Point[]): Bounds {
  if (points.length === 0) {
    return {
      minX: -FALLBACK_HALF_EXTENT,
      minY: -FALLBACK_HALF_EXTENT,
      maxX: FALLBACK_HALF_EXTENT,
      maxY: FALLBACK_HALF_EXTENT,
    };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  // A single point (or all points coincident) would otherwise produce a
  // zero-size bounds and an infinite fit-to-view scale.
  if (minX === maxX) {
    minX -= FALLBACK_HALF_EXTENT;
    maxX += FALLBACK_HALF_EXTENT;
  }
  if (minY === maxY) {
    minY -= FALLBACK_HALF_EXTENT;
    maxY += FALLBACK_HALF_EXTENT;
  }
  return { minX, minY, maxX, maxY };
}

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** A viewport that centers `bounds` in a `canvasWidth`x`canvasHeight`
 * canvas, leaving `paddingPx` of breathing room on every side. */
export function fitToView(
  bounds: Bounds,
  canvasWidth: number,
  canvasHeight: number,
  paddingPx = 48,
): Viewport {
  const boundsWidth = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const boundsHeight = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const availableWidth = Math.max(canvasWidth - paddingPx * 2, 1);
  const availableHeight = Math.max(canvasHeight - paddingPx * 2, 1);

  const scale = clampScale(
    Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight),
  );

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return {
    scale,
    translateX: canvasWidth / 2 - centerX * scale,
    translateY: canvasHeight / 2 + centerY * scale,
  };
}

export function worldToCanvas(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.scale + viewport.translateX,
    y: -point.y * viewport.scale + viewport.translateY,
  };
}

export function canvasToWorld(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.translateX) / viewport.scale,
    y: -(point.y - viewport.translateY) / viewport.scale,
  };
}

/** Zoom around a fixed canvas point (e.g. the cursor), keeping the world
 * point currently under it in the same place after the zoom. */
export function zoomAt(
  viewport: Viewport,
  canvasPoint: Point,
  factor: number,
): Viewport {
  const worldBefore = canvasToWorld(canvasPoint, viewport);
  const scale = clampScale(viewport.scale * factor);
  return {
    scale,
    translateX: canvasPoint.x - worldBefore.x * scale,
    translateY: canvasPoint.y + worldBefore.y * scale,
  };
}

/** Re-centers the viewport on `worldPoint` without changing the current
 * zoom level (used by "click a bottleneck in the sidebar" centering). */
export function centerViewport(
  viewport: Viewport,
  worldPoint: Point,
  canvasWidth: number,
  canvasHeight: number,
): Viewport {
  return {
    scale: viewport.scale,
    translateX: canvasWidth / 2 - worldPoint.x * viewport.scale,
    translateY: canvasHeight / 2 + worldPoint.y * viewport.scale,
  };
}

export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return {
    ...viewport,
    translateX: viewport.translateX + dx,
    translateY: viewport.translateY + dy,
  };
}

function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/** Minimum distance from `point` to any segment of `polyline`. */
export function distancePointToPolyline(
  point: Point,
  polyline: Point[],
): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1)
    return Math.hypot(point.x - polyline[0].x, point.y - polyline[0].y);
  let min = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = distancePointToSegment(point, polyline[i], polyline[i + 1]);
    if (d < min) min = d;
  }
  return min;
}
