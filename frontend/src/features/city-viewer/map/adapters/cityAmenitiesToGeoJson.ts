/**
 * BusStop/Crosswalk -> GeoJSON. Kept separate from `cityModelToGeoJson.ts`
 * (roads/intersections/traffic lights/labels) since these are simple
 * point amenities with their own placement logic, not part of the core
 * road-network walk -- see map/README.md's "one adapter per concern".
 */

import along from "@turf/along";
import { toLngLat } from "./coordinates";
import { toRoadLineString } from "./roadLineString";
import { roadLengthMeters } from "./geometryLength";
import type { BusStop, CoordinateSystem, Crosswalk, Road } from "../../types/city";

export interface BusStopFeatureProperties {
  id: string;
  name: string | null;
}

export interface CrosswalkFeatureProperties {
  id: string;
}

export type BusStopFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  BusStopFeatureProperties
>;
export type CrosswalkFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  CrosswalkFeatureProperties
>;

export function buildBusStopFeatureCollection(
  busStops: BusStop[],
  coordinateSystem: CoordinateSystem,
): BusStopFeatureCollection {
  return {
    type: "FeatureCollection",
    features: busStops.map((stop) => ({
      type: "Feature",
      id: stop.id,
      geometry: {
        type: "Point",
        coordinates: toLngLat(coordinateSystem, {
          x: stop.position_x,
          y: stop.position_y,
        }),
      },
      properties: { id: stop.id, name: stop.name },
    })),
  };
}

/** Resolves each crosswalk's `position_ratio` against its own road's
 * centerline -- a crosswalk always stays attached to its road even if
 * the road's geometry is later edited, since it has no stored x/y of its
 * own (see backend `app.city.models.crosswalk`). Skips a crosswalk
 * whose road can't be found/resolved rather than guessing a position. */
export function buildCrosswalkFeatureCollection(
  crosswalks: Crosswalk[],
  roads: Pick<Road, "id" | "geometry">[],
  coordinateSystem: CoordinateSystem,
): CrosswalkFeatureCollection {
  const roadById = new Map(roads.map((r) => [r.id, r]));
  const features: CrosswalkFeatureCollection["features"] = [];

  for (const crossing of crosswalks) {
    const road = roadById.get(crossing.road_id);
    if (!road) continue;
    const line = toRoadLineString(coordinateSystem, road);
    if (!line) continue;
    const lengthM = roadLengthMeters(road, coordinateSystem);
    if (!(lengthM > 0)) continue;
    let point: GeoJSON.Feature<GeoJSON.Point>;
    try {
      point = along(line, lengthM * crossing.position_ratio, { units: "meters" });
    } catch {
      continue;
    }
    features.push({
      type: "Feature",
      id: crossing.id,
      geometry: point.geometry,
      properties: { id: crossing.id },
    });
  }

  return { type: "FeatureCollection", features };
}

