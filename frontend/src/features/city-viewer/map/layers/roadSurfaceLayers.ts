/**
 * Real metric road-surface fill + edge layers, sourced from
 * `adapters/roadSurfaceGeometry.ts`'s buffered/junction-merged polygons
 * -- see that file's docstring for why this replaces per-road
 * `line-width` strokes at close zoom (SURFACE_DETAIL_MIN_ZOOM+).
 *
 * A `fill` layer draws the true-to-scale polygon (no pixel-width
 * expression needed -- the geometry already encodes the real width in
 * meters, at the map's real projected scale). A `line` layer on the same
 * polygon source renders its boundary as a thin edge stroke -- MapLibre
 * happily draws a `line` layer from Polygon/MultiPolygon geometry as the
 * ring outline, so junction-merged polygons get one continuous edge with
 * no internal seams, instead of each road's separate casing.
 */

import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import { LAYER_IDS, SOURCE_IDS } from "./layerIds";
import { SURFACE_DETAIL_MIN_ZOOM } from "./zoomThresholds";
import {
  ROAD_CASING_COLOR,
  ROAD_SURFACE_COLOR,
  SELECTED_COLOR,
} from "../styles/roadStyle";

function matchOnHierarchy<T extends string | number>(
  values: Record<string, T>,
  fallback: T,
): ExpressionSpecification {
  const entries = Object.entries(values).flatMap(([hierarchy, value]) => [
    hierarchy,
    value,
  ]);
  return [
    "match",
    ["get", "hierarchy"],
    ...entries,
    fallback,
  ] as unknown as ExpressionSpecification;
}

export function buildRoadSurfaceLayers(): LayerSpecification[] {
  const isSelected: ExpressionSpecification = [
    "boolean",
    ["feature-state", "selected"],
    false,
  ] as unknown as ExpressionSpecification;

  const fill: LayerSpecification = {
    id: LAYER_IDS.roadSurfaceFill,
    type: "fill",
    source: SOURCE_IDS.roadSurfaces,
    minzoom: SURFACE_DETAIL_MIN_ZOOM,
    paint: {
      "fill-color": [
        "case",
        isSelected,
        "#dbeafe", // blue-100, matches the old line-based selection surface tint
        matchOnHierarchy(ROAD_SURFACE_COLOR, ROAD_SURFACE_COLOR.OTHER),
      ] as ExpressionSpecification,
    },
  };

  const edge: LayerSpecification = {
    id: LAYER_IDS.roadSurfaceEdge,
    type: "line",
    source: SOURCE_IDS.roadSurfaces,
    minzoom: SURFACE_DETAIL_MIN_ZOOM,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": [
        "case",
        isSelected,
        SELECTED_COLOR,
        matchOnHierarchy(ROAD_CASING_COLOR, ROAD_CASING_COLOR.OTHER),
      ] as ExpressionSpecification,
      "line-width": 1.5,
    },
  };

  return [fill, edge];
}
