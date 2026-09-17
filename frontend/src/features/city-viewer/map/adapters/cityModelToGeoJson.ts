/**
 * City Model -> GeoJSON. The only place that walks City/Road/Intersection/
 * TrafficLight objects to build map-ready data -- never mutates the City
 * Model itself (see map/README.md).
 */

import bearing from "@turf/bearing";
import { toLngLat } from "./coordinates";
import { roadLengthMeters } from "./geometryLength";
import { smoothCenterline } from "../geometry/curveSmoothing";
import {
  HIERARCHY_LABEL_RANK,
  roadCasingWidthMeters,
  roadHierarchy,
  roadWidthMeters,
  roadLaneCount,
} from "../styles/roadStyle";
import type {
  City,
  CoordinateSystem,
  Intersection,
  MedianType,
  Road,
  MapRoad,
  TrafficLight,
} from "../../types/city";

/** A junction connecting fewer roads than this is treated as a topology
 * pass-through node (e.g. where OSM splits one street into segments),
 * not a real intersection -- see `IntersectionFeatureProperties.
 * connected_road_count` and layers/pointLayers.ts's zoom-gated filter. */
const MIN_ROADS_FOR_JUNCTION = 3;

export interface RoadFeatureProperties {
  id: string;
  name: string;
  road_type: string;
  hierarchy: string;
  label_rank: number;
  lane_count: number;
  width_m: number;
  casing_width_m: number;
  /** Whether `width_m` is a fallback estimate rather than a real
   * source-provided measurement -- see roadStyle.ts's roadWidthMeters. */
  is_width_estimated: boolean;
  /** 1 = single shared surface, 2 = one of a pair of physically
   * separated carriageways. See Road.carriageway_count. */
  carriageway_count: number;
  median: MedianType;
  /** 0 = ground, positive = overpass/bridge, negative = underpass/
   * tunnel. A crossing between roads at different levels is never
   * assumed to be an intersection. */
  level: number;
  is_bridge: boolean;
  is_tunnel: boolean;
}

export interface IntersectionFeatureProperties {
  id: string;
  control_type: string;
  has_traffic_light: boolean;
  connected_road_count: number;
}

export interface TrafficLightFeatureProperties {
  id: string;
  intersection_id: string;
}

export interface LabelFeatureProperties {
  id: string;
  name: string;
  hierarchy: string;
  label_rank: number;
  rotation: number;
  length_m: number;
  character_count: number;
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
  road: Road | MapRoad,
): GeoJSON.LineString {
  return {
    type: "LineString",
    coordinates: road.geometry.points.map((point) =>
      toLngLat(coordinateSystem, point),
    ),
  };
}

export function buildRoadFeatureCollection(city: {
  roads: (Road | MapRoad)[];
  coordinate_system: CoordinateSystem;
}): RoadFeatureCollection {
  return {
    type: "FeatureCollection",
    features: city.roads.map((road) => {
      const hierarchy = roadHierarchy(road.road_type);
      return {
        type: "Feature",
        id: road.id,
        geometry: roadToLineString(city.coordinate_system, road),
        properties: {
          id: road.id,
          name: road.name,
          road_type: road.road_type,
          hierarchy,
          label_rank: HIERARCHY_LABEL_RANK[hierarchy],
          lane_count: roadLaneCount(road),
          width_m: roadWidthMeters(road),
          casing_width_m: roadCasingWidthMeters(road),
          is_width_estimated: road.is_width_estimated ?? true,
          carriageway_count: road.carriageway_count ?? 1,
          median: road.median ?? "NONE",
          level: road.level ?? 0,
          is_bridge: road.is_bridge ?? false,
          is_tunnel: road.is_tunnel ?? false,
        },
      };
    }),
  };
}

export function buildIntersectionFeatureCollection(
  city: Pick<City, "intersections" | "coordinate_system">,
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
        connected_road_count: intersection.connected_road_ids.length,
      },
    })),
  };
}

/** Whether an intersection is a real junction (as opposed to a topology
 * pass-through node) -- exported so PixelLaneMap can decide what's
 * reasonably selectable at low zoom without duplicating this threshold. */
