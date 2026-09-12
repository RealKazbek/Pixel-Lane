import { describe, expect, it } from "vitest";
import {
  buildIntersectionFeatureCollection,
  buildRoadFeatureCollection,
  buildRoadLabelFeatureCollection,
  buildTrafficLightFeatureCollection,
} from "../adapters/cityModelToGeoJson";
import type { Intersection, Road, TrafficLight } from "../../types/city";

function makeRoad(overrides: Partial<Road> = {}): Road {
  return {
    id: "road-1",
    city_id: "city-1",
    name: "Main St",
    road_type: "ARTERIAL",
    geometry: { points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] },
    default_speed_limit_kmh: 50,
    lanes: [
      {
        id: "lane-1",
        road_id: "road-1",
        index: 0,
        direction: "FORWARD",
        allowed_movements: ["STRAIGHT"],
        lane_type: "GENERAL",
        speed_limit_kmh: null,
      },
    ],
    ...overrides,
  };
}

function makeIntersection(overrides: Partial<Intersection> = {}): Intersection {
  return {
    id: "int-1",
    city_id: "city-1",
    position: { x: 5, y: 5 },
    connected_road_ids: ["road-1"],
    connected_lane_ids: [],
    control_type: "UNCONTROLLED",
    traffic_light_id: null,
    ...overrides,
  };
}

describe("buildRoadFeatureCollection", () => {
  it("converts each road into a LineString feature with derived properties", () => {
    const road = makeRoad();
    const fc = buildRoadFeatureCollection(
      { roads: [road], coordinate_system: "WGS84" },
      null,
    );
    expect(fc.features).toHaveLength(1);
    const feature = fc.features[0];
    expect(feature.geometry.coordinates).toEqual([[0, 0], [10, 10]]);
    expect(feature.properties).toMatchObject({
      id: "road-1",
      name: "Main St",
      road_type: "ARTERIAL",
      hierarchy: "ARTERIAL",
      lane_count: 1,
    });
  });

  it("marks the selected road via the selected property", () => {
    const road = makeRoad();
    const fc = buildRoadFeatureCollection(
      { roads: [road], coordinate_system: "WGS84" },
      "road-1",
    );
    expect(fc.features[0].properties.selected).toBe(true);
  });
});

describe("buildIntersectionFeatureCollection", () => {
  it("converts intersections into Point features and flags traffic lights", () => {
    const intersection = makeIntersection({ traffic_light_id: "tl-1" });
    const fc = buildIntersectionFeatureCollection(
      { intersections: [intersection], coordinate_system: "WGS84" },
      null,
    );
    expect(fc.features[0].geometry.coordinates).toEqual([5, 5]);
    expect(fc.features[0].properties.has_traffic_light).toBe(true);
  });
});

describe("buildTrafficLightFeatureCollection", () => {
  it("places each light at its intersection's position", () => {
    const intersection = makeIntersection({ traffic_light_id: "tl-1" });
    const light: TrafficLight = {
      id: "tl-1",
      city_id: "city-1",
      intersection_id: "int-1",
      signal_groups: [],
      phases: [],
    };
    const fc = buildTrafficLightFeatureCollection({
      traffic_lights: [light],
      intersections: [intersection],
      coordinate_system: "WGS84",
    });
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].geometry.coordinates).toEqual([5, 5]);
  });

  it("skips a light whose intersection is missing", () => {
    const light: TrafficLight = {
      id: "tl-orphan",
      city_id: "city-1",
      intersection_id: "does-not-exist",
      signal_groups: [],
      phases: [],
    };
    const fc = buildTrafficLightFeatureCollection({
      traffic_lights: [light],
      intersections: [],
      coordinate_system: "WGS84",
    });
    expect(fc.features).toHaveLength(0);
  });
});

describe("buildRoadLabelFeatureCollection", () => {
  it("includes named roads", () => {
    const fc = buildRoadLabelFeatureCollection({
      roads: [makeRoad({ name: "Abay Avenue" })],
      coordinate_system: "WGS84",
    });
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties.name).toBe("Abay Avenue");
  });

  it("skips OSM-importer fallback names", () => {
    const fc = buildRoadLabelFeatureCollection({
      roads: [makeRoad({ name: "Unnamed road 42" })],
      coordinate_system: "WGS84",
    });
    expect(fc.features).toHaveLength(0);
  });

  it("skips roads with an empty name", () => {
    const fc = buildRoadLabelFeatureCollection({
      roads: [makeRoad({ name: "" })],
      coordinate_system: "WGS84",
    });
    expect(fc.features).toHaveLength(0);
  });
});
