import type { LayerSpecification } from "maplibre-gl";
import { LAYER_IDS, SOURCE_IDS } from "./layerIds";
import type { MapThemeColors } from "../styles/mapTheme";

export function buildLaneConnectionLayers(
  theme: MapThemeColors,
): LayerSpecification[] {
  return [
    {
      id: LAYER_IDS.laneConnections,
      type: "line",
      source: SOURCE_IDS.laneConnections,
      minzoom: 12,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": theme.laneConnection,
        "line-width": 2.5,
        "line-opacity": 0.9,
        "line-dasharray": [1.5, 1],
      },
    } as LayerSpecification,
  ];
}
