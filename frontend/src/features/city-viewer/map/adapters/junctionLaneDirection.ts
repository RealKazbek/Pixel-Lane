import along from "@turf/along";
import bearing from "@turf/bearing";
import distance from "@turf/distance";
import lineOffset from "@turf/line-offset";
import { lineString, point } from "@turf/helpers";
import { toRoadLineString } from "./roadLineString";
import { roadLaneCount, roadWidthMeters } from "../styles/roadStyle";
import {
  getLaneDirectionRelativeToIntersection,
  getRoadEndpointAtIntersection,
  type LaneRelativeDirection,
} from "../../editor/intersectionLaneDirection";
import type { CoordinateSystem, Intersection, Road } from "../../types/city";

export interface JunctionLaneDirectionProperties {
  road_id: string;
  lane_id: string;
  direction: LaneRelativeDirection;
  bearing: number;
}

export type JunctionLaneDirectionFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  JunctionLaneDirectionProperties
>;

export function buildJunctionLaneDirectionFeatureCollection(
  roads: readonly Road[],
  intersection: Intersection | null,
  coordinateSystem: CoordinateSystem,
): JunctionLaneDirectionFeatureCollection {
  if (!intersection || coordinateSystem !== "LOCAL_CARTESIAN") {
    return { type: "FeatureCollection", features: [] };
  }
  const features: GeoJSON.Feature<
    GeoJSON.Point,
    JunctionLaneDirectionProperties
  >[] = [];
  for (const road of roads) {
    if (!intersection.connected_road_ids.includes(road.id)) continue;
    const endpoint = getRoadEndpointAtIntersection(road, intersection);
    const line = toRoadLineString(coordinateSystem, road);
    const count = roadLaneCount(road);
    if (!endpoint || !line || count < 1) continue;
    for (const lane of road.lanes) {
      const direction = getLaneDirectionRelativeToIntersection(
        road,
        lane,
        intersection,
      );
      if (!direction) continue;
      const offset =
        roadWidthMeters(road) / 2 -
        (roadWidthMeters(road) / count) * (lane.index + 0.5);
      const offsetLine = lineOffset(line, offset, { units: "meters" });
      const coordinates = offsetLine.geometry.coordinates;
      const laneLength = distance(
        point(coordinates[0]),
        point(coordinates.at(-1)!),
        { units: "meters" },
      );
      const markerDistance = Math.min(10, Math.max(3, laneLength * 0.18));
      const marker = along(
        lineString(endpoint === "B" ? coordinates : [...coordinates].reverse()),
        markerDistance,
        { units: "meters" },
      );
      const travelBearing = bearing(
        point(coordinates[0]),
        point(coordinates.at(-1)!),
      );
      const forwardBearing =
        lane.direction === "FORWARD" ? travelBearing : travelBearing + 180;
      features.push({
        type: "Feature",
        id: lane.id,
        properties: {
          road_id: road.id,
          lane_id: lane.id,
          direction,
          bearing: forwardBearing,
        },
        geometry: marker.geometry,
      });
    }
  }
  return { type: "FeatureCollection", features };
}
