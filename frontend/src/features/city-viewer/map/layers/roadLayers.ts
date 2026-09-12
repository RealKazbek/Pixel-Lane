import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import { LAYER_IDS, SOURCE_IDS } from "./layerIds";
import { roadWidthPixelsExpression } from "./roadWidth";
import {
  ROAD_CASING_COLOR,
  ROAD_SURFACE_COLOR,
  SELECTED_COLOR,
} from "../styles/roadStyle";

function colorMatchExpression(
  colors: Record<string, string>,
  fallback: string,
): ExpressionSpecification {
  const entries = Object.entries(colors).flatMap(([hierarchy, color]) => [
    hierarchy,
    color,
  ]);
  return [
    "match",
    ["get", "hierarchy"],
    ...entries,
    fallback,
  ] as unknown as ExpressionSpecification;
}

/** Casing, surface, lane-marking hint, and selection-halo layers for the
 * roads source -- see map/README.md for the full layer stack and draw
 * order. */
export function buildRoadLayers(
  referenceLatitudeDeg: number,
): LayerSpecification[] {
  const widthExpression = roadWidthPixelsExpression(referenceLatitudeDeg);
  const casingWidthExpression: ExpressionSpecification = [
    "+",
    widthExpression,
    2,
  ];
  const haloWidthExpression: ExpressionSpecification = [
    "+",
    widthExpression,
    6,
  ];

  const casing: LayerSpecification = {
    id: LAYER_IDS.roadCasing,
    type: "line",
    source: SOURCE_IDS.roads,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": colorMatchExpression(
        ROAD_CASING_COLOR,
        ROAD_CASING_COLOR.OTHER,
      ),
      "line-width": casingWidthExpression,
    },
  };

  const surface: LayerSpecification = {
    id: LAYER_IDS.roadSurface,
    type: "line",
    source: SOURCE_IDS.roads,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": [
        "case",
        ["boolean", ["get", "selected"], false],
        SELECTED_COLOR,
        colorMatchExpression(ROAD_SURFACE_COLOR, ROAD_SURFACE_COLOR.OTHER),
      ] as ExpressionSpecification,
      "line-width": widthExpression,
    },
  };

  // A light dashed centerline, shown only close in and only for
  // multi-lane roads -- a hint of lane structure, not a precise
  // per-lane rendering (see map/README.md's scope notes).
  const laneMarkings: LayerSpecification = {
    id: LAYER_IDS.laneMarkings,
    type: "line",
    source: SOURCE_IDS.roads,
    minzoom: 17,
    filter: [">", ["get", "lane_count"], 1] as ExpressionSpecification,
    layout: { "line-cap": "butt" },
    paint: {
      "line-color": "#ffffff",
      "line-opacity": 0.6,
      "line-width": 1.5,
      "line-dasharray": [2, 3],
    },
  };

  const selection: LayerSpecification = {
    id: LAYER_IDS.selection,
    type: "line",
    source: SOURCE_IDS.roads,
    filter: ["==", ["get", "selected"], true] as ExpressionSpecification,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": SELECTED_COLOR,
      "line-width": haloWidthExpression,
      "line-opacity": 0.25,
    },
  };

  return [casing, surface, laneMarkings, selection];
}
