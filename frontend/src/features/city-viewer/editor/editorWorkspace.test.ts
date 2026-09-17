import { describe, expect, it } from "vitest";
import { buildRoadSurfaceFeatureCollection } from "../map/adapters/roadSurfaceGeometry";
import { buildEditorWorkspace } from "./editorWorkspace";

describe("buildEditorWorkspace", () => {
  it("starts clean with one production-backed minimal road", () => {
    const city = buildEditorWorkspace();
    expect(city.id).toBe("editor-workspace");
    expect(city.roads).toHaveLength(1);
    expect(city.roads[0].geometry.points).toHaveLength(2);
    expect(city.roads[0].lanes).toHaveLength(0);
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
    expect(surfaces.features).toHaveLength(1);
    expect(surfaces.features[0].properties.id).toBe("editor-road-a");
    expect(surfaces.features[0].properties.is_junction).toBe(false);
  });
});
