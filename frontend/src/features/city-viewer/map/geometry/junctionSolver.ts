/**
 * Procedural junction solver: turns a node's incident roads into ONE
 * unified junction surface instead of independently-buffered "capsules"
 * unioned as-is.
 *
 * Root cause this replaces: buffering each road's *full* centerline into
 * a rounded capsule and only then unioning is the right family of
 * technique for a clean 2-road continuation, but at an acute or T/X
 * junction two independently-buffered capsules crossing at a shallow
 * angle produce a union whose outer boundary has a sharp cusp/spike
 * exactly where the two capsule edges cross -- a geometric consequence
 * of unioning full-length capsules, not a join-style setting (those were
 * already round/round). See roadEnvelope.ts and roadSurfaceGeometry.ts.
 *
 * Algorithm (generic -- not Demo City specific; works for any number of
 * incident roads at any angle):
 *  1. Trim each incident road's centerline back by a node radius (from
 *     the widest incident road) so independently-buffered envelopes stop
 *     short of the node instead of overlapping neighbors there.
 *  2. Take the left/right envelope-edge points at each road's trim cut,
 *     plus the node position itself, and compute their convex hull. This
 *     is always a simple (non-self-intersecting) polygon regardless of
 *     how many roads meet or at what angle -- what makes this safe for
 *     T/X/Y/acute/asymmetric junctions without special-casing any of
 *     them, and what keeps a 2-road ~180-degree continuation degenerating
 *     to a plain thin rectangle rather than needing its own code path.
 *  3. Round each hull edge that connects two DIFFERENT roads' edge points
 *     into a smooth outward-bulging curve (a "curb return" fillet, via a
 *     quadratic Bezier through an outward control point, capped at 40% of
 *     the edge's own length so it can never self-intersect regardless of
 *     junction angle). A hull edge that belongs to a single road's own
 *     left/right pair is left straight -- that's the road's own envelope
 *     face, already covered once unioned with that road's envelope.
 *  4. Union the resulting junction plate with every incident road's own
 *     trimmed (or, for a detected merge approach, tapered) envelope.
 */

import bearing from "@turf/bearing";
import buffer from "@turf/buffer";
import convex from "@turf/convex";
import destination from "@turf/destination";
import distance from "@turf/distance";
import { featureCollection as turfFeatureCollection, point as turfPoint } from "@turf/helpers";
import length from "@turf/length";
import lineSliceAlong from "@turf/line-slice-along";
import union from "@turf/union";
import { buildMergeTaperEnvelope, isMergeCandidate } from "./mergeTaper";
import {
  type IncidentRoad,
  type LngLat,
  computeNodeRadius,
  cornerRadiusForPair,
  edgePointsAt,
  outwardBearing,
  trimLine,
} from "./nodeGeometry";
import { buildRoadEnvelope, type PolygonFeature } from "./roadEnvelope";

interface TaggedPoint {
  coord: LngLat;
  roadId: string;
}

export interface JunctionResult {
  polygon: PolygonFeature;
  memberRoadIds: string[];
}

const BULGE_SAMPLES = 4;
const MAX_BULGE_FRACTION_OF_EDGE = 0.4;
/** A hairline dilation applied to the junction plate before unioning it
 * with the incident road envelopes. The plate's own vertices are derived
 * from those same envelopes' edge points, which occasionally makes the
 * plate boundary touch an envelope boundary at an exactly-coincident
 * point (e.g. the node coordinate itself, when it lands on the plate's
 * convex hull). Polygon-clipping libraries (`polyclip-ts`, behind
 * `@turf/union`) are not numerically robust to exactly-coincident
 * vertices/edges between the two inputs -- nudging the plate outward by
 * a sub-visual amount first avoids that failure mode without changing
 * the rendered shape in any perceptible way. */
const PLATE_DILATION_M = 0.03;

function unionAll(polygons: PolygonFeature[]): PolygonFeature | null {
  if (polygons.length === 0) return null;
  let merged: PolygonFeature | null = polygons[0];
  for (let i = 1; merged && i < polygons.length; i++) {
    try {
      merged = union(turfFeatureCollection([merged, polygons[i]]));
    } catch {
      merged = null;
    }
  }
  return merged;
}

