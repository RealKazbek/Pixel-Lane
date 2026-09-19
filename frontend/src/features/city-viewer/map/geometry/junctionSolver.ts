/** Derives junction surfaces from flat-ended road corridors. */

import { featureCollection as turfFeatureCollection } from "@turf/helpers";
import length from "@turf/length";
import union from "@turf/union";
import { buildFlatRoadCorridor, type PolygonFeature } from "./roadEnvelope";
import type { IncidentRoad, LngLat } from "./nodeGeometry";

export interface JunctionResult {
  polygon: PolygonFeature;
  memberRoadIds: string[];
}

export interface JunctionGeometryOptions {
  /** Kept for the editor contract. The rectangular base deliberately renders
   * sharp corners until a local fillet can be applied without changing its
   * corridor-defined footprint. */
  cornerRadiusM?: number;
}

const MIN_USABLE_LENGTH_M = 0.01;

function unionAll(polygons: PolygonFeature[]): PolygonFeature | null {
  if (polygons.length === 0) return null;
  try {
    return union(turfFeatureCollection(polygons));
  } catch {
    return null;
  }
}

function hasUsableLength(road: IncidentRoad): boolean {
  try {
    return length(road.line, { units: "meters" }) > MIN_USABLE_LENGTH_M;
  } catch {
    return false;
  }
}

/**
 * Builds one junction from explicit road-edge corridors.
 *
 * Every corridor includes its topological endpoint and has flat/butt ends.
 * The union removes internal boundaries while preserving the outer road-edge
 * envelope. There is no node buffer, capsule, plate dilation, or global
 * corner smoothing, so a straight T is a rectangular through-road with a
 * rectangular side-road opening.
 */
export function solveJunction(
  _nodePosition: LngLat,
  incidentInput: IncidentRoad[],
  options: JunctionGeometryOptions = {},
): JunctionResult | null {
  void options;
  const incident = incidentInput
    .filter(hasUsableLength)
    .sort((a, b) => a.roadId.localeCompare(b.roadId));
  if (incident.length < 2) return null;

  const corridors: { roadId: string; polygon: PolygonFeature }[] = [];
  for (const road of incident) {
    const polygon = buildFlatRoadCorridor(road.line, road.halfWidthM);
    if (polygon) corridors.push({ roadId: road.roadId, polygon });
  }
  if (corridors.length < 2) return null;

  const polygon = unionAll(corridors.map(({ polygon: value }) => value));
  if (!polygon) return null;
  return {
    polygon,
    memberRoadIds: corridors.map(({ roadId }) => roadId),
  };
}

/** Existing public sizing export; it no longer controls junction shape. */
export { computeNodeRadius as junctionNodeRadius } from "./nodeGeometry";
