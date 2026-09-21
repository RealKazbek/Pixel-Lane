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
        "line-width": 3,
        "line-opacity": 1,
      },
    } as LayerSpecification,
    {
      id: LAYER_IDS.laneConnectionArrows,
      type: "symbol",
      source: SOURCE_IDS.laneConnections,
      minzoom: 13,
      layout: {
        "symbol-placement": "line-center",
        "text-field": [
          "match",
          ["get", "maneuver"],
          "LEFT",
          "↶",
          "RIGHT",
          "↷",
          "U_TURN",
          "↺",
          "↑",
        ],
        "text-size": ["interpolate", ["linear"], ["zoom"], 13, 11, 17, 16, 20, 20],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-rotation-alignment": "map",
      },
      paint: {
        "text-color": theme.laneConnection,
        "text-halo-color": theme.background,
        "text-halo-width": 1.5,
      },
    } as LayerSpecification,
  ];
}
