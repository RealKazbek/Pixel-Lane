import type { LayerSpecification } from "maplibre-gl";
import { LAYER_IDS, SOURCE_IDS } from "./layerIds";
import type { MapThemeColors } from "../styles/mapTheme";

export function buildJunctionLaneDirectionLayers(
  theme: MapThemeColors,
): LayerSpecification[] {
  return [
    {
      id: LAYER_IDS.junctionLaneDirections,
      type: "symbol",
      source: SOURCE_IDS.junctionLaneDirections,
      minzoom: 12,
      layout: {
        "text-field": "↑",
        "text-size": ["interpolate", ["linear"], ["zoom"], 12, 12, 18, 18],
        "text-rotate": ["get", "bearing"],
        "text-rotation-alignment": "map",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": theme.selected,
        "text-halo-color": theme.background,
        "text-halo-width": 1.5,
      },
    } as LayerSpecification,
  ];
}
