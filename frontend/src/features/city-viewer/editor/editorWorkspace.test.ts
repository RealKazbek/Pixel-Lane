import { describe, expect, it } from "vitest";
import { buildRoadSurfaceFeatureCollection } from "../map/adapters/roadSurfaceGeometry";
import { buildEditorWorkspace } from "./editorWorkspace";

describe("buildEditorWorkspace", () => {
  it("starts clean with three production-backed minimal roads", () => {
    const city = buildEditorWorkspace();
    expect(city.id).toBe("editor-workspace");
    expect(city.roads).toHaveLength(3);
    expect(city.roads.map((road) => road.name)).toEqual([
      "Road A",
      "Road B",
      "Road C",
    ]);
    for (const road of city.roads) {
      expect(road.geometry.points).toHaveLength(2);
      expect(road.lanes).toHaveLength(2);
    }
    expect(city.intersections).toHaveLength(0);
    expect(city.traffic_lights).toHaveLength(0);
    expect(city.parking_zones).toHaveLength(0);
    expect(city.bus_stops).toHaveLength(0);
    expect(city.crosswalks).toHaveLength(0);

    const surfaces = buildRoadSurfaceFeatureCollection(
      city.roads,
      city.intersections,
      city.coordinate_system,
    );
    expect(surfaces.features).toHaveLength(3);
    expect(surfaces.features.map((feature) => feature.properties.id)).toEqual([
      "editor-road-a",
      "editor-road-b",
      "editor-road-c",
    ]);
    expect(
      surfaces.features.every((feature) => !feature.properties.is_junction),
    ).toBe(true);
  });
});
