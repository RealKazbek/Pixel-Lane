/**
 * Bus stop and pedestrian-crossing point layers, sourced from
 * `adapters/cityAmenitiesToGeoJson.ts`. Zoom-gated the same as other
 * close-zoom detail (see `zoomThresholds.ts`) so they don't clutter a
 * city-wide view, and icon-based (`layers/icons.ts`) rather than raw
 * text for the same collision-detection/legibility reasons as the bus
 * lane/parking badges (see `laneDetailLayers.ts`).
 */

import type { LayerSpecification } from "maplibre-gl";
import { ICON_IDS } from "./icons";
import { LAYER_IDS, SOURCE_IDS } from "./layerIds";
import { LANE_DETAIL_MIN_ZOOM } from "./zoomThresholds";
import type { MapThemeColors } from "../styles/mapTheme";

export function buildAmenityLayers(theme: MapThemeColors): LayerSpecification[] {
  const busStops: LayerSpecification = {
    id: LAYER_IDS.busStops,
    type: "symbol",
    source: SOURCE_IDS.busStops,
    minzoom: 15,
    layout: {
      "icon-image": ICON_IDS.busStopBadge,
      "icon-size": 0.75,
      "icon-allow-overlap": false,
      "icon-ignore-placement": false,
      "text-field": ["get", "name"],
      "text-size": 11,
      "text-font": ["Noto Sans Regular"],
      "text-offset": [0, 1.4],
      "text-optional": true,
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": theme.roadLabel,
      "text-halo-color": theme.roadLabelHalo,
      "text-halo-width": 1.4,
    },
  };

  const crosswalks: LayerSpecification = {
    id: LAYER_IDS.crosswalks,
    type: "symbol",
    source: SOURCE_IDS.crosswalks,
    minzoom: LANE_DETAIL_MIN_ZOOM,
    layout: {
      "icon-image": ICON_IDS.crosswalkBadge,
      "icon-size": 0.5,
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: {},
  };

  return [crosswalks, busStops];
}
