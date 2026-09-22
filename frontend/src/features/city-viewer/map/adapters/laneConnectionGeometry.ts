/** Converts persisted LaneConnection records into derived junction curves. */

import along from "@turf/along";
import bearing from "@turf/bearing";
import destination from "@turf/destination";
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
  connection_ids: string;
  maneuvers: string;
}

export type LaneConnectionFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.MultiLineString,
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

function buildConnectionFeature(
  connections: LaneConnection[],
  roads: Map<string, Road>,
  intersections: Map<string, Intersection>,
  coordinateSystem: CoordinateSystem,
): LaneConnectionFeatureCollection["features"][number] | null {
  const first = connections[0];
  if (!first) return null;
  const fromRoad = roads.get(first.from_road_id);
  const intersection = intersections.get(first.intersection_id);
  const fromLane = fromRoad?.lanes.find(
    (lane) => lane.id === first.from_lane_id,
  );
  if (!fromRoad || !intersection || !fromLane) return null;
  const from = laneEndpoint(fromRoad, fromLane, intersection, coordinateSystem);
  if (!from) return null;

  // Every destination shares this short approach stem. Branches only split
  // near the junction, matching a single painted multi-movement lane symbol.
  const splitPoint = destination(
    point(from.point),
    2.4,
    from.outwardBearingDeg + 180,
    { units: "meters" },
  ).geometry.coordinates as LngLat;
  const split = {
    point: splitPoint,
    outwardBearingDeg: from.outwardBearingDeg,
  };
  const lines: LngLat[][] = [[from.point, splitPoint]];

  for (const connection of connections) {
    const toRoad = roads.get(connection.to_road_id);
    const toLane = toRoad?.lanes.find(
      (lane) => lane.id === connection.to_lane_id,
    );
    if (!toRoad || !toLane) continue;
    const to = laneEndpoint(toRoad, toLane, intersection, coordinateSystem);
    if (!to) continue;
    const curve = buildLaneConnectorCurve(split, to, connection.maneuver);
    if (!curve) continue;
    lines.push(curve);
    const arrowhead = buildLaneConnectorArrowhead(curve);
    if (arrowhead) lines.push(arrowhead);
  }
  if (lines.length === 1) return null;

  const ids = connections.map((connection) => connection.id).sort();
  const maneuvers = [...new Set(connections.map(({ maneuver }) => maneuver))]
    .sort()
    .join("|");
  return {
    type: "Feature",
    id: `${first.intersection_id}:${first.from_lane_id}`,
    properties: {
      id: `${first.intersection_id}:${first.from_lane_id}`,
      intersection_id: first.intersection_id,
      from_road_id: first.from_road_id,
      from_lane_id: first.from_lane_id,
      connection_ids: ids.join("|"),
      maneuvers,
    },
    geometry: { type: "MultiLineString", coordinates: lines },
  };
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
  const groups = new Map<string, LaneConnection[]>();
  for (const connection of connections) {
    const key = `${connection.intersection_id}:${connection.from_lane_id}`;
    const group = groups.get(key) ?? [];
    group.push(connection);
    groups.set(key, group);
  }
  const features = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, group]) =>
      buildConnectionFeature(
        group.sort((a, b) => a.id.localeCompare(b.id)),
        roads,
        intersections,
        coordinateSystem,
      ),
    )
    .filter((feature): feature is NonNullable<typeof feature> =>
      Boolean(feature),
    );
  return { type: "FeatureCollection", features };
}
