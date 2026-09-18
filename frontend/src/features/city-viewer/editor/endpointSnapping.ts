import type { City, Intersection, Point, Road } from "../types/city";
import { updatePolylineVertex } from "../map/editor/polylineEditing";

export const ENDPOINT_SNAP_TOLERANCE_PX = 18;

export type RoadEndpoint = "start" | "end";

export interface EndpointSnapTarget {
  roadId: string;
  endpoint: RoadEndpoint;
  point: Point;
  nodeId: string | null;
}

export interface ScreenEndpointSnapTarget extends EndpointSnapTarget {
  screenX: number;
  screenY: number;
}

export interface EndpointSnapCandidate extends ScreenEndpointSnapTarget {
  distancePx: number;
}

const POINT_EPSILON = 1e-9;
const EDITOR_NODE_PREFIX = "editor-node-";

function samePoint(left: Point, right: Point): boolean {
  return (
    Math.abs(left.x - right.x) <= POINT_EPSILON &&
    Math.abs(left.y - right.y) <= POINT_EPSILON
  );
}

function endpointPoint(
  road: Pick<Road, "geometry">,
  endpoint: RoadEndpoint,
): Point {
  return endpoint === "start"
    ? road.geometry.points[0]
    : road.geometry.points[road.geometry.points.length - 1];
}

function endpointIndex(road: Road, endpoint: RoadEndpoint): number {
  return endpoint === "start" ? 0 : road.geometry.points.length - 1;
}

export function findRoadEndpointNode(
  intersections: readonly Intersection[],
  road: Pick<Road, "id" | "geometry">,
  endpoint: RoadEndpoint,
): Intersection | null {
  const point = endpointPoint(road, endpoint);
  return (
    [...intersections]
      .filter(
        (intersection) =>
          intersection.connected_road_ids.includes(road.id) &&
          samePoint(intersection.position, point),
      )
      .sort((left, right) => left.id.localeCompare(right.id))[0] ?? null
  );
}

export function roadEndpointForVertex(
  road: Pick<Road, "geometry">,
  vertexIndex: number,
): RoadEndpoint | null {
  if (vertexIndex === 0) return "start";
  if (vertexIndex === road.geometry.points.length - 1) return "end";
  return null;
}

export function buildEndpointSnapTargets(city: City): EndpointSnapTarget[] {
  return city.roads.flatMap((road) =>
    (["start", "end"] as const).map((endpoint) => {
      const node = findRoadEndpointNode(city.intersections, road, endpoint);
      return {
        roadId: road.id,
        endpoint,
        point: node
          ? { ...node.position }
          : { ...endpointPoint(road, endpoint) },
        nodeId: node?.id ?? null,
      };
    }),
  );
}

export function findEndpointSnapCandidate(
  pointer: { x: number; y: number },
  targets: readonly ScreenEndpointSnapTarget[],
  movingRoadId: string | null,
  tolerancePx = ENDPOINT_SNAP_TOLERANCE_PX,
): EndpointSnapCandidate | null {
  if (!Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)) return null;

  return (
    targets
      .filter((target) => target.roadId !== movingRoadId)
      .map((target) => ({
        ...target,
        distancePx: Math.hypot(
          target.screenX - pointer.x,
          target.screenY - pointer.y,
        ),
      }))
      .filter((target) => target.distancePx <= tolerancePx)
      .sort(
        (left, right) =>
          left.distancePx - right.distancePx ||
          left.roadId.localeCompare(right.roadId) ||
          left.endpoint.localeCompare(right.endpoint),
      )[0] ?? null
  );
}

function editorNodeId(target: EndpointSnapTarget): string {
  return `${EDITOR_NODE_PREFIX}${target.roadId}-${target.endpoint}`;
}

function setRoadEndpoint(
  road: Road,
  endpoint: RoadEndpoint,
  point: Point,
): Road {
  const points = updatePolylineVertex(
    road.geometry.points,
    endpointIndex(road, endpoint),
    point,
  );
  return points ? { ...road, geometry: { ...road.geometry, points } } : road;
}

