import { describe, expect, it } from "vitest";
import { buildEditorWorkspace } from "./editorWorkspace";
import { removeRoadFromCity } from "./roadDeletion";

describe("removeRoadFromCity", () => {
  it("removes the road and all derived topology references", () => {
    const city = buildEditorWorkspace();
    const [road, otherRoad] = city.roads;
    city.intersections = [
      {
        id: "intersection",
        city_id: city.id,
        position: { x: 0, y: 0 },
        connected_road_ids: [road.id, otherRoad.id],
        connected_lane_ids: [road.lanes[0].id, otherRoad.lanes[0].id],
        control_type: "UNCONTROLLED",
        traffic_light_id: null,
      },
    ];
    city.lane_connections = [
      {
        id: "connection",
        city_id: city.id,
        intersection_id: "intersection",
        from_road_id: road.id,
        from_lane_id: road.lanes[0].id,
        to_road_id: otherRoad.id,
        to_lane_id: otherRoad.lanes[0].id,
        maneuver: "STRAIGHT",
      },
    ];

    const next = removeRoadFromCity(city, road.id);

    expect(next.roads.map((item) => item.id)).not.toContain(road.id);
    expect(next.intersections).toEqual([]);
    expect(next.lane_connections).toEqual([]);
  });

  it("does not mutate the input city", () => {
    const city = buildEditorWorkspace();
    const next = removeRoadFromCity(city, city.roads[0].id);

    expect(city.roads).toHaveLength(3);
    expect(next.roads).toHaveLength(2);
  });
});
