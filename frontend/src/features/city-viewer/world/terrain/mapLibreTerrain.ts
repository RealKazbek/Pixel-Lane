import type { Map as MapLibreMap, LngLatLike } from "maplibre-gl";

import type { TerrainSourceConfig } from "./config";
import type { TerrainProvider } from "./types";

/** Installs a DEM source and terrain on a MapLibre map. */
export function installTerrain(
  map: MapLibreMap,
  config: TerrainSourceConfig,
): void {
  if (!map.getSource(config.sourceId)) {
    map.addSource(config.sourceId, config.source);
  }
  map.setTerrain(config.terrain);
}

/** Reads MapLibre's loaded ground surface; null means no DEM value is available. */
export function createMapLibreTerrainProvider(
  map: MapLibreMap,
): TerrainProvider {
  return {
    getElevation(lng: number, lat: number): number | null {
      const elevation = map.queryTerrainElevation([lng, lat] as LngLatLike);
      return elevation ?? null;
    },
  };
}