function removeRoadFromPreviousNode(
  intersections: readonly Intersection[],
  roadId: string,
  previousNodeId: string | null,
  nextNodeId: string,
): Intersection[] {
  return intersections.flatMap((intersection) => {
    if (intersection.id !== previousNodeId || intersection.id === nextNodeId) {
      return [intersection];
    }
    const connectedRoadIds = intersection.connected_road_ids.filter(
      (candidate) => candidate !== roadId,
    );
    if (
      intersection.id.startsWith(EDITOR_NODE_PREFIX) &&
      connectedRoadIds.length < 2
    ) {
      return [];
    }
    return [{ ...intersection, connected_road_ids: connectedRoadIds }];
  });
}

export function applyEndpointSnap(
  city: City,
  movingRoadId: string,
  movingEndpoint: RoadEndpoint,
  target: EndpointSnapTarget,
  previousNodeId: string | null = null,
): City | null {
  if (movingRoadId === target.roadId) return null;
  const movingRoad = city.roads.find((road) => road.id === movingRoadId);
  const targetRoad = city.roads.find((road) => road.id === target.roadId);
  if (!movingRoad || !targetRoad) return null;

  const existingNode = target.nodeId
    ? city.intersections.find(
        (intersection) => intersection.id === target.nodeId,
      )
    : null;
  if (target.nodeId && !existingNode) return null;

  const nodeId = existingNode?.id ?? editorNodeId(target);
  const canonicalPoint = existingNode?.position ?? target.point;
  const connectedRoadIds = [
    ...new Set([
      ...(existingNode?.connected_road_ids ?? []),
      target.roadId,
      movingRoadId,
    ]),
  ].sort();
  const node: Intersection = existingNode
    ? { ...existingNode, connected_road_ids: connectedRoadIds }
    : {
        id: nodeId,
        city_id: city.id,
        position: { ...canonicalPoint },
        connected_road_ids: connectedRoadIds,
        connected_lane_ids: [],
        control_type: "UNCONTROLLED",
        traffic_light_id: null,
      };

  const withoutPrevious = removeRoadFromPreviousNode(
    city.intersections,
    movingRoadId,
    previousNodeId,
    nodeId,
  );
  const nextIntersections = withoutPrevious.some(
    (intersection) => intersection.id === nodeId,
  )
    ? withoutPrevious.map((intersection) =>
        intersection.id === nodeId ? node : intersection,
      )
    : [...withoutPrevious, node];

  return {
    ...city,
    roads: city.roads.map((road) => {
      if (road.id === movingRoadId) {
        return setRoadEndpoint(road, movingEndpoint, canonicalPoint);
      }
      if (road.id === target.roadId) {
        return setRoadEndpoint(road, target.endpoint, canonicalPoint);
      }
      return road;
    }),
    intersections: nextIntersections,
  };
}

export function finalizeEndpointDrag(
  city: City,
  movingRoadId: string,
  movingEndpoint: RoadEndpoint,
  target: EndpointSnapTarget | null,
  previousNodeId: string | null,
): City {
  if (target) {
    return (
      applyEndpointSnap(
        city,
        movingRoadId,
        movingEndpoint,
        target,
        previousNodeId,
      ) ?? city
    );
  }
  if (!previousNodeId) return city;

  const previousNode = city.intersections.find(
    (intersection) => intersection.id === previousNodeId,
  );
  if (!previousNode) return city;
  return {
    ...city,
    roads: city.roads.map((road) =>
      road.id === movingRoadId
        ? setRoadEndpoint(road, movingEndpoint, previousNode.position)
        : road,
    ),
  };
}

export function addRoadWithEndpointSnaps(
  city: City,
  road: Road,
  startTarget: EndpointSnapTarget | null,
  endTarget: EndpointSnapTarget | null,
): City | null {
  if (
    city.roads.some((candidate) => candidate.id === road.id) ||
    road.geometry.points.length < 2
  ) {
    return null;
  }

  let next: City = { ...city, roads: [...city.roads, road] };
  if (startTarget) {
    next = applyEndpointSnap(next, road.id, "start", startTarget) ?? next;
  }
  if (endTarget) {
    next = applyEndpointSnap(next, road.id, "end", endTarget) ?? next;
  }
  return next;
}
