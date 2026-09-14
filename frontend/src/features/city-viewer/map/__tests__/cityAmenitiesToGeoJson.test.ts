import { describe, expect, it } from "vitest";
import {
  buildBusStopFeatureCollection,
  buildCrosswalkFeatureCollection,
} from "../adapters/cityAmenitiesToGeoJson";
import type { BusStop, Crosswalk, Road } from "../../types/city";

function makeRoad(overrides: Partial<Road> = {}): Road {
  return {
    id: "road-1",
    city_id: "city-1",
    name: "Main St",
    road_type: "ARTERIAL",
    geometry: {
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 100 },
      ],
    },
    default_speed_limit_kmh: 50,
    width_m: 8,
    lanes: [],
    ...overrides,
  };
}

describe("buildBusStopFeatureCollection", () => {
  it("places a bus stop at its own explicit position", () => {
    const stop: BusStop = {
      id: "stop-1",
      city_id: "city-1",
      road_id: "road-1",
      position_x: 10,
      position_y: 20,
      name: "Test Stop",
    };
    const fc = buildBusStopFeatureCollection([stop], "LOCAL_CARTESIAN");
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties).toEqual({ id: "stop-1", name: "Test Stop" });
    expect(fc.features[0].geometry.coordinates.every(Number.isFinite)).toBe(true);
  });
});

describe("buildCrosswalkFeatureCollection", () => {
  it("resolves a crosswalk's position along its own road's centerline", () => {
    const road = makeRoad();
    const crossing: Crosswalk = {
      id: "crossing-1",
      city_id: "city-1",
      road_id: "road-1",
      position_ratio: 0.5,
    };
    const fc = buildCrosswalkFeatureCollection([crossing], [road], "LOCAL_CARTESIAN");
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].geometry.coordinates.every(Number.isFinite)).toBe(true);
  });

  it("skips a crosswalk referencing a road that isn't in the given road list", () => {
    const crossing: Crosswalk = {
      id: "crossing-1",
      city_id: "city-1",
      road_id: "unknown-road",
      position_ratio: 0.5,
    };
    const fc = buildCrosswalkFeatureCollection([crossing], [], "LOCAL_CARTESIAN");
    expect(fc.features).toHaveLength(0);
  });
});
