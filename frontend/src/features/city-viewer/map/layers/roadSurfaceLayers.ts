/**
 * Real metric road-surface fill + edge layers, sourced from
 * `adapters/roadSurfaceGeometry.ts`'s buffered/junction-merged polygons
 * -- see that file's docstring for why this replaces per-road
 * `line-width` strokes at close zoom (SURFACE_DETAIL_MIN_ZOOM+).
 *
 * A `fill` layer draws the true-to-scale polygon. The polygon boundary is
 * intentionally not stroked: optional semantic edge markings are rendered
 * separately by the lane-boundary source.
 */

import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import { LAYER_IDS, SOURCE_IDS } from "./layerIds";
import { SURFACE_DETAIL_MIN_ZOOM } from "./zoomThresholds";
import type { MapThemeColors } from "../styles/mapTheme";

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

export function buildRoadSurfaceLayers(
  theme: MapThemeColors,
): LayerSpecification[] {
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
        theme.selectedSurface,
        matchOnHierarchy(theme.roadAsphalt, theme.roadAsphalt.OTHER),
      ] as ExpressionSpecification,
    },
  };

  return [fill];
}
