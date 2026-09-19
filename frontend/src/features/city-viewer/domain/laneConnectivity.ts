import bearing from "@turf/bearing";
import destination from "@turf/destination";
import { point as turfPoint } from "@turf/helpers";
import type { Intersection, Lane, Point, Road } from "../types/city";
import { buildLaneConnectorCurve } from "../map/geometry/laneConnection";
import type { LngLat } from "../map/geometry/nodeGeometry";
import { roadWidthMeters } from "../map/styles/roadStyle";
import { toRoadLineString } from "../map/adapters/roadLineString";

export type LaneManeuver = "STRAIGHT" | "LEFT" | "RIGHT" | "U_TURN";

export interface LaneConnection {
  id: string;
  intersection_id: string;
  from_lane_id: string;
  to_lane_id: string;
  maneuver: LaneManeuver;
}

export interface LaneConnectionIssue {
  code: "MISSING_LANE" | "INVALID_DIRECTION" | "FORBIDDEN_MANEUVER";
  message: string;
}

export interface LaneConnectionDerivation {
  connections: LaneConnection[];
  issues: LaneConnectionIssue[];
}

export interface LaneConnectionFeatureProperties {
  connection_id: string;
  intersection_id: string;
  from_lane_id: string;
  to_lane_id: string;
  maneuver: LaneManeuver;
}

export type LaneConnectionFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.LineString,
  LaneConnectionFeatureProperties
>;

export interface StopLineProperties {
  intersection_id: string;
  road_id: string;
}

export type StopLineFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.LineString,
  StopLineProperties
>;

const ALL_MANEUVER_TYPES: readonly LaneManeuver[] = [
  "STRAIGHT",
  "LEFT",
  "RIGHT",
  "U_TURN",
];
const STRAIGHT_TOLERANCE = 30;
const U_TURN_TOLERANCE = 35;
const STOP_LINE_OFFSET_M = 2;

function laneById(roads: Road[]): Map<string, Lane> {
  return new Map(
    roads.flatMap((road) => road.lanes.map((lane) => [lane.id, lane])),
  );
}

function endpointIsAtIntersection(
  road: Road,
  intersection: Intersection,
): boolean {
  const endpoint = road.geometry.points[0];
  const last = road.geometry.points[road.geometry.points.length - 1];
  const match = (point: Point) =>
    Math.hypot(
      point.x - intersection.position.x,
      point.y - intersection.position.y,
    ) <= 0.5;
  return match(endpoint) || match(last);
}

function isAtEnd(road: Road, intersection: Intersection): boolean {
  const last = road.geometry.points.at(-1)!;
  return (
    Math.hypot(
      last.x - intersection.position.x,
      last.y - intersection.position.y,
    ) <= 0.5
  );
}

function outwardBearing(road: Road, intersection: Intersection): number {
  const atEnd = isAtEnd(road, intersection);
  const points = road.geometry.points;
  const from = points[atEnd ? Math.max(0, points.length - 2) : 0];
  const to = points[atEnd ? points.length - 1 : Math.min(1, points.length - 1)];
  return bearing(
    turfPoint([intersection.position.x, intersection.position.y]),
    turfPoint([atEnd ? from.x : to.x, atEnd ? from.y : to.y]),
  );
}

function normalizeDelta(delta: number): number {
  return ((delta + 540) % 360) - 180;
}

export function classifyManeuver(
  fromBearing: number,
  toBearing: number,
): LaneManeuver {
  const delta = normalizeDelta(toBearing - normalizeDelta(fromBearing + 180));
  if (Math.abs(delta) >= 180 - U_TURN_TOLERANCE) return "U_TURN";
  if (Math.abs(delta) <= STRAIGHT_TOLERANCE) return "STRAIGHT";
  return delta > 0 ? "RIGHT" : "LEFT";
}

function permittedMovements(lane: Lane): Set<LaneManeuver> {
  // allowed_movements is the semantic City Model field. A missing/empty
  // legacy value means no restriction, preserving existing roads while
  // avoiding guesses when an explicit permission list is present.
  if (lane.allowed_movements.length > 0) return new Set(lane.allowed_movements);
  if (lane.allowed_turns && lane.allowed_turns.length > 0) {
    const mapped = lane.allowed_turns.flatMap((turn) => {
      if (turn === "THROUGH") return ["STRAIGHT"];
      if (turn === "LEFT" || turn === "SLIGHT_LEFT") return ["LEFT"];
      if (turn === "RIGHT" || turn === "SLIGHT_RIGHT") return ["RIGHT"];
      if (turn === "REVERSE") return ["U_TURN"];
      return [];
    }) as LaneManeuver[];
    return new Set(mapped);
  }
  return new Set(ALL_MANEUVER_TYPES);
}

