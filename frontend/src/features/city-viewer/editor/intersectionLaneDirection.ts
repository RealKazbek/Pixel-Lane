import type {
  Intersection,
  Lane,
  LaneDirection,
  LaneConnection,
  Road,
} from "../types/city";

export type LaneRelativeDirection = "INBOUND" | "OUTBOUND";
export type RoadEndpointLabel = "A" | "B";

const ENDPOINT_TOLERANCE_M = 1.5;

function distanceToEndpoint(
  road: Road,
  intersection: Intersection,
  endpoint: RoadEndpointLabel,
): number {
  const point =
    endpoint === "A" ? road.geometry.points[0] : road.geometry.points.at(-1);
  if (!point) return Number.POSITIVE_INFINITY;
  return Math.hypot(
    point.x - intersection.position.x,
    point.y - intersection.position.y,
  );
}

export function getRoadEndpointAtIntersection(
  road: Road,
  intersection: Intersection,
): RoadEndpointLabel | null {
  if (!intersection.connected_road_ids.includes(road.id)) return null;
  const distanceA = distanceToEndpoint(road, intersection, "A");
  const distanceB = distanceToEndpoint(road, intersection, "B");
  if (distanceA > ENDPOINT_TOLERANCE_M && distanceB > ENDPOINT_TOLERANCE_M) {
    return null;
  }
  if (Math.abs(distanceA - distanceB) <= Number.EPSILON) return null;
  return distanceA < distanceB ? "A" : "B";
}

export function getLaneDirectionRelativeToIntersection(
  road: Road,
  lane: Lane,
  intersection: Intersection,
): LaneRelativeDirection | null {
  const endpoint = getRoadEndpointAtIntersection(road, intersection);
  if (!endpoint) return null;
  const travelsTowardB = lane.direction === "FORWARD";
  const inbound = endpoint === "B" ? travelsTowardB : !travelsTowardB;
  return inbound ? "INBOUND" : "OUTBOUND";
}

export function laneDirectionForIntersectionDirection(
  road: Road,
  lane: Lane,
  intersection: Intersection,
  relativeDirection: LaneRelativeDirection,
): LaneDirection | null {
  const endpoint = getRoadEndpointAtIntersection(road, intersection);
  if (!endpoint) return null;
  const forwardIsInbound = endpoint === "B";
  const wantsInbound = relativeDirection === "INBOUND";
  return forwardIsInbound === wantsInbound ? "FORWARD" : "BACKWARD";
}

export function isLaneConnectionDirectionallyValid(
  roads: readonly Road[],
  intersections: readonly Intersection[],
  connection: LaneConnection,
): boolean {
  const intersection = intersections.find(
    (candidate) => candidate.id === connection.intersection_id,
  );
  const fromRoad = roads.find((road) => road.id === connection.from_road_id);
  const toRoad = roads.find((road) => road.id === connection.to_road_id);
  const fromLane = fromRoad?.lanes.find(
    (lane) => lane.id === connection.from_lane_id,
  );
  const toLane = toRoad?.lanes.find(
    (lane) => lane.id === connection.to_lane_id,
  );
  if (!intersection || !fromRoad || !toRoad || !fromLane || !toLane)
    return false;
  return (
    getLaneDirectionRelativeToIntersection(fromRoad, fromLane, intersection) ===
      "INBOUND" &&
    getLaneDirectionRelativeToIntersection(toRoad, toLane, intersection) ===
      "OUTBOUND"
  );
}
