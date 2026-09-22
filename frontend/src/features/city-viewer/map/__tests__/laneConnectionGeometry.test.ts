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
  const turnRoad = createEditorRoad("road-turn", "Turn", [
    { x: 0, y: 0 },
    { x: 0, y: 100 },
  ]);
  const intersection = {
    id: "intersection-1",
    city_id: "editor-workspace",
    position: { x: 0, y: 0 },
    connected_road_ids: [fromRoad.id, toRoad.id, turnRoad.id],
    connected_lane_ids: [
      fromRoad.lanes[1].id,
      toRoad.lanes[0].id,
      turnRoad.lanes[0].id,
    ],
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
    roads: [fromRoad, toRoad, turnRoad],
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
      buildLaneConnectionFeatureCollection(city, city.coordinate_system)
        .features,
    ).toHaveLength(0);
  });

  it("derives one unified symbol with stable lane metadata", () => {
    const city = cityWithConnections();
    const collection = buildLaneConnectionFeatureCollection(
      city,
      city.coordinate_system,
    );
    expect(collection.features).toHaveLength(1);
    const symbol = collection.features[0];
    expect(symbol.properties).toMatchObject({
      from_lane_id: city.lane_connections![0].from_lane_id,
      connection_ids: "connection-1",
      maneuvers: "STRAIGHT",
    });
    expect(symbol.geometry.type).toBe("MultiLineString");
    expect(symbol.geometry.coordinates).toHaveLength(3);
    expect(symbol.geometry.coordinates[0]).toHaveLength(2);
    expect(symbol.geometry.coordinates[2]).toHaveLength(3);
    expect(collection).toEqual(
      buildLaneConnectionFeatureCollection(city, city.coordinate_system),
    );
  });

  it("groups every maneuver from an incoming lane into one feature", () => {
    const city = cityWithConnections();
    city.lane_connections!.push({
      ...city.lane_connections![0],
      id: "connection-2",
      to_road_id: city.roads[2].id,
      to_lane_id: city.roads[2].lanes[0].id,
      maneuver: "LEFT",
    });

    const collection = buildLaneConnectionFeatureCollection(
      city,
      city.coordinate_system,
    );

    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].properties).toMatchObject({
      connection_ids: "connection-1|connection-2",
      maneuvers: "LEFT|STRAIGHT",
    });
    // One stem, two curves, and two heads: still one GeoJSON symbol.
    expect(collection.features[0].geometry.coordinates).toHaveLength(5);
    expect(collection.features[0].geometry.coordinates[1].at(-1)).not.toEqual(
      collection.features[0].geometry.coordinates[2].at(-1),
    );
  });
});
