import { toLngLat } from "./coordinates";
import type { Building } from "../../buildings/building";
import { buildingHeightMeters, validateBuilding } from "../../buildings/building";
import type { CoordinateSystem } from "../../types/city";

export interface BuildingFeatureProperties {
  id: string;
  name: string | null;
  use_type: string;
  height_m: number;
  levels: number | null;
  base_elevation_m: number | null;
  elevation_strategy: string;
}

export type BuildingFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon,
  BuildingFeatureProperties
>;

export function buildBuildingFeatureCollection(
  buildings: Building[],
  coordinateSystem: CoordinateSystem,
): BuildingFeatureCollection {
  return {
    type: "FeatureCollection",
    features: buildings.map((building) => {
      validateBuilding(building);
      return {
        type: "Feature",
        id: building.id,
        geometry: {
          type: "Polygon",
          coordinates: [building.footprint.map((point) => toLngLat(coordinateSystem, point))],
        },
        properties: {
          id: building.id,
          name: building.name ?? null,
          use_type: building.use_type,
          height_m: buildingHeightMeters(building),
          levels: building.levels ?? null,
          base_elevation_m: building.base_elevation_m ?? null,
          elevation_strategy: building.elevation_strategy ?? "TERRAIN",
        },
      };
    }),
  };
}
