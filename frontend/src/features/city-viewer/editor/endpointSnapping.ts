import type { City, Intersection, Point, Road } from "../types/city";
import { updatePolylineVertex } from "../map/editor/polylineEditing";

export const ENDPOINT_SNAP_TOLERANCE_PX = 18;
export const INTERSECTION_SNAP_TOLERANCE_M = 1.5;

function persistedId(value: string, seed: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(seed)) {
    return value;
  }
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return `${hex}${hex}${hex.slice(0, 8)}-${hex.slice(0, 4)}-5${hex.slice(1, 4)}-8${hex.slice(1, 4)}-${hex}${hex.slice(0, 4)}`;
}

export type RoadEndpoint = "start" | "end";

export interface RoadEndpointSnapTarget {
  kind: "road-endpoint";
  targetId: string;
  roadId: string;
  endpoint: RoadEndpoint;
  point: Point;
  nodeId: string | null;
}

export interface ExistingNodeSnapTarget {
  kind: "existing-node";
  targetId: string;
  point: Point;
  nodeId: string;
  connectedRoadIds: string[];
}

export interface RoadSegmentSnapTarget {
  kind: "road-segment";
  targetId: string;
  roadId: string;
  segmentIndex: number;
  point: Point;
  nodeId: string | null;
}

export type EndpointSnapTarget =
  RoadEndpointSnapTarget | ExistingNodeSnapTarget | RoadSegmentSnapTarget;

export type ScreenEndpointSnapTarget = EndpointSnapTarget & {
  screenX: number;
  screenY: number;
};

export type EndpointSnapCandidate = ScreenEndpointSnapTarget & {
  distancePx: number;
};

const POINT_EPSILON = 1e-9;
const EDITOR_NODE_PREFIX = "editor-node-";
const ROAD_TOPOLOGY_TOLERANCE_M = INTERSECTION_SNAP_TOLERANCE_M;

function samePoint(left: Point, right: Point): boolean {
  return (
    Math.abs(left.x - right.x) <= POINT_EPSILON &&
    Math.abs(left.y - right.y) <= POINT_EPSILON
  );
}

function distanceMeters(left: Point, right: Point): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function sameRoadGeometry(left: Road, right: Road): boolean {
  const leftPoints = left.geometry.points;
  const rightPoints = right.geometry.points;
  if (leftPoints.length !== rightPoints.length) return false;
  const matches = (points: Point[]) =>
    leftPoints.every(
      (point, index) => distanceMeters(point, points[index]) <= ROAD_TOPOLOGY_TOLERANCE_M,
    );
  return matches(rightPoints) || matches([...rightPoints].reverse());
}

function hasDuplicateRoadGeometry(roads: readonly Road[]): boolean {
  return roads.some((road, index) => {
    if (road.geometry.points.length < 2) return true;
    if (
      road.geometry.points.some(
        (point, pointIndex, points) =>
          pointIndex > 0 &&
          distanceMeters(point, points[pointIndex - 1]) <= POINT_EPSILON,
      )
    ) {
      return true;
    }
    return roads.slice(index + 1).some((candidate) => sameRoadGeometry(road, candidate));
  });
}

