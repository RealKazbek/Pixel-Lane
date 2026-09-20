import { describe, expect, it } from "vitest";
import { buildLaneConnectionFeatureCollection } from "../adapters/laneConnectionGeometry";
import { createEditorRoad } from "../../editor/editorWorkspace";
import type { City } from "../../types/city";

function cityWithConnections(): City {
  const fromRoad = createEditorRoad("road-from", "From", [
    { x: -100, y: 0 },
    { x: 0, y: 0 },
  ]);
  const toRoad = createEditorRoad("road-to", "To", [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]);
  const intersection = {
    id: "intersection-1",
    city_id: "editor-workspace",
    position: { x: 0, y: 0 },
    connected_road_ids: [fromRoad.id, toRoad.id],
    connected_lane_ids: [fromRoad.lanes[1].id, toRoad.lanes[0].id],
    control_type: "UNCONTROLLED" as const,
    traffic_light_id: null,
  };
  return {
    id: "editor-workspace",
    name: "Editor workspace",
    description: null,
    coordinate_system: "LOCAL_CARTESIAN",
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    roads: [fromRoad, toRoad],
    intersections: [intersection],
    traffic_lights: [],
    parking_zones: [],
    bus_stops: [],
    crosswalks: [],
    lane_connections: [
      {
        id: "connection-1",
        city_id: "editor-workspace",
        intersection_id: intersection.id,
        from_road_id: fromRoad.id,
        from_lane_id: fromRoad.lanes[1].id,
        to_road_id: toRoad.id,
        to_lane_id: toRoad.lanes[0].id,
        maneuver: "STRAIGHT",
      },
    ],
  };
}

describe("buildLaneConnectionFeatureCollection", () => {
  it("returns an empty collection without connections", () => {
    const city = cityWithConnections();
    city.lane_connections = [];
    expect(
      buildLaneConnectionFeatureCollection(city, city.coordinate_system).features,
    ).toHaveLength(0);
  });

  it("derives a curve with stable endpoint metadata", () => {
    const city = cityWithConnections();
    const collection = buildLaneConnectionFeatureCollection(
      city,
      city.coordinate_system,
    );
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].properties).toMatchObject({
      id: "connection-1",
      from_lane_id: city.lane_connections![0].from_lane_id,
      to_lane_id: city.lane_connections![0].to_lane_id,
      maneuver: "STRAIGHT",
    });
    expect(collection).toEqual(
      buildLaneConnectionFeatureCollection(city, city.coordinate_system),
    );
  });
});