export function isJunction(
  intersection: Pick<Intersection, "connected_road_ids" | "traffic_light_id">,
): boolean {
  return (
    intersection.connected_road_ids.length >= MIN_ROADS_FOR_JUNCTION ||
    intersection.traffic_light_id !== null
  );
}

export function buildTrafficLightFeatureCollection(city: {
  // Widened to the minimum shape traffic-light rendering actually needs
  // (not the full `TrafficLight`) so viewport-scoped data -- which only
  // carries `intersection.traffic_light_id`, not full signal/phase
  // detail -- can build the same feature collection (see
  // adapters/viewportTrafficLights.ts).
  traffic_lights: Pick<TrafficLight, "id" | "intersection_id">[];
  intersections: Pick<Intersection, "id" | "position">[];
  coordinate_system: CoordinateSystem;
}): TrafficLightFeatureCollection {
  const positionByIntersection = new Map(
    city.intersections.map((i) => [
      i.id,
      toLngLat(city.coordinate_system, i.position),
    ]),
  );
  const features: TrafficLightFeatureCollection["features"] = [];
  for (const light of city.traffic_lights) {
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

function roadLabelPlacement(
  coordinateSystem: CoordinateSystem,
  road: Road | MapRoad,
): { position: GeoJSON.Position; rotation: number } {
  const points = road.geometry.points;
  const raw = points.map((point) => toLngLat(coordinateSystem, point));
  const line =
    coordinateSystem === "LOCAL_CARTESIAN"
      ? smoothCenterline(raw, undefined, road.smoothing ?? 1)
      : raw;
  const lengths = line
    .slice(1)
    .map((point, index) =>
      Math.hypot(point[0] - line[index][0], point[1] - line[index][1]),
    );
  const half = lengths.reduce((sum, value) => sum + value, 0) / 2;
  let travelled = 0;
  let segment = 0;
  while (segment < lengths.length - 1 && travelled + lengths[segment] < half) {
    travelled += lengths[segment++];
  }
  const ratio = lengths[segment] ? (half - travelled) / lengths[segment] : 0;
  const start = line[segment];
  const end = line[segment + 1] ?? start;
  const position: GeoJSON.Position = [
    start[0] + (end[0] - start[0]) * ratio,
    start[1] + (end[1] - start[1]) * ratio,
  ];
  let rotation = bearing(start, end) - 90;
  if (rotation < -90) rotation += 180;
  if (rotation > 90) rotation -= 180;
  return { position, rotation };
}

/** One label per street name, not one per road segment. OSM/City Model
 * roads are frequently split into many short segments that share a
 * name (e.g. one per block); labeling every segment clusters near-
 * duplicate text so densely that MapLibre's overlap suppression hides
 * almost all of it. Picking the single longest segment per name keeps
 * exactly one legible label per street. */
export function buildRoadLabelFeatureCollection(city: {
  roads: (Road | MapRoad)[];
  coordinate_system: CoordinateSystem;
}): LabelFeatureCollection {
  const longestByName = new Map<string, Road | MapRoad>();
  for (const road of city.roads) {
    if (!road.name || road.name.startsWith(FALLBACK_NAME_PREFIX)) continue;
    const current = longestByName.get(road.name);
    if (
      !current ||
      roadLengthMeters(road, city.coordinate_system) >
        roadLengthMeters(current, city.coordinate_system)
    ) {
      longestByName.set(road.name, road);
    }
  }

  const features: LabelFeatureCollection["features"] = [];
  for (const road of longestByName.values()) {
    const hierarchy = roadHierarchy(road.road_type);
    const placement = roadLabelPlacement(city.coordinate_system, road);
    features.push({
      type: "Feature",
      id: road.id,
      geometry: {
        type: "Point",
        coordinates: placement.position,
      },
      properties: {
        id: road.id,
        name: road.name,
        hierarchy,
        label_rank: HIERARCHY_LABEL_RANK[hierarchy],
        rotation: placement.rotation,
        length_m: roadLengthMeters(road, city.coordinate_system),
        character_count: road.name.length,
      },
    });
  }
  return { type: "FeatureCollection", features };
}