function quadraticBezier(p0: LngLat, p1: LngLat, p2: LngLat, t: number): LngLat {
  const mt = 1 - t;
  return [
    mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
    mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
  ];
}

function bulgeArc(
  p: LngLat,
  q: LngLat,
  nodePosition: LngLat,
  radius: number,
): LngLat[] {
  const edgeLen = distance(turfPoint(p), turfPoint(q), { units: "meters" });
  if (edgeLen < 0.01) return [];
  const bulge = Math.min(radius, edgeLen * MAX_BULGE_FRACTION_OF_EDGE);
  const mid: LngLat = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const outwardBearingDeg = bearing(turfPoint(nodePosition), turfPoint(mid));
  const control = destination(turfPoint(mid), bulge, outwardBearingDeg, {
    units: "meters",
  }).geometry.coordinates as LngLat;
  const points: LngLat[] = [];
  for (let i = 1; i <= BULGE_SAMPLES; i++) {
    points.push(quadraticBezier(p, control, q, i / (BULGE_SAMPLES + 1)));
  }
  return points;
}

const MIN_USABLE_LENGTH_M = 0.01;

function hasUsableLength(line: GeoJSON.Feature<GeoJSON.LineString>): boolean {
  try {
    return length(line, { units: "meters" }) > MIN_USABLE_LENGTH_M;
  } catch {
    return false;
  }
}

/** Builds one unified junction surface for a node with 2+ connected
 * roads. Returns `null` if fewer than 2 usable road envelopes could be
 * built (caller falls back to standalone road rendering for the rest). */
