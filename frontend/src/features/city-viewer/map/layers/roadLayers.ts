import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import { LAYER_IDS, SOURCE_IDS } from "./layerIds";
import { roadWidthPixelsExpression } from "./roadWidth";
import {
  ROAD_CASING_COLOR,
  ROAD_CASING_MIN_PIXEL_WIDTH,
  ROAD_MIN_PIXEL_WIDTH,
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

/** Casing, surface, lane-marking hint, and selection-highlight layers for
 * the roads source -- see map/README.md for the full layer stack and draw
 * order. Selection is read from MapLibre feature-state (set imperatively
 * by PixelLaneMap on click), not baked into the GeoJSON, so selecting a
 * road never requires rebuilding or re-sending the whole road dataset. */
export function buildRoadLayers(
  referenceLatitudeDeg: number,
): LayerSpecification[] {
  const surfaceWidth = roadWidthPixelsExpression(
    referenceLatitudeDeg,
    "width_m",
    matchOnHierarchy(ROAD_MIN_PIXEL_WIDTH, ROAD_MIN_PIXEL_WIDTH.OTHER),
  );
  const casingMinimumWidth = matchOnHierarchy(
    ROAD_CASING_MIN_PIXEL_WIDTH,
    ROAD_CASING_MIN_PIXEL_WIDTH.OTHER,
  );
  const casingWidth = roadWidthPixelsExpression(
    referenceLatitudeDeg,
    "casing_width_m",
    casingMinimumWidth,
  );
  const selectionWidth = roadWidthPixelsExpression(
    referenceLatitudeDeg,
    "casing_width_m",
    matchOnHierarchy(
      ROAD_CASING_MIN_PIXEL_WIDTH,
      ROAD_CASING_MIN_PIXEL_WIDTH.OTHER,
    ),
    5,
  );
  const isSelected: ExpressionSpecification = [
    "boolean",
    ["feature-state", "selected"],
    false,
  ] as unknown as ExpressionSpecification;

  const casing: LayerSpecification = {
    id: LAYER_IDS.roadCasing,
    type: "line",
    source: SOURCE_IDS.roads,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": [
        "case",
        isSelected,
        SELECTED_COLOR,
        matchOnHierarchy(ROAD_CASING_COLOR, ROAD_CASING_COLOR.OTHER),
      ] as ExpressionSpecification,
      "line-width": casingWidth,
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
        isSelected,
        "#dbeafe", // blue-100 -- selected surface reads as "lit up", casing carries the accent color
        matchOnHierarchy(ROAD_SURFACE_COLOR, ROAD_SURFACE_COLOR.OTHER),
      ] as ExpressionSpecification,
      "line-width": surfaceWidth,
    },
  };

  // A subtle centerline hint for multi-lane roads, only once they're
  // rendered wide enough on screen to plausibly show one -- tied to the
  // actual on-screen surface width rather than a fixed zoom, so it never
  // shows up on a road too narrow to read as "multi-lane" (avoids the old
  // striped/checkerboard look at ordinary zoom levels).
  const laneMarkings: LayerSpecification = {
    id: LAYER_IDS.laneMarkings,
    type: "line",
    source: SOURCE_IDS.roads,
    minzoom: 16,
    filter: [">", ["get", "lane_count"], 1],
    layout: { "line-cap": "butt", "line-join": "round" },
    paint: {
      "line-color": "#fafaf9",
      "line-opacity": 0.85,
      "line-width": 1,
      "line-dasharray": [3, 3],
    },
  };

  const selection: LayerSpecification = {
    id: LAYER_IDS.selection,
    type: "line",
    source: SOURCE_IDS.roads,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": SELECTED_COLOR,
      "line-width": selectionWidth,
      // MapLibre permits feature-state in paint expressions, but not in a
      // layer filter. Keeping unselected features transparent preserves the
      // same visual result without invalidating the entire layer.
      "line-opacity": ["case", isSelected, 0.25, 0] as ExpressionSpecification,
    },
  };

  return [casing, surface, laneMarkings, selection];
}
