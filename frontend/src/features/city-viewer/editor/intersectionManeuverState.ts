import type { City, MovementType, LaneConnection } from "../types/city";
import { getLaneDirectionRelativeToIntersection } from "./intersectionLaneDirection";
import { getAvailableManeuvers } from "./intersectionManeuvers";

/** Applies an intersection design edit to the City Model document. Road lane
 * direction is intentionally only read here; maneuver state lives in the
 * intersection-specific LaneConnection records. */
export function updateIntersectionManeuver(
  city: City,
  intersectionId: string,
  roadId: string,
  laneId: string,
  movement: MovementType,
  enabled: boolean,
): City {
  const intersection = city.intersections.find(
    (item) => item.id === intersectionId,
  );
  const sourceRoad = city.roads.find((road) => road.id === roadId);
  if (!intersection || !sourceRoad) return city;

  const current = city.lane_connections ?? [];
  const withoutMovement = current.filter(
    (connection) =>
      !(
        connection.intersection_id === intersectionId &&
        connection.from_lane_id === laneId &&
        connection.maneuver === movement
      ),
  );
  if (!enabled) return { ...city, lane_connections: withoutMovement };

  const targetRoads = city.roads.filter(
    (road) =>
      road.id !== roadId &&
      intersection.connected_road_ids.includes(road.id) &&
      road.lanes.some(
        (lane) =>
          getLaneDirectionRelativeToIntersection(road, lane, intersection) ===
          "OUTBOUND",
      ) &&
      getAvailableManeuvers(sourceRoad, intersection, [road]).includes(
        movement,
      ),
  );
  const additions = targetRoads.flatMap((road) =>
    road.lanes
      .filter(
        (lane) =>
          getLaneDirectionRelativeToIntersection(road, lane, intersection) ===
          "OUTBOUND",
      )
      .map((lane): LaneConnection => ({
        id: crypto.randomUUID(),
        city_id: city.id,
        intersection_id: intersectionId,
        from_road_id: roadId,
        from_lane_id: laneId,
        to_road_id: road.id,
        to_lane_id: lane.id,
        maneuver: movement,
      })),
  );
  return { ...city, lane_connections: [...withoutMovement, ...additions] };
}
