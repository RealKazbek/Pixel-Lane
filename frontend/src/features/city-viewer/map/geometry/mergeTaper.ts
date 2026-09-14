/**
 * Tapered envelope for a slip-road/merge (or the symmetric split/diverge)
 * approach to a node, instead of the constant-width envelope
 * `roadEnvelope.ts` builds for a normal junction approach.
 *
 * The City Model has no explicit "this is a merge" flag yet (see
 * docs/city-model.md) -- `isMergeCandidate` is a documented geometric
 * heuristic, not a domain fact: at a degree-2 node where the two roads'
 * widths differ meaningfully and their outward tangents are close
 * together (a shallow angle, i.e. running roughly parallel rather than
 * turning), the narrower road is treated as merging into the wider one.
 * This directly matches a slip road joining an avenue and stays generic
 * (any similarly-shaped junction gets the same treatment) rather than
 * being keyed off a specific road name/id. A real domain signal (e.g. a
 * RoadType/junction hint) would be more robust than this heuristic and is
 * a reasonable future improvement -- see the geometry module README.
 */

import bearing from "@turf/bearing";
import destination from "@turf/destination";
import { point as turfPoint } from "@turf/helpers";
import length from "@turf/length";
import lineSliceAlong from "@turf/line-slice-along";
import type { IncidentRoad, LngLat } from "./nodeGeometry";
import type { PolygonFeature } from "./roadEnvelope";

const MERGE_ANGLE_THRESHOLD_DEG = 70;
const MERGE_WIDTH_RATIO_THRESHOLD = 0.8;
/** How far back from the node a merge/slip road's envelope (and, for
 * consistency, its lane markings -- see `laneGeometry.ts`) tapers from
 * full width. Exported so lane rendering can stop markings at the same
 * distance the physical surface starts narrowing, instead of drawing a
 * constant-width lane into a shrinking taper. */
export const MERGE_TAPER_LENGTH_M = 25;
const MIN_TAPER_HALF_WIDTH_M = 0.15;
const TAPER_SAMPLES = 10;

/** Whether `narrow` should taper into `wide` at a shared degree-2 node,
 * given each road's outward bearing away from that node. */
export function isMergeCandidate(
  narrow: Pick<IncidentRoad, "halfWidthM">,
  wide: Pick<IncidentRoad, "halfWidthM">,
  narrowOutwardBearingDeg: number,
  wideOutwardBearingDeg: number,
): boolean {
  if (narrow.halfWidthM >= wide.halfWidthM * MERGE_WIDTH_RATIO_THRESHOLD) {
    return false;
  }
  const separation = angularSeparation(narrowOutwardBearingDeg, wideOutwardBearingDeg);
  // Two roads running roughly parallel away from the shared node point in
  // *opposite* outward directions (~180 degrees of separation) -- a
  // shallow merge angle, not a sharp turn back on itself.
  return separation >= 180 - MERGE_ANGLE_THRESHOLD_DEG;
}

/** Minimal angular separation between two bearings, in [0, 180]. 0 = same
 * direction, 180 = exactly opposite. */
function angularSeparation(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

/** Builds a polygon whose half-width linearly tapers from `halfWidthM`
 * (at the far end, `taperStartDistance` meters from the node) down to a
 * thin stub (`MIN_TAPER_HALF_WIDTH_M`) at the node end. Buffering can't
 * produce a variable width, so this samples points along the taper
 * region and manually offsets each one perpendicular to the local
 * tangent, assembling left-side-forward + right-side-reversed into one
 * ring -- a small, bounded custom function (no library builds
 * variable-width polygons from a centerline out of the box). */
export function buildMergeTaperEnvelope(
  line: GeoJSON.Feature<GeoJSON.LineString>,
  halfWidthM: number,
  atEnd: boolean,
): { polygon: PolygonFeature; taperStartDistance: number } | null {
  const total = length(line, { units: "meters" });
  const taperLength = Math.min(MERGE_TAPER_LENGTH_M, total * 0.9);
  if (taperLength <= 0) return null;

  const taperStartDistance = atEnd ? total - taperLength : taperLength;
  const taperSlice = atEnd
    ? lineSliceAlong(line, taperStartDistance, total, { units: "meters" })
    : lineSliceAlong(line, 0, taperStartDistance, { units: "meters" });
  const coords = taperSlice.geometry.coordinates as LngLat[];
  if (coords.length < 2) return null;

  const left: LngLat[] = [];
  const right: LngLat[] = [];
  for (let i = 0; i <= TAPER_SAMPLES; i++) {
    const t = i / TAPER_SAMPLES; // 0 = far end (full width), 1 = node end (stub)
    const sampleT = atEnd ? t : 1 - t;
    const idx = Math.min(coords.length - 1, Math.round(sampleT * (coords.length - 1)));
    const nextIdx = idx === coords.length - 1 ? idx - 1 : idx + 1;
    const here = coords[idx];
    const there = coords[nextIdx];
    const localBearing = bearing(turfPoint(here), turfPoint(there));
    // `t` is already normalized to "0 = far end (full width), 1 = node
    // end (stub)" regardless of `atEnd` -- see the loop comment above.
    const width = Math.max(MIN_TAPER_HALF_WIDTH_M, halfWidthM * (1 - t));
    left.push(
      destination(turfPoint(here), width, localBearing - 90, { units: "meters" })
        .geometry.coordinates as LngLat,
    );
    right.push(
      destination(turfPoint(here), width, localBearing + 90, { units: "meters" })
        .geometry.coordinates as LngLat,
    );
  }

  const ring = [...left, ...right.reverse(), left[0]];
  return {
    polygon: {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [ring] },
    },
    taperStartDistance,
  };
}
