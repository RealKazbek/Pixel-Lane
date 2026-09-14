/**
 * Real road-surface polygons: each Road's centerline buffered into a
 * true-to-scale envelope, with roads sharing an `Intersection` unified
 * into one seamless junction surface via `geometry/junctionSolver.ts`
 * instead of independently overlapping strokes -- or, at a plain
 * 2-road/no-intersection point, a plain per-road envelope.
 *
 * This adapter is now a thin assembler: all the actual geometry (trim,
 * envelope, fillet, merge taper) lives in `../geometry/`, which has no
 * MapLibre/React dependency and is unit-tested on its own (see
 * `../geometry/README.md`). This file's only job is walking the City
 * Model to build `IncidentRoad`s per intersection and shaping the result
 * into the `RoadSurfaceFeatureCollection` this module has always
 * exposed, so `roadSurfaceLayers.ts`/`setupLayers.ts` are unaffected.
 *
 * IMPORTANT -- this is still visual-only geometry. `Intersection` is the
 * real topology (an explicit domain object with `connected_road_ids`,
 * never derived from a geometric crossing -- see
 * app.city.importers.osm.mapper's module docstring); this adapter reads
 * that topology to decide WHICH road envelopes to merge, but does not
 * itself define or infer connectivity. A geometric crossing with no
 * shared `Intersection` is never merged, matching "visual connection
 * implies topological connection", never the reverse.
 *
 * Runs on **both** coordinate systems: buffering/trimming/filleting a
 * single centerline by a single width is a much lower-risk operation
 * than the schematic per-lane offsetting in `laneGeometry.ts` (no
 * compounding/self-intersection failure mode from stacked adjacent
 * offsets), so it is safe on real, uncurated OSM geometry too -- this is
 * what fixes Real Almaty's junction rendering, not just Demo City's.
 *
 * Centerline curve smoothing (`geometry/curveSmoothing.ts`), however,
 * stays `LOCAL_CARTESIAN`-only for now, same gate/reason as
 * `laneGeometry.ts`'s per-lane offsetting -- real OSM polylines aren't
 * curated for it yet.
 */

import { toLngLat } from "./coordinates";
import { toRoadLineString, type AnyRoad } from "./roadLineString";
import {
  HIERARCHY_LABEL_RANK,
  roadHierarchy,
  roadWidthMeters,
  type RoadHierarchy,
} from "../styles/roadStyle";
import { pointsMatch, type IncidentRoad, type LngLat } from "../geometry/nodeGeometry";
import { solveJunction } from "../geometry/junctionSolver";
import { buildRoadEnvelope, type PolygonFeature } from "../geometry/roadEnvelope";
import { smoothCenterline } from "../geometry/curveSmoothing";
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
  intersections: Pick<Intersection, "id" | "position" | "connected_road_ids">[],
  coordinateSystem: CoordinateSystem,
): RoadSurfaceFeatureCollection {
  const lineByRoadId = new Map<string, GeoJSON.Feature<GeoJSON.LineString>>();
  const halfWidthByRoadId = new Map<string, number>();
  const hierarchyByRoadId = new Map<string, RoadHierarchy>();

  for (const road of roads) {
    const rawLine = toRoadLineString(coordinateSystem, road);
    if (!rawLine) continue;
    const widthM = roadWidthMeters(road);
    if (!(widthM > 0)) continue;
    const line: GeoJSON.Feature<GeoJSON.LineString> =
      coordinateSystem === "LOCAL_CARTESIAN"
        ? {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: smoothCenterline(
                rawLine.geometry.coordinates as LngLat[],
              ),
            },
          }
        : rawLine;
    lineByRoadId.set(road.id, line);
    halfWidthByRoadId.set(road.id, widthM / 2);
    hierarchyByRoadId.set(road.id, roadHierarchy(road.road_type));
  }

  const mergedRoadIds = new Set<string>();
  const features: RoadSurfaceFeatureCollection["features"] = [];

  for (const intersection of intersections) {
    const memberIds = intersection.connected_road_ids.filter((id) =>
      lineByRoadId.has(id),
    );
    if (memberIds.length < 2) continue;

    const nodePosition = toLngLat(coordinateSystem, intersection.position) as LngLat;
    const incident: IncidentRoad[] = [];
    for (const id of memberIds) {
      const line = lineByRoadId.get(id)!;
      const coords = line.geometry.coordinates as LngLat[];
      const atEnd = pointsMatch(coords[coords.length - 1], nodePosition);
      const atStart = pointsMatch(coords[0], nodePosition);
      // Should always be one or the other given the domain invariant
      // "two roads sharing an endpoint share an Intersection" -- if
      // neither matches, this Intersection's position has drifted from
      // the road's actual geometry, and guessing which end is wrong is
      // worse than skipping this road for this junction only.
      if (!atEnd && !atStart) continue;
      incident.push({
        roadId: id,
        halfWidthM: halfWidthByRoadId.get(id)!,
        hierarchy: hierarchyByRoadId.get(id)!,
        line,
        atEnd,
      });
    }
    if (incident.length < 2) continue;

    const result = solveJunction(nodePosition, incident);
    if (!result) continue;

    for (const id of result.memberRoadIds) mergedRoadIds.add(id);
    features.push({
      type: "Feature",
      geometry: result.polygon.geometry,
      properties: {
        hierarchy: dominantHierarchy(
          result.memberRoadIds.map((id) => hierarchyByRoadId.get(id)!),
        ),
        is_junction: true,
      },
    });
  }

  for (const road of roads) {
    if (mergedRoadIds.has(road.id)) continue;
    const line = lineByRoadId.get(road.id);
    const halfWidth = halfWidthByRoadId.get(road.id);
    if (!line || halfWidth === undefined) continue;
    const polygon: PolygonFeature | null = buildRoadEnvelope(line, halfWidth);
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
