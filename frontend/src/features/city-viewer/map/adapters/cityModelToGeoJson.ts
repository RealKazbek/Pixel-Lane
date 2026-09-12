/**
 * City Model -> GeoJSON. The only place that walks City/Road/Intersection/
 * TrafficLight objects to build map-ready data -- never mutates the City
 * Model itself (see map/README.md).
 */

import { toLngLat } from "./coordinates";
import { roadHierarchy, roadWidthMeters } from "../styles/roadStyle";
import type {
  City,
  CoordinateSystem,
  Intersection,
  Road,
  TrafficLight,
} from "../../types/city";

export interface RoadFeatureProperties {
  id: string;
  name: string;
  road_type: string;
  hierarchy: string;
  lane_count: number;
  width_m: number;
  selected: boolean;
}

export interface IntersectionFeatureProperties {
  id: string;
  control_type: string;
  has_traffic_light: boolean;
  selected: boolean;
}

export interface TrafficLightFeatureProperties {
  id: string;
  intersection_id: string;
}

export interface LabelFeatureProperties {
  id: string;
  name: string;
}

export type RoadFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.LineString,
  RoadFeatureProperties
>;
export type IntersectionFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  IntersectionFeatureProperties
>;
export type TrafficLightFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  TrafficLightFeatureProperties
>;
export type LabelFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  LabelFeatureProperties
>;

/** Matches the OSM importer's fallback name prefix
 * (backend/app/city/importers/osm/defaults.py's FALLBACK_ROAD_NAME) so
 * synthesized names don't get rendered as if they were real street names. */
const FALLBACK_NAME_PREFIX = "Unnamed road";

function roadToLineString(
  coordinateSystem: CoordinateSystem,
  road: Road,
): GeoJSON.LineString {
  return {
    type: "LineString",
    coordinates: road.geometry.points.map((point) =>
      toLngLat(coordinateSystem, point),
    ),
  };
}

export function buildRoadFeatureCollection(
  city: Pick<City, "roads" | "coordinate_system">,
  selectedRoadId: string | null,
): RoadFeatureCollection {
  return {
    type: "FeatureCollection",
    features: city.roads.map((road) => ({
      type: "Feature",
      id: road.id,
      geometry: roadToLineString(city.coordinate_system, road),
      properties: {
        id: road.id,
        name: road.name,
        road_type: road.road_type,
        hierarchy: roadHierarchy(road.road_type),
        lane_count: road.lanes.length,
        width_m: roadWidthMeters(road),
        selected: road.id === selectedRoadId,
      },
    })),
  };
}

export function buildIntersectionFeatureCollection(
  city: Pick<City, "intersections" | "coordinate_system">,
  selectedIntersectionId: string | null,
): IntersectionFeatureCollection {
  return {
    type: "FeatureCollection",
    features: city.intersections.map((intersection: Intersection) => ({
      type: "Feature",
      id: intersection.id,
      geometry: {
        type: "Point",
        coordinates: toLngLat(city.coordinate_system, intersection.position),
      },
      properties: {
        id: intersection.id,
        control_type: intersection.control_type,
        has_traffic_light: intersection.traffic_light_id !== null,
        selected: intersection.id === selectedIntersectionId,
      },
    })),
  };
}

export function buildTrafficLightFeatureCollection(
  city: Pick<City, "traffic_lights" | "intersections" | "coordinate_system">,
): TrafficLightFeatureCollection {
  const positionByIntersection = new Map(
    city.intersections.map((i) => [
      i.id,
      toLngLat(city.coordinate_system, i.position),
    ]),
  );
  const features: TrafficLightFeatureCollection["features"] = [];
  for (const light of city.traffic_lights as TrafficLight[]) {
    const coordinates = positionByIntersection.get(light.intersection_id);
    if (!coordinates) continue;
    features.push({
      type: "Feature",
      id: light.id,
      geometry: { type: "Point", coordinates },
      properties: { id: light.id, intersection_id: light.intersection_id },
    });
  }
  return { type: "FeatureCollection", features };
}

function roadMidpoint(
  coordinateSystem: CoordinateSystem,
  road: Road,
): GeoJSON.Position {
  const points = road.geometry.points;
  const mid = points[Math.floor(points.length / 2)];
  return toLngLat(coordinateSystem, mid);
}

export function buildRoadLabelFeatureCollection(
  city: Pick<City, "roads" | "coordinate_system">,
): LabelFeatureCollection {
  const features: LabelFeatureCollection["features"] = [];
  for (const road of city.roads) {
    if (!road.name || road.name.startsWith(FALLBACK_NAME_PREFIX)) continue;
    features.push({
      type: "Feature",
      id: road.id,
      geometry: {
        type: "Point",
        coordinates: roadMidpoint(city.coordinate_system, road),
      },
      properties: { id: road.id, name: road.name },
    });
  }
  return { type: "FeatureCollection", features };
}
