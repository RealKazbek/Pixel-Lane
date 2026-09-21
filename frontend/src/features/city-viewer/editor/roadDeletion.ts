import type { City } from "../types/city";

/** Apply the server-confirmed road deletion to the transient editor model. */
export function removeRoadFromCity(city: City, roadId: string): City {
  const road = city.roads.find((candidate) => candidate.id === roadId);
  if (!road) return city;

  const laneIds = new Set(road.lanes.map((lane) => lane.id));
  const removedIntersectionIds = new Set(
    city.intersections
      .filter((intersection) =>
        intersection.connected_road_ids.includes(roadId),
      )
      .filter(
        (intersection) =>
          intersection.connected_road_ids.filter((id) => id !== roadId).length <
          2,
      )
      .map((intersection) => intersection.id),
  );

  return {
    ...city,
    roads: city.roads.filter((candidate) => candidate.id !== roadId),
    intersections: city.intersections
      .filter((intersection) => !removedIntersectionIds.has(intersection.id))
      .map((intersection) => ({
        ...intersection,
        connected_road_ids: intersection.connected_road_ids.filter(
          (id) => id !== roadId,
        ),
        connected_lane_ids: intersection.connected_lane_ids.filter(
          (id) => !laneIds.has(id),
        ),
      })),
    traffic_lights: city.traffic_lights
      .filter((light) => !removedIntersectionIds.has(light.intersection_id))
      .map((light) => ({
        ...light,
        signal_groups: light.signal_groups.map((group) => ({
          ...group,
          controlled_lane_ids: group.controlled_lane_ids.filter(
            (id) => !laneIds.has(id),
          ),
        })),
      })),
    parking_zones: city.parking_zones.filter(
      (zone) => zone.road_id !== roadId && !laneIds.has(zone.lane_id ?? ""),
    ),
    bus_stops: city.bus_stops.filter((stop) => stop.road_id !== roadId),
    crosswalks: city.crosswalks.filter(
      (crosswalk) => crosswalk.road_id !== roadId,
    ),
    lane_connections: (city.lane_connections ?? []).filter(
      (connection) =>
        !removedIntersectionIds.has(connection.intersection_id) &&
        connection.from_road_id !== roadId &&
        connection.to_road_id !== roadId &&
        !laneIds.has(connection.from_lane_id) &&
        !laneIds.has(connection.to_lane_id),
    ),
  };
}
