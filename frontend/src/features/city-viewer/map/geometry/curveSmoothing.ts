/**
 * Catmull-Rom centerline smoothing -- resamples an already-curved
 * centerline into a smooth curve without introducing curvature that
 * wasn't already there.
 *
 * A straight 2-point road is a no-op by construction (Catmull-Rom needs
 * a bend to have anything to smooth), so this never curves a road that
 * was straight in the source data -- matches the task's "do not
 * arbitrarily curve every real road" requirement without a separate
 * "isCurved" flag anywhere.
 *
 * Gated to `LOCAL_CARTESIAN` only by the caller (`roadSurfaceGeometry.ts`
 * / `laneGeometry.ts`) for the same reason `laneGeometry.ts`'s per-lane
 * offsetting already is: real OSM polylines have sharp angles at
 * simplification points, very short segments, and near-duplicate points
 * (see docs/city-model.md's Real-Almaty-vs-Demo-City section) that this
 * has not been validated against. Lifting that gate is future work once
 * real input geometry is curated/pre-simplified.
 */

import type { LngLat } from "./nodeGeometry";

export interface SmoothingOptions {
  /** How many interpolated points to insert per original segment. */
  samplesPerSegment: number;
  /** Maximum lateral distance (degrees, same units as the input
   * coordinates) a smoothed point may deviate from the straight chord
   * between its two nearest original vertices -- bounds how much a
   * single sharp source vertex can bow the curve, so smoothing softens a
   * bend instead of distorting the route. */
  maxTangentInfluence: number;
}

export const DEFAULT_SMOOTHING_OPTIONS: SmoothingOptions = {
  samplesPerSegment: 6,
  maxTangentInfluence: 0.35,
};

function catmullRomPoint(
  p0: LngLat,
  p1: LngLat,
  p2: LngLat,
  p3: LngLat,
  t: number,
): LngLat {
  const t2 = t * t;
  const t3 = t2 * t;
  const c = (a: number, b: number, cc: number, d: number) =>
    0.5 *
    (2 * b +
      (-a + cc) * t +
      (2 * a - 5 * b + 4 * cc - d) * t2 +
      (-a + 3 * b - 3 * cc + d) * t3);
  return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
}

function clampToChord(
  point: LngLat,
  chordStart: LngLat,
  chordEnd: LngLat,
  maxDeviation: number,
): LngLat {
  // Perpendicular distance from `point` to the chord line; if within
  // bounds, keep it as-is, otherwise pull it back toward the chord.
  const dx = chordEnd[0] - chordStart[0];
  const dy = chordEnd[1] - chordStart[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return point;
  const t = ((point[0] - chordStart[0]) * dx + (point[1] - chordStart[1]) * dy) / lenSq;
  const projX = chordStart[0] + t * dx;
  const projY = chordStart[1] + t * dy;
  const devX = point[0] - projX;
  const devY = point[1] - projY;
  const dev = Math.hypot(devX, devY);
  if (dev <= maxDeviation || dev === 0) return point;
  const scale = maxDeviation / dev;
  return [projX + devX * scale, projY + devY * scale];
}

/** Skips near-duplicate consecutive points (a degenerate segment would
 * otherwise produce a NaN/undefined tangent). */
function dedupe(points: LngLat[]): LngLat[] {
  const out: LngLat[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 1e-10) {
      out.push(p);
    }
  }
  return out;
}

/** Smooths a polyline. Returns the input unchanged (deduplicated only)
 * for fewer than 3 usable points -- a straight 2-point road has nothing
 * to smooth. */
export function smoothCenterline(
  points: LngLat[],
  options: SmoothingOptions = DEFAULT_SMOOTHING_OPTIONS,
): LngLat[] {
  const pts = dedupe(points);
  if (pts.length < 3) return pts;

  const result: LngLat[] = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 1; s <= options.samplesPerSegment; s++) {
      const t = s / options.samplesPerSegment;
      const raw = catmullRomPoint(p0, p1, p2, p3, t);
      result.push(clampToChord(raw, p1, p2, options.maxTangentInfluence));
    }
  }
  return result;
}
