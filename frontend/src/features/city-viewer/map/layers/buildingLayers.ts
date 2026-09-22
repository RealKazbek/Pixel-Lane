import type { LayerSpecification } from "maplibre-gl";
import { LAYER_IDS, SOURCE_IDS } from "./layerIds";

/** Isolated first World Engine building layer: lightweight MapLibre extrusion.
 * Terrain-aware placement remains a renderer concern; the domain carries the
 * elevation strategy/base elevation without baking terrain assumptions here. */
export function buildBuildingLayers(): LayerSpecification[] {
  return [
    {
      id: LAYER_IDS.buildings,
      type: "fill-extrusion",
      source: SOURCE_IDS.buildings,
      minzoom: 14,
      paint: {
        "fill-extrusion-color": ["match", ["get", "use_type"], "CIVIC", "#8b9bb4", "#b7a58a"],
        "fill-extrusion-height": ["get", "height_m"],
        "fill-extrusion-base": ["coalesce", ["get", "base_elevation_m"], 0],
        "fill-extrusion-opacity": 0.82,
      },
    },
  ];
}
