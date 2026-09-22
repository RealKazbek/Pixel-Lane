import type {
  RasterDEMSourceSpecification,
  TerrainSpecification,
} from "maplibre-gl";

export const DEFAULT_TERRAIN_SOURCE_ID = "pixel-lane-terrain-dem";

export interface TerrainSourceConfig {
  sourceId: string;
  source: RasterDEMSourceSpecification;
  terrain: TerrainSpecification;
}

export interface RasterDEMSourceOptions {
  sourceId?: string;
  url?: string;
  tiles?: string[];
  tileSize?: number;
  encoding?: RasterDEMSourceSpecification["encoding"];
  exaggeration?: number;
}

/** Build provider-neutral MapLibre terrain configuration. */
export function createTerrainSourceConfig(
  options: RasterDEMSourceOptions,
): TerrainSourceConfig {
  const { sourceId = DEFAULT_TERRAIN_SOURCE_ID, url, tiles } = options;
  if ((url === undefined) === (tiles === undefined)) {
    throw new Error(
      "Terrain DEM configuration requires exactly one of url or tiles",
    );
  }
  if (tiles !== undefined && tiles.length === 0) {
    throw new Error("Terrain DEM tile configuration cannot be empty");
  }
  if (options.exaggeration !== undefined && options.exaggeration < 0) {
    throw new Error("Terrain exaggeration cannot be negative");
  }

  const source: RasterDEMSourceSpecification = {
    type: "raster-dem",
    ...(url === undefined ? { tiles } : { url }),
    tileSize: options.tileSize ?? 256,
    ...(options.encoding === undefined ? {} : { encoding: options.encoding }),
  };

  return {
    sourceId,
    source,
    terrain: {
      source: sourceId,
      exaggeration: options.exaggeration ?? 1,
    },
  };
}
