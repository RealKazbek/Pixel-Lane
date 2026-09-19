/**
 * Shared per-junction sizing/trim helpers used by `junctionSolver.ts` and
 * `mergeTaper.ts`: how far a road gets trimmed back from a node before
 * the junction plate takes over, how big a corner fillet should be, and
 * matching a road's end to a node position.
 *
 * Sizing formulas here are calibrated for visual legibility (a plausible
 * "curb return radius"), not measured from real Almaty intersections --
 * same status as `styles/roadStyle.ts`'s width constants.
 */

import bearing from "@turf/bearing";
import destination from "@turf/destination";
import distance from "@turf/distance";
import { point as turfPoint } from "@turf/helpers";
import length from "@turf/length";
import lineSliceAlong from "@turf/line-slice-along";
import type { RoadHierarchy } from "../styles/roadStyle";

export type LngLat = [number, number];

export const MIN_NODE_RADIUS_M = 3;
export const MAX_NODE_RADIUS_M = 22;
export const MIN_CORNER_RADIUS_M = 1.5;
export const MAX_CORNER_RADIUS_M = 12;
/** Default derived junction curb-return radius.  This is intentionally a
 * geometry option rather than a persisted topology property: junction
 * surfaces remain derived from the City Model graph and can later be wired
 * to a renderer/editor setting without changing road identity. */
export const DEFAULT_JUNCTION_CORNER_RADIUS_M = 6;
const ENDPOINT_MATCH_TOLERANCE_M = 0.5;

/** One road's data as seen from a single node it's incident to. */
export interface IncidentRoad {
  roadId: string;
  halfWidthM: number;
  hierarchy: RoadHierarchy;
  /** The road's full centerline, in [lng, lat]. */
  line: GeoJSON.Feature<GeoJSON.LineString>;
  /** True if the node sits at the line's last coordinate, false if at the first. */
  atEnd: boolean;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function pointsMatch(a: LngLat, b: LngLat): boolean {
  return (
    distance(turfPoint(a), turfPoint(b), { units: "meters" }) <=
    ENDPOINT_MATCH_TOLERANCE_M
  );
}

/** Real-world node radius: how far every incident road is trimmed back
 * before the junction plate takes over. Driven by the widest incident
 * road so a highway x residential junction still gets a radius that fits
 * the highway, not the side street. */
export function computeNodeRadius(
  incident: Pick<IncidentRoad, "halfWidthM">[],
): number {
  const maxHalfWidth = Math.max(...incident.map((r) => r.halfWidthM));
  return clamp(maxHalfWidth * 1.6 + 2, MIN_NODE_RADIUS_M, MAX_NODE_RADIUS_M);
}

const HIERARCHY_CORNER_BONUS_M: Record<RoadHierarchy, number> = {
  HIGHWAY: 6,
  ARTERIAL: 4,
  COLLECTOR: 2.5,
  RESIDENTIAL: 1,
  SERVICE: 0,
  OTHER: 0,
};

/** Curb-return radius for the corner between two specific incident
 * roads. Major roads get a bigger radius than a tiny residential/service
 * pair, per the task's "major roads produce larger corner radii" rule. */
export function cornerRadiusForPair(
  a: Pick<IncidentRoad, "halfWidthM" | "hierarchy">,
  b: Pick<IncidentRoad, "halfWidthM" | "hierarchy">,
): number {
  const narrower = Math.min(a.halfWidthM, b.halfWidthM);
  const bonus = Math.max(
    HIERARCHY_CORNER_BONUS_M[a.hierarchy],
    HIERARCHY_CORNER_BONUS_M[b.hierarchy],
  );
  return clamp(
    narrower * 0.9 + bonus,
    MIN_CORNER_RADIUS_M,
    MAX_CORNER_RADIUS_M,
  );
}

/** Never trims more than 45% of a road's own length from one end, so two
 * nodes close together on a short connector never collapse the road to
 * nothing (or cross-trim past each other). */
export function safeTrimDistance(lineLengthM: number, desired: number): number {
  return Math.min(Math.max(0, desired), lineLengthM * 0.45);
}

/** The middle portion of `line` with up to `startTrim` meters cut from
 * its first coordinate and `endTrim` meters cut from its last. Falls
 * back to a minimal sliver around the midpoint if both trims would
 * otherwise collapse the line, rather than producing invalid/empty
 * geometry. */
export function trimLine(
  line: GeoJSON.Feature<GeoJSON.LineString>,
  startTrim: number,
  endTrim: number,
): GeoJSON.Feature<GeoJSON.LineString> {
  const total = length(line, { units: "meters" });
  const from = safeTrimDistance(total, startTrim);
  const to = total - safeTrimDistance(total, endTrim);
  if (to <= from) {
    const mid = total / 2;
    return lineSliceAlong(
      line,
      Math.max(0, mid - 0.01),
      Math.min(total, mid + 0.01),
      {
        units: "meters",
      },
    );
  }
  return lineSliceAlong(line, from, to, { units: "meters" });
}

/** Outward tangent bearing (degrees) of a road at the node end: the
 * direction pointing from the node out along the road. Probes a short
 * distance into the line rather than the immediate next vertex, which
 * can be noisy on near-duplicate-point real OSM data. */
export function outwardBearing(
  nodePosition: LngLat,
  line: GeoJSON.Feature<GeoJSON.LineString>,
  atEnd: boolean,
): number {
  const total = length(line, { units: "meters" });
  const probeDistance = Math.max(0.5, Math.min(5, total / 3));
  const probe = atEnd
    ? lineSliceAlong(line, Math.max(0, total - probeDistance), total, {
        units: "meters",
      })
    : lineSliceAlong(line, 0, probeDistance, { units: "meters" });
  const probeCoords = probe.geometry.coordinates as LngLat[];
  const far = atEnd ? probeCoords[0] : probeCoords[probeCoords.length - 1];
  return bearing(turfPoint(nodePosition), turfPoint(far));
}

/** The left/right envelope-edge points at a given center point + outward
 * tangent bearing + half-width -- i.e. where a road's buffered envelope
 * boundary sits at that point along the centerline. */
export function edgePointsAt(
  centerPoint: LngLat,
  outwardBearingDeg: number,
  halfWidthM: number,
): { left: LngLat; right: LngLat } {
  const left = destination(
    turfPoint(centerPoint),
    halfWidthM,
    outwardBearingDeg - 90,
    {
      units: "meters",
    },
  ).geometry.coordinates as LngLat;
  const right = destination(
    turfPoint(centerPoint),
    halfWidthM,
    outwardBearingDeg + 90,
    {
      units: "meters",
    },
  ).geometry.coordinates as LngLat;
  return { left, right };
}
