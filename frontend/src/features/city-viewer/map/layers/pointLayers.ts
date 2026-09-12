import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import { LAYER_IDS, SOURCE_IDS } from "./layerIds";
import { SELECTED_COLOR } from "../styles/roadStyle";

const INTERSECTION_FILL = "#e2e8f0"; // slate-200
const INTERSECTION_STROKE = "#0f172a"; // slate-900

export function buildIntersectionLayer(): LayerSpecification {
  return {
    id: LAYER_IDS.intersections,
    type: "circle",
    source: SOURCE_IDS.intersections,
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        12,
        1.5,
        16,
        4,
        20,
        9,
      ] as ExpressionSpecification,
      "circle-color": [
        "case",
        ["boolean", ["get", "selected"], false],
        SELECTED_COLOR,
        INTERSECTION_FILL,
      ] as ExpressionSpecification,
      "circle-stroke-color": [
        "case",
        ["boolean", ["get", "selected"], false],
        SELECTED_COLOR,
        INTERSECTION_STROKE,
      ] as ExpressionSpecification,
      "circle-stroke-width": [
        "case",
        ["get", "has_traffic_light"],
        2.5,
        1.2,
      ] as ExpressionSpecification,
    },
  };
}

/** A compact three-dot signal marker, offset next to the intersection --
 * intentionally not a real phase animation (Traffic Engine v1 has no
 * signal-timing simulation; see docs/architecture.md). */
export function buildTrafficLightLayer(): LayerSpecification {
  return {
    id: LAYER_IDS.trafficLights,
    type: "circle",
    source: SOURCE_IDS.trafficLights,
    minzoom: 15,
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        15,
        2,
        20,
        4,
      ] as ExpressionSpecification,
      "circle-color": "#ef4444",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1,
      "circle-translate": [8, -8],
    },
  };
}

export function buildRoadLabelLayer(): LayerSpecification {
  return {
    id: LAYER_IDS.roadLabels,
    type: "symbol",
    source: SOURCE_IDS.labels,
    minzoom: 14,
    layout: {
      "text-field": ["get", "name"],
      "text-size": 11,
      "text-font": ["Noto Sans Regular"],
      "symbol-placement": "point",
      "text-max-width": 8,
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "#27272a",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.4,
    },
  };
}
