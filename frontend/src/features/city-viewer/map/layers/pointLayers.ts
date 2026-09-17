import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import { LAYER_IDS, SOURCE_IDS } from "./layerIds";
import type { MapThemeColors } from "../styles/mapTheme";

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

export function buildIntersectionLayers(
  theme: MapThemeColors,
): LayerSpecification[] {
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
      theme.selected,
      theme.intersectionFill,
    ] as ExpressionSpecification,
    "circle-stroke-color": [
      "case",
      isSelected,
      theme.selected,
      theme.intersectionStroke,
    ] as ExpressionSpecification,
    "circle-stroke-width": 1,
    "circle-opacity": 0.9,
  };
  return [
    {
      id: LAYER_IDS.intersections,
      minzoom: 15,
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
export function buildTrafficLightLayer(
  theme: MapThemeColors,
): LayerSpecification {
  return {
    id: LAYER_IDS.trafficLights,
    type: "circle",
    source: SOURCE_IDS.trafficLights,
    minzoom: 15,
    paint: {
      "circle-radius": circleRadiusExpression(7, [
        [13, 2.5],
        [17, 4],
        [20, 6],
      ]),
      "circle-color": [
        "case",
        isSelected,
        theme.selected,
        theme.trafficLight,
      ] as ExpressionSpecification,
      "circle-stroke-color": theme.trafficLightStroke,
      "circle-stroke-width": 1.5,
    },
  };
}

export function buildRoadLabelLayer(theme: MapThemeColors): LayerSpecification {
  return {
    id: LAYER_IDS.roadLabels,
    type: "symbol",
    source: SOURCE_IDS.labels,
    minzoom: 13,
    filter: ["any", [">=", ["zoom"], 16], ["<=", ["get", "label_rank"], 2]],
    layout: {
      "text-field": ["get", "name"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 13, 14, 24, 16],
      "text-font": ["Noto Sans Regular"],
      "symbol-placement": "point",
      "text-rotate": ["get", "rotation"],
      "text-rotation-alignment": "map",
      "text-max-width": 100,
      // These isolated editor labels are part of the primitive's inspection
      // surface. Their size expression guarantees they stay inside the road;
      // collision avoidance must not make the validation labels disappear.
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-optional": false,
      // Higher-hierarchy roads (lower rank number) win collision priority
      // and get placed first -- a highway's name should never lose to a
      // service road's when there isn't room for both.
      "symbol-sort-key": ["get", "label_rank"],
    },
    paint: {
      "text-color": theme.roadLabel,
      "text-halo-color": theme.roadLabelHalo,
      "text-halo-width": 2.2,
      "text-opacity": 1,
    },
  };
}