function nearestIntersectionWithinTolerance(
  intersections: readonly Intersection[],
  point: Point,
): Intersection | null {
  return (
    intersections
      .map((intersection) => ({
        intersection,
        distance: distanceMeters(intersection.position, point),
      }))
      .filter(({ distance }) => distance <= INTERSECTION_SNAP_TOLERANCE_M)
      .sort(
        (left, right) =>
          left.distance - right.distance ||
          left.intersection.id.localeCompare(right.intersection.id),
      )[0]?.intersection ?? null
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

/** Keep persisted lane topology in step with the road membership of a node.
 * Snapping is the editor's topology mutation boundary; leaving this list
 * empty makes a valid connected road graph unusable to lane matching. */
function reconcileConnectedLaneIds(
  roads: readonly Road[],
  intersections: readonly Intersection[],
): Intersection[] {
  const lanesByRoadId = new Map(
    roads.map((road) => [road.id, road.lanes.map((lane) => lane.id)]),
  );
  return intersections.map((intersection) => ({
    ...intersection,
    connected_lane_ids: intersection.connected_road_ids
      .flatMap((roadId) => lanesByRoadId.get(roadId) ?? [])
      .sort(),
  }));
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
  const endpointTargets: RoadEndpointSnapTarget[] = city.roads.flatMap((road) =>
    (["start", "end"] as const).map((endpoint) => {
      const node = findRoadEndpointNode(city.intersections, road, endpoint);
      return {
        kind: "road-endpoint",
        targetId: `road:${road.id}:${endpoint}`,
        roadId: road.id,
        endpoint,
        point: node
          ? { ...node.position }
          : { ...endpointPoint(road, endpoint) },
        nodeId: node?.id ?? null,
      };
    }),
  );
  const representedNodeIds = new Set(
    endpointTargets.flatMap((target) => (target.nodeId ? [target.nodeId] : [])),
  );
  const standaloneNodeTargets: ExistingNodeSnapTarget[] = city.intersections
    .filter((node) => !representedNodeIds.has(node.id))
    .map((node) => ({
      kind: "existing-node",
      targetId: `node:${node.id}`,
      point: { ...node.position },
      nodeId: node.id,
      connectedRoadIds: [...node.connected_road_ids],
    }));

  return [...endpointTargets, ...standaloneNodeTargets].sort((left, right) =>
    left.targetId.localeCompare(right.targetId),
  );
}

export function buildRoadSegmentSnapTargets(
  city: City,
): RoadSegmentSnapTarget[] {
  return city.roads.flatMap((road) =>
    road.geometry.points.slice(0, -1).map((point, segmentIndex) => ({
      kind: "road-segment" as const,
      targetId: `road:${road.id}:segment:${segmentIndex}`,
      roadId: road.id,
      segmentIndex,
      point: { ...point },
      nodeId: null,
    })),
  );
}

export function findEndpointSnapCandidate(
  pointer: { x: number; y: number },
  targets: readonly ScreenEndpointSnapTarget[],
  movingRoadId: string | null,
  tolerancePx = ENDPOINT_SNAP_TOLERANCE_PX,
  pointerWorld?: Point,
): EndpointSnapCandidate | null {
  if (!Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)) return null;

  return (
    targets
      .filter((target) => {
        if (!movingRoadId) return true;
        if (target.kind === "road-endpoint") {
          return target.roadId !== movingRoadId;
        }
        if (target.kind === "road-segment") {
          return target.roadId !== movingRoadId;
        }
        return !target.connectedRoadIds.includes(movingRoadId);
      })
      .map((target) => ({
        ...target,
        distancePx: Math.hypot(
          target.screenX - pointer.x,
          target.screenY - pointer.y,
        ),
      }))
      .filter(
        (target) =>
          target.distancePx <= tolerancePx ||
          (pointerWorld !== undefined &&
            distanceMeters(target.point, pointerWorld) <=
              INTERSECTION_SNAP_TOLERANCE_M),
      )
      .sort(
        (left, right) =>
          left.distancePx - right.distancePx ||
          (left.kind === "road-segment" ? 1 : 0) -
            (right.kind === "road-segment" ? 1 : 0) ||
          left.targetId.localeCompare(right.targetId),
      )[0] ?? null
  );
}

function editorNodeId(target: RoadEndpointSnapTarget): string {
  return persistedId(`${EDITOR_NODE_PREFIX}${target.roadId}-${target.endpoint}`, target.roadId);
}

function segmentNodeId(target: RoadSegmentSnapTarget): string {
  return persistedId(`editor-node-${target.roadId}-segment-${target.segmentIndex}-${target.point.x}-${target.point.y}`, target.roadId);
}

function splitRoadAtPoint(
  road: Road,
  segmentIndex: number,
  point: Point,
  secondRoadId: string,
): [Road, Road] | null {
  const points = road.geometry.points;
  if (
    segmentIndex < 0 ||
    segmentIndex >= points.length - 1 ||
    distanceMeters(point, points[segmentIndex]) <= ROAD_TOPOLOGY_TOLERANCE_M ||
    distanceMeters(point, points[segmentIndex + 1]) <= ROAD_TOPOLOGY_TOLERANCE_M
  ) {
    return null;
  }
  const firstPoints = [...points.slice(0, segmentIndex + 1), { ...point }];
  const secondPoints = [{ ...point }, ...points.slice(segmentIndex + 1)];
  const smoothing = road.corner_smoothing ?? [];
  const firstSmoothing = smoothing.length
    ? [...smoothing.slice(0, segmentIndex + 1), 0]
    : road.corner_smoothing;
  const secondSmoothing = smoothing.length
    ? [0, ...smoothing.slice(segmentIndex + 1)]
    : road.corner_smoothing;
  return [
    {
      ...road,
      geometry: { ...road.geometry, points: firstPoints },
      corner_smoothing: firstSmoothing,
    },
    {
      ...road,
      id: secondRoadId,
      geometry: { ...road.geometry, points: secondPoints },
      corner_smoothing: secondSmoothing,
    },
  ];
}

function nextSplitRoadId(
  city: City,
  roadId: string,
  segmentIndex: number,
): string {
  const existingIds = new Set(city.roads.map((road) => road.id));
  const base = persistedId(`${roadId}-split-${segmentIndex}`, roadId);
  if (!existingIds.has(base)) return base;
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function splitLaneId(roadId: string, laneId: string, index: number): string {
  return persistedId(`${roadId}-split-lane-${index}-${laneId}`, roadId);
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

export function moveConnectedRoadNode(
  city: City,
  roadId: string,
  endpoint: RoadEndpoint,
  point: Point,
): City {
  const road = city.roads.find((candidate) => candidate.id === roadId);
  if (!road) return city;
  const node = findRoadEndpointNode(city.intersections, road, endpoint);
  if (!node) {
    return {
      ...city,
      roads: city.roads.map((candidate) =>
        candidate.id === roadId
          ? setRoadEndpoint(candidate, endpoint, point)
          : candidate,
      ),
    };
  }

  const connectedRoadIds = new Set(node.connected_road_ids);
  return {
    ...city,
    roads: city.roads.map((candidate) => {
      if (!connectedRoadIds.has(candidate.id)) return candidate;
      let next = candidate;
      if (samePoint(endpointPoint(candidate, "start"), node.position)) {
        next = setRoadEndpoint(next, "start", point);
      }
      if (samePoint(endpointPoint(candidate, "end"), node.position)) {
        next = setRoadEndpoint(next, "end", point);
      }
      return next;
    }),
    intersections: city.intersections.map((intersection) =>
      intersection.id === node.id
        ? { ...intersection, position: { ...point } }
        : intersection,
    ),
  };
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
  const movingRoad = city.roads.find((road) => road.id === movingRoadId);
  if (!movingRoad) return null;

  const targetRoad =
    target.kind === "road-endpoint"
      ? city.roads.find((road) => road.id === target.roadId)
      : null;
  const segmentTarget = target.kind === "road-segment" ? target : null;
  const segmentRoad = segmentTarget
    ? city.roads.find((road) => road.id === segmentTarget.roadId)
    : null;
  if (target.kind === "road-endpoint") {
    if (movingRoadId === target.roadId || !targetRoad) return null;
    if (!samePoint(endpointPoint(targetRoad, target.endpoint), target.point)) {
      return null;
    }
  }
  if (segmentTarget && (!segmentRoad || movingRoadId === segmentRoad.id)) {
    return null;
  }

  const nearbyIntersection = nearestIntersectionWithinTolerance(
    city.intersections,
    target.point,
  );
  const targetNodeId =
    nearbyIntersection?.id ??
    (target.kind === "road-segment" ? segmentNodeId(target) : target.nodeId);
  const existingNode = targetNodeId
    ? city.intersections.find((intersection) => intersection.id === targetNodeId)
    : null;
  if (targetNodeId && !existingNode && target.kind === "road-endpoint") {
    return null;
  }

  if (target.kind === "existing-node" && !existingNode) return null;
  const nodeId =
    existingNode?.id ??
    (target.kind === "road-endpoint"
      ? editorNodeId(target)
      : target.kind === "road-segment"
        ? segmentNodeId(target)
        : target.nodeId);
  const canonicalPoint = existingNode?.position ?? target.point;
  const connectedRoadIds = [
    ...new Set([
      ...(existingNode?.connected_road_ids ?? []),
      ...(target.kind === "road-endpoint" ? [target.roadId] : []),
      ...(target.kind === "road-segment" ? [target.roadId] : []),
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

  let nextRoads = city.roads.map((road) =>
    road.id === movingRoadId
      ? setRoadEndpoint(road, movingEndpoint, canonicalPoint)
      : target.kind === "road-endpoint" && road.id === targetRoad?.id
        ? samePoint(endpointPoint(road, target.endpoint), canonicalPoint)
          ? road
          : setRoadEndpoint(road, target.endpoint, canonicalPoint)
        : road,
  );
  if (segmentTarget && segmentRoad) {
    const segmentStart = segmentRoad.geometry.points[segmentTarget.segmentIndex];
    const segmentEnd = segmentRoad.geometry.points[segmentTarget.segmentIndex + 1];
    const endpoint =
      distanceMeters(canonicalPoint, segmentStart) <= ROAD_TOPOLOGY_TOLERANCE_M
        ? "start"
        : distanceMeters(canonicalPoint, segmentEnd) <= ROAD_TOPOLOGY_TOLERANCE_M
          ? "end"
          : null;
    if (endpoint) {
      const snappedRoad = setRoadEndpoint(segmentRoad, endpoint, canonicalPoint);
      nextRoads = nextRoads.map((road) =>
        road.id === snappedRoad.id ? snappedRoad : road,
      );
      const endpointNode = {
        ...node,
        connected_road_ids: [...new Set(node.connected_road_ids)].sort(),
      };
      const endpointIntersections = nextIntersections.map((intersection) =>
        intersection.id === nodeId ? endpointNode : intersection,
      );
      return {
        ...city,
        roads: nextRoads,
        intersections: reconcileConnectedLaneIds(nextRoads, endpointIntersections),
      };
    }
    const split = splitRoadAtPoint(
      segmentRoad,
      segmentTarget.segmentIndex,
      canonicalPoint,
      nextSplitRoadId(city, segmentRoad.id, segmentTarget.segmentIndex),
    );
    if (!split) return null;
    const [firstRoad, secondRoad] = split;
    const splitLaneIds = new Map<string, string>();
    const secondRoadWithLanes: Road = {
      ...secondRoad,
      lanes: secondRoad.lanes.map((lane, index) => {
        const id = splitLaneId(secondRoad.id, lane.id, index);
        splitLaneIds.set(lane.id, id);
        return { ...lane, id, road_id: secondRoad.id };
      }),
    };
    nextRoads = nextRoads.flatMap((road) =>
      road.id === segmentRoad.id ? [firstRoad, secondRoadWithLanes] : [road],
    );
    const connectedRoadIds = [
      ...new Set([
        ...node.connected_road_ids.filter((roadId) => roadId !== segmentRoad.id),
        firstRoad.id,
        secondRoadWithLanes.id,
      ]),
    ].sort();
    const updatedIntersections = nextIntersections.map((intersection) => {
      if (
        intersection.id !== nodeId &&
        intersection.connected_road_ids.includes(segmentRoad.id) &&
        samePoint(intersection.position, endpointPoint(segmentRoad, "end"))
      ) {
        return {
          ...intersection,
          connected_road_ids: intersection.connected_road_ids.map((roadId) =>
            roadId === segmentRoad.id ? secondRoadWithLanes.id : roadId,
          ),
        };
      }
      return intersection;
    });
    const nextNode = { ...node, connected_road_ids: connectedRoadIds };
    const nextIntersectionsWithSplit = updatedIntersections.some(
      (intersection) => intersection.id === nodeId,
    )
      ? updatedIntersections.map((intersection) =>
          intersection.id === nodeId ? nextNode : intersection,
        )
      : [...updatedIntersections, nextNode];
    const movedIntersectionIds = new Set(
      updatedIntersections
        .filter(
          (intersection) =>
            intersection.id !== nodeId &&
            intersection.connected_road_ids.includes(secondRoadWithLanes.id),
        )
        .map((intersection) => intersection.id),
    );
    const nextLaneConnections = (city.lane_connections ?? []).map((connection) => {
      if (!movedIntersectionIds.has(connection.intersection_id)) return connection;
      return {
        ...connection,
        from_road_id:
          connection.from_road_id === segmentRoad.id
            ? secondRoadWithLanes.id
            : connection.from_road_id,
        from_lane_id:
          connection.from_road_id === segmentRoad.id
            ? splitLaneIds.get(connection.from_lane_id) ?? connection.from_lane_id
            : connection.from_lane_id,
        to_road_id:
          connection.to_road_id === segmentRoad.id
            ? secondRoadWithLanes.id
            : connection.to_road_id,
        to_lane_id:
          connection.to_road_id === segmentRoad.id
            ? splitLaneIds.get(connection.to_lane_id) ?? connection.to_lane_id
            : connection.to_lane_id,
      };
    });
    const result = {
      ...city,
      roads: nextRoads,
      lane_connections: nextLaneConnections,
      intersections: reconcileConnectedLaneIds(
        nextRoads,
        nextIntersectionsWithSplit,
      ),
    };
    return hasDuplicateRoadGeometry(result.roads) ? null : result;
  }

  return {
    ...city,
    roads: nextRoads,
    intersections: reconcileConnectedLaneIds(nextRoads, nextIntersections),
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
  return hasDuplicateRoadGeometry(next.roads) ? null : next;
}
