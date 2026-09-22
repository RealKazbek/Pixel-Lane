import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import { LAYER_IDS, SOURCE_IDS } from "./layerIds";
import type { MapThemeColors } from "../styles/mapTheme";

function guidanceWidth(extra = 0): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    13,
    1.25 + extra,
    16,
    1.8 + extra,
    20,
    2.6 + extra,
  ];
}

export function buildLaneConnectionLayers(
  theme: MapThemeColors,
): LayerSpecification[] {
  return [
    {
      id: LAYER_IDS.laneConnectionCasing,
      type: "line",
      source: SOURCE_IDS.laneConnections,
      minzoom: 13,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": theme.background,
        "line-width": guidanceWidth(1.6),
        "line-opacity": 0.68,
      },
    } as LayerSpecification,
    {
      id: LAYER_IDS.laneConnections,
      type: "line",
      source: SOURCE_IDS.laneConnections,
      minzoom: 13,
      layout: { "line-cap": "round", "line-join": "miter" },
      paint: {
        "line-color": theme.laneConnection,
        "line-width": guidanceWidth(),
        "line-opacity": 0.96,
      },
    } as LayerSpecification,
  ];
}
