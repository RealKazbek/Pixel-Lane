import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import { LAYER_IDS, SOURCE_IDS } from "./layerIds";
import { SELECTED_COLOR } from "../styles/roadStyle";

const JUNCTION_FILL = "#78716c"; // stone-500, close to the road surface tones
const JUNCTION_STROKE = "#1c1917"; // stone-900

const isSelected: ExpressionSpecification = [
  "boolean",
  ["feature-state", "selected"],
  false,
] as unknown as ExpressionSpecification;

/** Real junctions (3+ connected roads) or signalized nodes are shown from
 * a moderate zoom; simple topology pass-through nodes (2 connected roads,
 * no signal -- an artifact of how OSM/City Model splits a road into
 * segments, not an actual junction) only render once zoomed in enough to
 * be doing detailed inspection/editing. Without this, every topology node
 * painted the same as a real junction is what made the map read as an
 * abstract node graph instead of a road network. */
const isJunctionOrSignal: ExpressionSpecification = [
  "any",
  [">=", ["get", "connected_road_count"], 3],
  ["get", "has_traffic_light"],
] as unknown as ExpressionSpecification;

const isTopologyPassThrough: ExpressionSpecification = [
  "all",
  ["<", ["get", "connected_road_count"], 3],
  ["!", ["get", "has_traffic_light"]],
] as unknown as ExpressionSpecification;

function circleRadiusExpression(
  selectedRadius: number,
  zoomStops: readonly [number, number][],
): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    ...zoomStops.flatMap(([zoom, radius]) => [
      zoom,
      ["case", isSelected, selectedRadius, radius],
    ]),
  ] as ExpressionSpecification;
}

export function buildIntersectionLayers(): LayerSpecification[] {
  const radius = circleRadiusExpression(8, [
    [13, 1.2],
    [16, 2.6],
    [20, 5],
  ]);
  const paint = {
    "circle-radius": radius,
    "circle-color": [
      "case",
      isSelected,
      SELECTED_COLOR,
      JUNCTION_FILL,
    ] as ExpressionSpecification,
    "circle-stroke-color": [
      "case",
      isSelected,
      SELECTED_COLOR,
      JUNCTION_STROKE,
    ] as ExpressionSpecification,
    "circle-stroke-width": 1,
    "circle-opacity": 0.9,
  };
  return [
    {
      id: LAYER_IDS.intersections,
      type: "circle",
      source: SOURCE_IDS.intersections,
      filter: isJunctionOrSignal,
      paint,
    },
    {
      id: LAYER_IDS.intersectionDetails,
      type: "circle",
      source: SOURCE_IDS.intersections,
      minzoom: 17,
      filter: isTopologyPassThrough,
      paint,
    },
  ];
}

/** A compact signal-housing marker: a dark ring with an amber center, sat
 * directly on the intersection point rather than offset (offsetting made
 * it read as an unrelated stray dot). Not a live phase indicator --
 * Traffic Engine v1 has no signal-timing simulation (see
 * docs/architecture.md). */
export function buildTrafficLightLayer(): LayerSpecification {
  return {
    id: LAYER_IDS.trafficLights,
    type: "circle",
    source: SOURCE_IDS.trafficLights,
    minzoom: 13,
    paint: {
      "circle-radius": circleRadiusExpression(7, [
        [13, 2.5],
        [17, 4],
        [20, 6],
      ]),
      "circle-color": [
        "case",
        isSelected,
        SELECTED_COLOR,
        "#f59e0b", // amber-500 -- reads as "signal", not "error" (avoids plain red)
      ] as ExpressionSpecification,
      "circle-stroke-color": "#1c1917",
      "circle-stroke-width": 1.5,
    },
  };
}

export function buildRoadLabelLayer(): LayerSpecification {
  return {
    id: LAYER_IDS.roadLabels,
    type: "symbol",
    source: SOURCE_IDS.labels,
    minzoom: 13,
    layout: {
      "text-field": ["get", "name"],
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        13,
        10,
        18,
        13,
      ] as ExpressionSpecification,
      "text-font": ["Noto Sans Regular"],
      "symbol-placement": "point",
      "text-max-width": 8,
      "text-allow-overlap": false,
      "text-optional": true,
      // Higher-hierarchy roads (lower rank number) win collision priority
      // and get placed first -- a highway's name should never lose to a
      // service road's when there isn't room for both.
      "symbol-sort-key": ["get", "label_rank"],
    },
    paint: {
      "text-color": "#292524",
      "text-halo-color": "#fffdf7",
      "text-halo-width": 1.6,
    },
  };
}
