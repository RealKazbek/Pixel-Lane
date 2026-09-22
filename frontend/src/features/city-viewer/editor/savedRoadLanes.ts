import type { City, LaneConnection, Road } from "../types/city";

/** Adopt server-assigned lane identities without reverting newer local road
 * edits. The road-save queue keeps maneuvers disabled until its final response. */
export function reconcileSavedRoadLanes(city: City, saved: Road): City {
  const roads = city.roads.map((road) =>
    road.id === saved.id
      ? {
          ...road,
          lanes: road.lanes.map((lane, index) => ({
            ...lane,
            id: saved.lanes[index]?.id ?? lane.id,
          })),
        }
      : road,
  );
  const lanesByRoad = new Map(roads.map((road) => [road.id, road.lanes]));
  const laneIds = new Set(
    roads.flatMap((road) => road.lanes.map((lane) => lane.id)),
  );
  return {
    ...city,
    roads,
    intersections: city.intersections.map((intersection) =>
      intersection.connected_road_ids.includes(saved.id)
        ? {
            ...intersection,
            connected_lane_ids: intersection.connected_road_ids.flatMap(
              (id) => lanesByRoad.get(id)?.map((lane) => lane.id) ?? [],
            ),
          }
        : intersection,
    ),
    lane_connections: city.lane_connections?.filter(
      (connection) =>
        laneIds.has(connection.from_lane_id) &&
        laneIds.has(connection.to_lane_id),
    ),
  };
}

/** Reconcile an atomic topology response without letting an older response
 * replace maneuver edits made while that request was in flight. */
export function reconcileSavedTopology(
  city: City,
  saved: City,
  submittedLaneConnections: LaneConnection[] | undefined,
): City {
  const hasNewerManeuverEdit =
    city.lane_connections !== submittedLaneConnections;
  const reconciled = saved.roads.reduce(
    (candidate, road) => reconcileSavedRoadLanes(candidate, road),
    city,
  );
  return {
    ...reconciled,
    lane_connections: hasNewerManeuverEdit
      ? reconciled.lane_connections
      : saved.lane_connections,
  };
}