export function validateLaneConnection(
  connection: LaneConnection,
  lanes: Map<string, Lane>,
): LaneConnectionIssue[] {
  const issues: LaneConnectionIssue[] = [];
  const from = lanes.get(connection.from_lane_id);
  const to = lanes.get(connection.to_lane_id);
  if (!from || !to) {
    issues.push({
      code: "MISSING_LANE",
      message: `Connection ${connection.id} references a missing lane.`,
    });
    return issues;
  }
  if (
    from.id === to.id ||
    (from.direction !== "FORWARD" && from.direction !== "BACKWARD")
  ) {
    issues.push({
      code: "INVALID_DIRECTION",
      message: `Connection ${connection.id} has invalid lane direction.`,
    });
  }
  if (!permittedMovements(from).has(connection.maneuver)) {
    issues.push({
      code: "FORBIDDEN_MANEUVER",
      message: `Lane ${from.id} forbids ${connection.maneuver}.`,
    });
  }
  return issues;
}

export function deriveLaneConnections(
  roads: Road[],
  intersections: Intersection[],
): LaneConnectionDerivation {
  const lanes = laneById(roads);
  const roadById = new Map(roads.map((road) => [road.id, road]));
  const connections: LaneConnection[] = [];
  const issues: LaneConnectionIssue[] = [];

  for (const intersection of [...intersections].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const approaches = intersection.connected_road_ids
      .map((id) => roadById.get(id))
      .filter(
        (road): road is Road =>
          !!road && endpointIsAtIntersection(road, intersection),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const incoming = approaches.filter((road) =>
      road.lanes.some((lane) =>
        isIncomingLane(lane, isAtEnd(road, intersection)),
      ),
    );
    const outgoing = approaches.filter((road) =>
      road.lanes.some(
        (lane) => !isIncomingLane(lane, isAtEnd(road, intersection)),
      ),
    );

    for (const fromRoad of incoming) {
      const atEnd = isAtEnd(fromRoad, intersection);
      const fromLanes = fromRoad.lanes
        .filter((lane) => isIncomingLane(lane, atEnd))
        .sort((a, b) => a.index - b.index || a.id.localeCompare(b.id));
      for (const toRoad of outgoing) {
        if (toRoad.id === fromRoad.id) continue;
        const toAtEnd = isAtEnd(toRoad, intersection);
        const toLanes = toRoad.lanes
          .filter((lane) => !isIncomingLane(lane, toAtEnd))
          .sort((a, b) => a.index - b.index || a.id.localeCompare(b.id));
        if (fromLanes.length !== toLanes.length || fromLanes.length === 0)
          continue;
        const fromBearing = outwardBearing(fromRoad, intersection);
        const toBearing = outwardBearing(toRoad, intersection);
        for (let index = 0; index < fromLanes.length; index++) {
          const from = fromLanes[index];
          const to = toLanes[index];
          const maneuver = classifyManeuver(fromBearing, toBearing);
          const connection: LaneConnection = {
            id: `lane-connection:${intersection.id}:${from.id}:${to.id}:${maneuver}`,
            intersection_id: intersection.id,
            from_lane_id: from.id,
            to_lane_id: to.id,
            maneuver,
          };
          const validation = validateLaneConnection(connection, lanes);
          if (validation.length > 0) issues.push(...validation);
          else connections.push(connection);
        }
      }
    }
  }
  return { connections, issues };
}

function lanePoint(
  road: Road,
  intersection: Intersection,
  lane: Lane,
): { point: LngLat; bearing: number } | null {
  const line = toRoadLineString("LOCAL_CARTESIAN", road);
  if (!line) return null;
  const atEnd = isAtEnd(road, intersection);
  const coords = line.geometry.coordinates as LngLat[];
  const index = atEnd ? coords.length - 1 : 0;
  const adjacent =
    coords[
      atEnd ? Math.max(0, index - 1) : Math.min(coords.length - 1, index + 1)
    ];
  const endpoint = coords[index];
  const direction = bearing(turfPoint(endpoint), turfPoint(adjacent));
  const approachPoint = destination(turfPoint(endpoint), 3, direction, {
    units: "meters",
  }).geometry.coordinates as LngLat;
  const width = roadWidthMeters(road) / Math.max(1, road.lanes.length);
  const offset = roadWidthMeters(road) / 2 - width * (lane.index + 0.5);
  const shifted = destination(
    turfPoint(approachPoint),
    Math.abs(offset),
    direction + (offset >= 0 ? -90 : 90),
    { units: "meters" },
  ).geometry.coordinates as LngLat;
  return { point: shifted, bearing: direction };
}

export function buildLaneConnectionFeatureCollection(
  roads: Road[],
  intersections: Intersection[],
): LaneConnectionFeatureCollection {
  const derived = deriveLaneConnections(roads, intersections);
  const lanes = laneById(roads);
  const roadById = new Map(roads.map((road) => [road.id, road]));
  const intersectionById = new Map(
    intersections.map((intersection) => [intersection.id, intersection]),
  );
  const features: LaneConnectionFeatureCollection["features"] = [];
  for (const connection of derived.connections) {
    const from = lanes.get(connection.from_lane_id);
    const to = lanes.get(connection.to_lane_id);
    const intersection = intersectionById.get(connection.intersection_id);
    if (!from || !to || !intersection) continue;
    const fromRoad = roadById.get(from.road_id);
    const toRoad = roadById.get(to.road_id);
    if (!fromRoad || !toRoad) continue;
    const fromPoint = lanePoint(fromRoad, intersection, from);
    const toPoint = lanePoint(toRoad, intersection, to);
    if (!fromPoint || !toPoint) continue;
    const curve = buildLaneConnectorCurve(
      { point: fromPoint.point, outwardBearingDeg: fromPoint.bearing },
      { point: toPoint.point, outwardBearingDeg: toPoint.bearing },
    );
    if (!curve) continue;
    features.push({
      type: "Feature",
      id: connection.id,
      geometry: { type: "LineString", coordinates: curve },
      properties: {
        connection_id: connection.id,
        intersection_id: connection.intersection_id,
        from_lane_id: connection.from_lane_id,
        to_lane_id: connection.to_lane_id,
        maneuver: connection.maneuver,
      },
    });
  }
  return { type: "FeatureCollection", features };
}

export function buildStopLineFeatureCollection(
  roads: Road[],
  intersections: Intersection[],
): StopLineFeatureCollection {
  const roadById = new Map(roads.map((road) => [road.id, road]));
  const features: StopLineFeatureCollection["features"] = [];
  for (const intersection of intersections) {
    for (const roadId of [...intersection.connected_road_ids].sort()) {
      const road = roadById.get(roadId);
      if (!road || !endpointIsAtIntersection(road, intersection)) continue;
      const atEnd = isAtEnd(road, intersection);
      const points = road.geometry.points;
      const endpoint = points[atEnd ? points.length - 1 : 0];
      const adjacent =
        points[
          atEnd
            ? Math.max(0, points.length - 2)
            : Math.min(points.length - 1, 1)
        ];
      const roadBearing = bearing(
        turfPoint([endpoint.x, endpoint.y]),
        turfPoint([adjacent.x, adjacent.y]),
      );
      const stopPoint = destination(
        turfPoint([endpoint.x, endpoint.y]),
        STOP_LINE_OFFSET_M,
        roadBearing,
        { units: "meters" },
      ).geometry.coordinates as LngLat;
      const half = roadWidthMeters(road) / 2;
      const left = destination(turfPoint(stopPoint), half, roadBearing - 90, {
        units: "meters",
      }).geometry.coordinates as LngLat;
      const right = destination(turfPoint(stopPoint), half, roadBearing + 90, {
        units: "meters",
      }).geometry.coordinates as LngLat;
      features.push({
        type: "Feature",
        id: `stop-line:${intersection.id}:${road.id}`,
        geometry: { type: "LineString", coordinates: [left, right] },
        properties: { intersection_id: intersection.id, road_id: road.id },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

export function isIncomingLane(lane: Lane, endpointAtEnd: boolean): boolean {
  return endpointAtEnd
    ? lane.direction === "FORWARD"
    : lane.direction === "BACKWARD";
}

export function toCityPoint(point: LngLat): Point {
  return { x: point[0], y: point[1] };
}
