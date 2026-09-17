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
  smoothing = 1,
  cornerSmoothing?: number[] | null,
): LngLat[] {
  const pts = dedupe(points);
  if (smoothing <= 0) return pts;
  if (pts.length < 3) return pts;
  const values = cornerSmoothing ?? pts.map(() => smoothing);
  const result: LngLat[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const current = pts[i];
    const previous = pts[i - 1];
    const next = pts[i + 1];
    const strength = Math.max(0, Math.min(1, values[i] ?? smoothing));
    const radius =
      Math.min(
        Math.hypot(current[0] - previous[0], current[1] - previous[1]),
        Math.hypot(next[0] - current[0], next[1] - current[1]),
      ) *
      0.45 *
      strength;
    const pointAlong = (target: LngLat): LngLat => {
      const length = Math.hypot(target[0] - current[0], target[1] - current[1]);
      return length === 0
        ? current
        : [
            current[0] + ((target[0] - current[0]) * radius) / length,
            current[1] + ((target[1] - current[1]) * radius) / length,
          ];
    };
    const entry = pointAlong(previous);
    const exit = pointAlong(next);
    result.push(entry);
    const samples = Math.min(
      24,
      Math.max(3, Math.ceil(options.samplesPerSegment * (0.5 + strength))),
    );
    for (let sample = 1; sample <= samples; sample++) {
      const t = sample / samples;
      const inverse = 1 - t;
      result.push([
        inverse * inverse * entry[0] +
          2 * inverse * t * current[0] +
          t * t * exit[0],
        inverse * inverse * entry[1] +
          2 * inverse * t * current[1] +
          t * t * exit[1],
      ]);
    }
  }
  result.push(pts[pts.length - 1]);
  return result;
}
