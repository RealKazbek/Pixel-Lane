/**
 * Lane-to-lane connector curves through a junction -- distinct from
 * decorative lane-separator markings (`laneGeometry.ts`). This is what
 * lets a future vehicle-simulation/routing layer reason explicitly
 * "Lane A -> allowed connection -> Lane B" instead of inferring
 * connectivity from where painted lines happen to end -- see
 * docs/road-geometry.md 6.
 *
 * A cubic Bezier, tangent-continuous at both ends (each lane's own
 * approach direction becomes the curve's tangent there), rather than a
 * straight line through the node -- a turning connection reads as a
 * real curved path, not a kink.
 */

import destination from "@turf/destination";
import bearing from "@turf/bearing";
import { point as turfPoint } from "@turf/helpers";
import distance from "@turf/distance";
import type { LngLat } from "./nodeGeometry";
import type { MovementType } from "../../types/city";

export interface LaneConnectorEndpoint {
  point: LngLat;
  /** Outward bearing away from the junction (degrees, matches
   * `outwardBearing`'s convention) -- the curve's tangent at this end
   * points the *opposite* way (into the junction, toward the other
   * endpoint). */
  outwardBearingDeg: number;
}

const DEFAULT_SAMPLES = 20;
const ARROWHEAD_LENGTH_M = 2.15;
const ARROWHEAD_HALF_ANGLE_DEG = 23;

function cubicBezier(
  p0: LngLat,
  p1: LngLat,
  p2: LngLat,
  p3: LngLat,
  t: number,
): LngLat {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

/** Builds the connector curve from `from` to `to`. Returns `null` if the
 * two endpoints are coincident (nothing meaningful to connect) rather
 * than a degenerate zero-length curve. */
export function buildLaneConnectorCurve(
  from: LaneConnectorEndpoint,
  to: LaneConnectorEndpoint,
  maneuver?: MovementType,
  samples: number = DEFAULT_SAMPLES,
): LngLat[] | null {
  const spanM = distance(turfPoint(from.point), turfPoint(to.point), {
    units: "meters",
  });
  if (spanM < 0.01) return null;

  // Straight movements need restrained handles, while turns benefit from a
  // longer tangent run so the curve reads like a painted lane guide instead
  // of a rounded elbow. U-turn endpoints can be only one lane apart, so their
  // handles must be based on the junction approach rather than that tiny span.
  const handleLength =
    maneuver === "U_TURN"
      ? Math.max(7, spanM * 0.75)
      : Math.max(2.5, spanM * (maneuver === "STRAIGHT" ? 0.3 : 0.42));
  // Control points point INTO the junction -- the opposite direction
  // from each lane's own outward approach bearing.
  const control1 = destination(
    turfPoint(from.point),
    handleLength,
    from.outwardBearingDeg + 180,
    { units: "meters" },
  ).geometry.coordinates as LngLat;
  const control2 = destination(
    turfPoint(to.point),
    handleLength,
    to.outwardBearingDeg + 180,
    { units: "meters" },
  ).geometry.coordinates as LngLat;

  const points: LngLat[] = [];
  for (let i = 0; i <= samples; i++) {
    points.push(
      cubicBezier(from.point, control1, control2, to.point, i / samples),
    );
  }
  return points;
}

/** A crisp open arrowhead whose arms point back from the curve's final
 * tangent. Keeping this as geometry (rather than a font glyph) makes its
 * angle, size, placement, and rotation deterministic on every platform. */
export function buildLaneConnectorArrowhead(curve: LngLat[]): LngLat[] | null {
  if (curve.length < 2) return null;
  const tip = curve.at(-1)!;
  const tangentStart = curve[Math.max(0, curve.length - 4)];
  const travelBearing = bearing(turfPoint(tangentStart), turfPoint(tip));
  if (!Number.isFinite(travelBearing)) return null;

  const armEnd = (side: -1 | 1): LngLat =>
    destination(
      turfPoint(tip),
      ARROWHEAD_LENGTH_M,
      travelBearing + 180 + side * ARROWHEAD_HALF_ANGLE_DEG,
      { units: "meters" },
    ).geometry.coordinates as LngLat;
  return [armEnd(-1), tip, armEnd(1)];
}
