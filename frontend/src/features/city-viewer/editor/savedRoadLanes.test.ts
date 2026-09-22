import { describe, expect, it } from "vitest";
import { buildEditorWorkspace } from "./editorWorkspace";
import { reconcileSavedRoadLanes } from "./savedRoadLanes";

describe("reconcileSavedRoadLanes", () => {
  it("adopts persisted IDs while preserving newer local edits and other roads", () => {
    const city = buildEditorWorkspace();
    const road = city.roads[0];
    const saved = {
      ...road,
      lanes: road.lanes.map((lane, index) => ({
        ...lane,
        id: `server-${index}`,
      })),
    };
    road.name = "Newer local name";
    road.lanes[0] = { ...road.lanes[0], direction: "BACKWARD" };
    city.intersections = [
      {
        id: "junction",
        city_id: city.id,
        position: road.geometry.points[0],
        connected_road_ids: [road.id, city.roads[1].id],
        connected_lane_ids: [],
        control_type: "UNCONTROLLED",
        traffic_light_id: null,
      },
    ];
    const result = reconcileSavedRoadLanes(city, saved);
    expect(result.roads[0].name).toBe("Newer local name");
    expect(result.roads[0].lanes[0]).toMatchObject({
      id: "server-0",
      direction: "BACKWARD",
    });
    expect(result.roads[1]).toBe(city.roads[1]);
    expect(result.intersections[0].connected_lane_ids).toEqual([
      "server-0",
      "server-1",
      ...city.roads[1].lanes.map((lane) => lane.id),
    ]);
    expect(city.intersections[0].connected_lane_ids).toEqual([]);
  });

  it("drops connections to deleted lanes without discarding surviving connections", () => {
    const city = buildEditorWorkspace();
    const road = city.roads[0];
    const connection = {
      id: "keep",
      city_id: city.id,
      intersection_id: "junction",
      from_road_id: road.id,
      from_lane_id: road.lanes[0].id,
      to_road_id: city.roads[1].id,
      to_lane_id: city.roads[1].lanes[0].id,
      maneuver: "LEFT" as const,
    };
    city.lane_connections = [
      connection,
      { ...connection, id: "deleted", from_lane_id: "removed-lane" },
    ];
    expect(reconcileSavedRoadLanes(city, road).lane_connections).toEqual([
      connection,
    ]);
  });
});
