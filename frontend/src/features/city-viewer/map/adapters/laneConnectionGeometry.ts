/** Converts persisted LaneConnection records into derived junction curves. */

import along from "@turf/along";
import bearing from "@turf/bearing";
import distance from "@turf/distance";
import lineOffset from "@turf/line-offset";
import { lineString, point } from "@turf/helpers";
import {
  buildLaneConnectorArrowhead,
  buildLaneConnectorCurve,
} from "../geometry/laneConnection";
import { toLngLat } from "./coordinates";
import { toRoadLineString } from "./roadLineString";
import { roadLaneCount, roadWidthMeters } from "../styles/roadStyle";
import type {
  City,
  CoordinateSystem,
  Intersection,
  Lane,
  LaneConnection,
  Road,
} from "../../types/city";
import type { LngLat } from "../geometry/nodeGeometry";

export interface LaneConnectionFeatureProperties {
  id: string;
  intersection_id: string;
  from_road_id: string;
  from_lane_id: string;
  to_road_id: string;
  to_lane_id: string;
  maneuver: LaneConnection["maneuver"];
  kind: "shaft" | "arrowhead";
}

export type LaneConnectionFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.LineString,
  LaneConnectionFeatureProperties
>;

function laneEndpoint(
  road: Road,
  lane: Lane,
  intersection: Intersection,
  coordinateSystem: CoordinateSystem,
): { point: LngLat; outwardBearingDeg: number } | null {
  const line = toRoadLineString(coordinateSystem, road);
  if (!line || roadLaneCount(road) < 1) return null;
  const laneWidth = roadWidthMeters(road) / roadLaneCount(road);
  const offset = roadWidthMeters(road) / 2 - laneWidth * (lane.index + 0.5);
  const offsetLine = lineOffset(line, offset, { units: "meters" });
  const coordinates = offsetLine.geometry.coordinates as LngLat[];
  if (lane.direction === "BACKWARD") coordinates.reverse();
  const node = toLngLat(coordinateSystem, intersection.position);
  const nodeAtStart =
    distance(point(node), point(coordinates[0]), { units: "meters" }) <=
    distance(point(node), point(coordinates[coordinates.length - 1]), {
      units: "meters",
    });
  const lineFeature = lineString(coordinates);
  const length = distance(point(coordinates[0]), point(coordinates.at(-1)!), {
    units: "meters",
  });
  // Keep the guide rooted in the lane while leaving comfortable clearance
  // from labels and road borders. Ten metres produces a moderate navigation
  // arrow at inspection zoom without stretching far down the road.
  const fromNodeDistance = Math.min(10, Math.max(3, length / 3));
  const endpoint = along(
    lineFeature,
    nodeAtStart ? fromNodeDistance : Math.max(0, length - fromNodeDistance),
    { units: "meters" },
  ).geometry.coordinates as LngLat;
  return {
    point: endpoint,
    outwardBearingDeg: bearing(point(node), point(endpoint)),
  };
}

function buildConnectionFeatures(
  connection: LaneConnection,
  roads: Map<string, Road>,
  intersections: Map<string, Intersection>,
  coordinateSystem: CoordinateSystem,
): LaneConnectionFeatureCollection["features"] {
  const fromRoad = roads.get(connection.from_road_id);
  const toRoad = roads.get(connection.to_road_id);
  const intersection = intersections.get(connection.intersection_id);
  const fromLane = fromRoad?.lanes.find(
    (lane) => lane.id === connection.from_lane_id,
  );
  const toLane = toRoad?.lanes.find(
    (lane) => lane.id === connection.to_lane_id,
  );
  if (!fromRoad || !toRoad || !intersection || !fromLane || !toLane) return [];
  const from = laneEndpoint(fromRoad, fromLane, intersection, coordinateSystem);
  const to = laneEndpoint(toRoad, toLane, intersection, coordinateSystem);
  if (!from || !to) return [];
  const coordinates = buildLaneConnectorCurve(from, to, connection.maneuver);
  if (!coordinates) return [];
  const properties = {
    id: connection.id,
    intersection_id: connection.intersection_id,
    from_road_id: connection.from_road_id,
    from_lane_id: connection.from_lane_id,
    to_road_id: connection.to_road_id,
    to_lane_id: connection.to_lane_id,
    maneuver: connection.maneuver,
  };
  const shaft: LaneConnectionFeatureCollection["features"][number] = {
    type: "Feature",
    id: connection.id,
    properties: { ...properties, kind: "shaft" },
    geometry: { type: "LineString", coordinates },
  };
  const arrowhead = buildLaneConnectorArrowhead(coordinates);
  return arrowhead
    ? [
        shaft,
        {
          type: "Feature",
          id: `${connection.id}:arrowhead`,
          properties: { ...properties, kind: "arrowhead" },
          geometry: { type: "LineString", coordinates: arrowhead },
        },
      ]
    : [shaft];
}

export function buildLaneConnectionFeatureCollection(
  city: Pick<City, "roads" | "intersections" | "lane_connections">,
  coordinateSystem: CoordinateSystem,
): LaneConnectionFeatureCollection {
  const connections = city.lane_connections ?? [];
  const roads = new Map(city.roads.map((road) => [road.id, road]));
  const intersections = new Map(
    city.intersections.map((intersection) => [intersection.id, intersection]),
  );
  const features = connections
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((connection) =>
      buildConnectionFeatures(
        connection,
        roads,
        intersections,
        coordinateSystem,
      ),
    );
  return { type: "FeatureCollection", features };
}
