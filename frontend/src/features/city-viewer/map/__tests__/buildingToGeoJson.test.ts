import { describe, expect, it } from "vitest";
import { buildBuildingFeatureCollection } from "../adapters/buildingToGeoJson";
import { buildingHeightMeters, validateBuilding, type Building } from "../../buildings/building";

const footprint = [
  { x: 10, y: 20 },
  { x: 20, y: 20 },
  { x: 20, y: 30 },
  { x: 10, y: 20 },
];
const building: Building = {
  id: "b-1",
  footprint,
  height_m: 12,
  levels: 4,
  use_type: "RESIDENTIAL",
};

describe("building domain and GeoJSON adapter", () => {
  it("accepts a closed polygon footprint", () => expect(() => validateBuilding(building)).not.toThrow());
  it("uses explicit height before level fallback", () => {
    expect(buildingHeightMeters(building)).toBe(12);
    expect(buildingHeightMeters({ height_m: null, levels: 5 })).toBe(15);
  });
  it("converts a building to a polygon with extrusion properties", () => {
    const feature = buildBuildingFeatureCollection([building], "LOCAL_CARTESIAN").features[0];
    expect(feature.geometry.type).toBe("Polygon");
    expect(feature.geometry.coordinates[0]).toHaveLength(4);
    expect(feature.properties.height_m).toBe(12);
    expect(feature.properties.elevation_strategy).toBe("TERRAIN");
  });
  it("preserves missing elevation as an explicit renderer fallback", () => {
    const feature = buildBuildingFeatureCollection(
      [{ ...building, base_elevation_m: null }],
      "LOCAL_CARTESIAN",
    ).features[0];
    expect(feature.properties.base_elevation_m).toBeNull();
    expect(feature.properties.elevation_strategy).toBe("TERRAIN");
  });
  it("rejects invalid or open footprints and negative heights", () => {
    expect(() => validateBuilding({ ...building, footprint: footprint.slice(0, 3) })).toThrow();
    expect(() => validateBuilding({ ...building, footprint: [...footprint.slice(0, 3), { x: 9, y: 9 }] })).toThrow();
    expect(() => validateBuilding({ ...building, height_m: -1 })).toThrow();
  });
});
