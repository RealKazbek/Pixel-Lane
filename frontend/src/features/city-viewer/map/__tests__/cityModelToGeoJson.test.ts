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
    geometry: {
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
    },
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
    const fc = buildRoadFeatureCollection({
      roads: [road],
      coordinate_system: "WGS84",
    });
    expect(fc.features).toHaveLength(1);
    const feature = fc.features[0];
    expect(feature.geometry.coordinates).toEqual([
      [0, 0],
      [10, 10],
    ]);
    expect(feature.properties).toMatchObject({
      id: "road-1",
      name: "Main St",
      road_type: "ARTERIAL",
      hierarchy: "ARTERIAL",
      lane_count: 1,
    });
    expect(feature.properties.casing_width_m).toBeGreaterThan(
      feature.properties.width_m,
    );
  });

  it("prefers an explicit backend-provided width_m over the lane-count estimate", () => {
    const withExplicitWidth = makeRoad({ width_m: 42, is_width_estimated: false });
    const withoutExplicitWidth = makeRoad({ width_m: null });

    const fc = buildRoadFeatureCollection({
      roads: [withExplicitWidth, withoutExplicitWidth],
      coordinate_system: "WGS84",
    });

    expect(fc.features[0].properties.width_m).toBe(42);
    expect(fc.features[0].properties.is_width_estimated).toBe(false);
    expect(fc.features[1].properties.width_m).not.toBe(42);
    expect(fc.features[1].properties.is_width_estimated).toBe(true);
  });

  it("passes through carriageway/median/level/bridge/tunnel metadata with safe defaults", () => {
    const divided = makeRoad({
      carriageway_count: 2,
      median: "UNKNOWN",
      level: 1,
      is_bridge: true,
    });
    const legacy = makeRoad(); // no Part 1 fields at all -- backward compatibility

    const fc = buildRoadFeatureCollection({
      roads: [divided, legacy],
      coordinate_system: "WGS84",
    });

    expect(fc.features[0].properties).toMatchObject({
      carriageway_count: 2,
      median: "UNKNOWN",
      level: 1,
      is_bridge: true,
      is_tunnel: false,
    });
    expect(fc.features[1].properties).toMatchObject({
      carriageway_count: 1,
      median: "NONE",
      level: 0,
      is_bridge: false,
      is_tunnel: false,
    });
  });
});

describe("buildIntersectionFeatureCollection", () => {
  it("converts intersections into Point features and flags traffic lights", () => {
    const intersection = makeIntersection({ traffic_light_id: "tl-1" });
    const fc = buildIntersectionFeatureCollection({
      intersections: [intersection],
      coordinate_system: "WGS84",
    });
    expect(fc.features[0].geometry.coordinates).toEqual([5, 5]);
    expect(fc.features[0].properties.has_traffic_light).toBe(true);
  });

  it("reports how many roads connect at each intersection", () => {
    const intersection = makeIntersection({
      connected_road_ids: ["road-1", "road-2", "road-3"],
    });
    const fc = buildIntersectionFeatureCollection({
      intersections: [intersection],
      coordinate_system: "WGS84",
    });
    expect(fc.features[0].properties.connected_road_count).toBe(3);
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

  it("emits exactly one label for multiple segments sharing a street name, at the longest segment", () => {
    const shortSegment = makeRoad({
      id: "seg-short",
      name: "Abay Avenue",
      geometry: {
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      },
    });
    const longSegment = makeRoad({
      id: "seg-long",
      name: "Abay Avenue",
      geometry: {
        points: [
          { x: 10, y: 0 },
          { x: 10, y: 100 },
        ],
      },
    });
    const fc = buildRoadLabelFeatureCollection({
      roads: [shortSegment, longSegment],
      coordinate_system: "WGS84",
    });
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].id).toBe("seg-long");
  });
});
