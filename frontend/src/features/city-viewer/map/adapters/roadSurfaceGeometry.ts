/**
 * Real road-surface polygons, generated from each Road's centerline +
 * real-world width via `@turf/buffer`, with roads sharing an
 * `Intersection` unioned (`@turf/union`) into one seamless junction
 * polygon instead of independently overlapping strokes.
 *
 * This is the fix for roads rendering as "several disconnected strips
 * crossing each other" (see docs/city-model.md's road-network topology
 * note): a plain per-road `line-width` stroke draws each road as an
 * independent object with its own casing, so at any junction you see N
 * overlapping rectangle borders instead of one paved area. Buffering the
 * centerline into an actual polygon, then unioning every road that
 * shares an `Intersection`, produces one continuous shape whose internal
 * borders are gone -- because they're the same polygon.
 *
 * Unlike the schematic per-lane offset rendering in `laneGeometry.ts`,
 * this is NOT gated to `LOCAL_CARTESIAN` only: buffering a single
 * centerline by a single width is a much lower-risk operation than
 * stacking N per-lane offsets (no compounding/self-intersection failure
 * mode from adjacent offset lines), so it is safe to run on real,
 * uncurated OSM geometry too -- this is what actually fixes Real
 * Almaty's disconnected-strip appearance, not just Demo City's.
 *
 * IMPORTANT -- this is still visual-only geometry. `Intersection` is the
 * real topology (an explicit domain object with `connected_road_ids`,
 * never derived from a geometric crossing -- see
 * app.city.importers.osm.mapper's module docstring); this adapter reads
 * that topology to decide WHICH road polygons to merge, but does not
 * itself define or infer connectivity. A geometric crossing with no
 * shared `Intersection` is never merged, matching "visual connection
 * implies topological connection", never the reverse.
 */

import buffer from "@turf/buffer";
import { featureCollection as turfFeatureCollection } from "@turf/helpers";
import union from "@turf/union";
import { toRoadLineString, type AnyRoad } from "./roadLineString";
import {
  HIERARCHY_LABEL_RANK,
  roadHierarchy,
  roadWidthMeters,
  type RoadHierarchy,
} from "../styles/roadStyle";
import type { CoordinateSystem, Intersection } from "../../types/city";

export interface RoadSurfaceProperties {
  /** The single Road's id -- present only for a standalone (non-junction)
   * surface. Omitted for a merged junction polygon, which represents
   * more than one Road and therefore has no single valid id (see
   * PixelLaneMap.tsx's click handling: a feature with no `id` is simply
   * not road-selectable, rather than attributing the click to one
   * arbitrary constituent road). */
  id?: string;
  hierarchy: RoadHierarchy;
  /** True for a merged multi-road junction polygon. */
  is_junction: boolean;
}

export type RoadSurfaceFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  RoadSurfaceProperties
>;

type PolygonFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;

/** Picks the most visually important hierarchy among a junction's
 * constituent roads (lower `HIERARCHY_LABEL_RANK` = more important) so a
 * highway/residential junction reads as the highway's color, not an
 * arbitrary one. */
function dominantHierarchy(hierarchies: RoadHierarchy[]): RoadHierarchy {
  return hierarchies.reduce((best, next) =>
    HIERARCHY_LABEL_RANK[next] < HIERARCHY_LABEL_RANK[best] ? next : best,
  );
}

export function buildRoadSurfaceFeatureCollection(
  roads: AnyRoad[],
  intersections: Pick<Intersection, "id" | "connected_road_ids">[],
  coordinateSystem: CoordinateSystem,
): RoadSurfaceFeatureCollection {
  const polygonByRoadId = new Map<string, PolygonFeature>();
  const hierarchyByRoadId = new Map<string, RoadHierarchy>();

  for (const road of roads) {
    const line = toRoadLineString(coordinateSystem, road);
    if (!line) continue;
    const widthM = roadWidthMeters(road);
    if (!(widthM > 0)) continue;
    let polygon: PolygonFeature | undefined;
    try {
      polygon = buffer(line, widthM / 2, { units: "meters", steps: 6 });
    } catch {
      polygon = undefined;
    }
    if (!polygon) continue;
    polygonByRoadId.set(road.id, polygon);
    hierarchyByRoadId.set(road.id, roadHierarchy(road.road_type));
  }

  const mergedRoadIds = new Set<string>();
  const features: RoadSurfaceFeatureCollection["features"] = [];

  for (const intersection of intersections) {
    const memberIds = intersection.connected_road_ids.filter((id) =>
      polygonByRoadId.has(id),
    );
    if (memberIds.length < 2) continue;

    let merged: PolygonFeature | null =
      polygonByRoadId.get(memberIds[0]) ?? null;
    let ok = merged !== null;
    for (let i = 1; ok && i < memberIds.length; i++) {
      const next = polygonByRoadId.get(memberIds[i]);
      if (!next || !merged) {
        ok = false;
        break;
      }
      try {
        merged = union(turfFeatureCollection([merged, next]));
      } catch {
        merged = null;
      }
      if (!merged) ok = false;
    }
    if (!ok || !merged) continue;

    for (const id of memberIds) mergedRoadIds.add(id);
    features.push({
      type: "Feature",
      geometry: merged.geometry,
      properties: {
        hierarchy: dominantHierarchy(
          memberIds.map((id) => hierarchyByRoadId.get(id)!),
        ),
        is_junction: true,
      },
    });
  }

  for (const road of roads) {
    if (mergedRoadIds.has(road.id)) continue;
    const polygon = polygonByRoadId.get(road.id);
    if (!polygon) continue;
    features.push({
      type: "Feature",
      id: road.id,
      geometry: polygon.geometry,
      properties: {
        id: road.id,
        hierarchy: hierarchyByRoadId.get(road.id)!,
        is_junction: false,
      },
    });
  }

  return { type: "FeatureCollection", features };
}