export function solveJunction(
  nodePosition: LngLat,
  incidentInput: IncidentRoad[],
): JunctionResult | null {
  // A zero/near-zero-length line (two coincident points) has no usable
  // tangent direction -- turf's bearing/lineSliceAlong throw on it rather
  // than returning a sentinel, so it must be filtered out before any
  // geometry runs, the same "skip rather than crash on one bad road"
  // policy every other builder in this module follows.
  const incident = incidentInput.filter((road) => hasUsableLength(road.line));
  if (incident.length < 2) return null;

  const nodeRadius = computeNodeRadius(incident);
  const bearingByRoadId = new Map<string, number>();
  for (const road of incident) {
    bearingByRoadId.set(road.roadId, outwardBearing(nodePosition, road.line, road.atEnd));
  }

  // At most one merge/slip approach per node -- see mergeTaper.ts. Not
  // restricted to a degree-2 node: a real merge point is topologically a
  // 3+-way junction just as often (the "host" road the slip road joins
  // is itself split there, exactly like a real OSM import would --
  // see docs/city-model.md/mapper.py). Every pair of incident roads is
  // checked, not just "the" two roads at the node.
  let mergeRoadId: string | null = null;
  outer: for (const narrow of incident) {
    for (const wide of incident) {
      if (narrow === wide || narrow.halfWidthM >= wide.halfWidthM) continue;
      if (
        isMergeCandidate(
          narrow,
          wide,
          bearingByRoadId.get(narrow.roadId)!,
          bearingByRoadId.get(wide.roadId)!,
        )
      ) {
        mergeRoadId = narrow.roadId;
        break outer;
      }
    }
  }

  const trimmedEnvelopes: { roadId: string; polygon: PolygonFeature }[] = [];
  const taggedPoints: TaggedPoint[] = [{ coord: nodePosition, roadId: "__node__" }];

  for (const road of incident) {
    const roadBearing = bearingByRoadId.get(road.roadId)!;

    if (road.roadId === mergeRoadId) {
      const taper = buildMergeTaperEnvelope(road.line, road.halfWidthM, road.atEnd);
      if (taper) {
        // The taper only covers the last `taperStartDistance..end` stretch
        // near the node -- the rest of this same road (its far portion,
        // beyond the taper zone) still needs its own constant-width
        // envelope, or that whole stretch would render with no surface
        // at all once this road is excluded from the standalone-road
        // fallback below (see `mergedRoadIds` in roadSurfaceGeometry.ts).
        const total = length(road.line, { units: "meters" });
        const farPortion = road.atEnd
          ? lineSliceAlong(road.line, 0, taper.taperStartDistance, { units: "meters" })
          : lineSliceAlong(road.line, taper.taperStartDistance, total, { units: "meters" });
        const farEnvelope =
          length(farPortion, { units: "meters" }) > 0.01
            ? buildRoadEnvelope(farPortion, road.halfWidthM)
            : null;
        const combined = farEnvelope
          ? unionAll([taper.polygon, farEnvelope])
          : taper.polygon;
        if (combined) trimmedEnvelopes.push({ roadId: road.roadId, polygon: combined });
      }
      // The taper's node-side stub already reaches the node coordinate at
      // ~zero width, so it needs no separate hull contribution -- the
      // hull plate below (built from the host road + node point) is
      // enough to bridge the two seamlessly on union.
      continue;
    }

    const trimmedLine = road.atEnd
      ? trimLine(road.line, 0, nodeRadius)
      : trimLine(road.line, nodeRadius, 0);
    const envelope = buildRoadEnvelope(trimmedLine, road.halfWidthM);
    if (!envelope) continue;
    trimmedEnvelopes.push({ roadId: road.roadId, polygon: envelope });

    const trimmedCoords = trimmedLine.geometry.coordinates as LngLat[];
    const cutPoint = road.atEnd
      ? trimmedCoords[trimmedCoords.length - 1]
      : trimmedCoords[0];
    const { left, right } = edgePointsAt(cutPoint, roadBearing, road.halfWidthM);
    taggedPoints.push({ coord: left, roadId: road.roadId });
    taggedPoints.push({ coord: right, roadId: road.roadId });
  }

  if (trimmedEnvelopes.length < 2) return null;

  const memberRoadIds = trimmedEnvelopes.map((e) => e.roadId);
  const envelopePolygons = trimmedEnvelopes.map((e) => e.polygon);

  if (taggedPoints.length < 3) {
    const merged = unionAll(envelopePolygons);
    return merged ? { polygon: merged, memberRoadIds } : null;
  }

  let hull: GeoJSON.Feature<GeoJSON.Polygon> | null = null;
  try {
    // @turf/convex can throw (or return null) on pathological/collinear
    // input -- both are treated the same as "no usable hull."
    hull = convex(
      turfFeatureCollection(taggedPoints.map((p) => turfPoint(p.coord))),
    );
  } catch {
    hull = null;
  }

  if (!hull) {
    const merged = unionAll(envelopePolygons);
    return merged ? { polygon: merged, memberRoadIds } : null;
  }

  const hullRing = hull.geometry.coordinates[0] as LngLat[];
  const keyOf = (c: LngLat) => `${c[0].toFixed(9)},${c[1].toFixed(9)}`;
  const tagByKey = new Map(taggedPoints.map((p) => [keyOf(p.coord), p.roadId]));
  const roadById = new Map(incident.map((r) => [r.roadId, r]));

  const smoothedRing: LngLat[] = [];
  for (let i = 0; i < hullRing.length - 1; i++) {
    const p = hullRing[i];
    const q = hullRing[i + 1];
    smoothedRing.push(p);
    const pRoad = tagByKey.get(keyOf(p));
    const qRoad = tagByKey.get(keyOf(q));
    const isCorner = pRoad !== undefined && qRoad !== undefined && pRoad !== qRoad;
    if (!isCorner) continue;
    const roadP = roadById.get(pRoad!);
    const roadQ = roadById.get(qRoad!);
    if (!roadP || !roadQ) continue;
    const radius = cornerRadiusForPair(roadP, roadQ);
    smoothedRing.push(...bulgeArc(p, q, nodePosition, radius));
  }
  smoothedRing.push(smoothedRing[0]);

  const plate: PolygonFeature = {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [smoothedRing] },
  };
  const dilatedPlate = safeDilate(plate, PLATE_DILATION_M) ?? plate;

  const merged = unionAll([dilatedPlate, ...envelopePolygons]);
  return merged ? { polygon: merged, memberRoadIds } : null;
}

function safeDilate(polygon: PolygonFeature, distanceM: number): PolygonFeature | null {
  try {
    return buffer(polygon, distanceM, { units: "meters", steps: 4 }) ?? null;
  } catch {
    return null;
  }
}

/** Exported for `roadSurfaceGeometry.ts` to know how much of each road's
 * end is "junction territory" (used to also clip lane markings there). */
export { computeNodeRadius as junctionNodeRadius } from "./nodeGeometry";
