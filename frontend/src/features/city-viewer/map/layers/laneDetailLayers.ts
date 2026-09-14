/**
 * Close-zoom lane-detail layers (Road + Lane Representation V1): lane
 * separators, bus-lane surface/label, parking/cycleway schematic
 * markings, and turn arrows -- everything driven by
 * `adapters/laneGeometry.ts`'s derived GeoJSON, never by re-deriving
 * geometry in a paint expression (see map/README.md's performance notes).
 *
 * `line-dasharray` cannot be data-driven in MapLibre (zoom-only), so
 * parking (dashed) and cycleway (solid) each get their own layer instead
 * of one layer switching style via a `case` expression -- see
 * roadLayers.ts's `laneMarkings` comment for the same constraint.
 */

import type { LayerSpecification } from "maplibre-gl";
import { LAYER_IDS, SOURCE_IDS } from "./layerIds";
import { LANE_DETAIL_MIN_ZOOM, LANE_LABEL_MIN_ZOOM } from "./zoomThresholds";

const BUS_LANE_COLOR = "#c2410c"; // orange-700 -- reads as "bus lane" without copying any specific real-world scheme
const PARKING_MARKING_COLOR = "#78716c"; // stone-500
const CYCLEWAY_COLOR = "#16a34a"; // green-600 -- conventional "bike" association, not copied styling
const SEPARATOR_COLOR = "#fafaf9"; // near-white, like a painted lane line
const EDGE_COLOR = "#1c1917"; // stone-900, matches ROAD_CASING_COLOR.HIGHWAY

export function buildLaneDetailLayers(): LayerSpecification[] {
  const laneBusSurface: LayerSpecification = {
    id: LAYER_IDS.laneBusSurface,
    type: "line",
    source: SOURCE_IDS.laneSurfaces,
    minzoom: LANE_DETAIL_MIN_ZOOM,
    filter: ["==", ["get", "is_bus"], true],
    layout: { "line-cap": "butt", "line-join": "round" },
    paint: {
      "line-color": BUS_LANE_COLOR,
      "line-opacity": 0.4,
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        LANE_DETAIL_MIN_ZOOM,
        4,
        20,
        16,
      ],
    },
  };

  const laneBusLabel: LayerSpecification = {
    id: LAYER_IDS.laneBusLabel,
    type: "symbol",
    source: SOURCE_IDS.laneSurfaces,
    minzoom: LANE_LABEL_MIN_ZOOM,
    filter: ["==", ["get", "is_bus"], true],
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 80,
      "text-field": "A",
      "text-size": 12,
      "text-font": ["Noto Sans Regular"],
    },
    paint: {
      "text-color": "#fff7ed",
      "text-halo-color": BUS_LANE_COLOR,
      "text-halo-width": 1.5,
    },
  };

  const laneBoundaryEdge: LayerSpecification = {
    id: LAYER_IDS.laneBoundaryEdge,
    type: "line",
    source: SOURCE_IDS.laneBoundaries,
    minzoom: LANE_DETAIL_MIN_ZOOM,
    filter: ["==", ["get", "kind"], "edge"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": EDGE_COLOR, "line-width": 1.5 },
  };

  // Every internal lane boundary renders the same (dashed): Pixel Lane has
  // no OSM-backed evidence of individual lane-marking style (solid/
  // double-solid), so it never fabricates that distinction -- see
  // adapters/laneGeometry.ts's `LaneBoundaryProperties` docstring.
  const laneBoundarySeparator: LayerSpecification = {
    id: LAYER_IDS.laneBoundarySeparator,
    type: "line",
    source: SOURCE_IDS.laneBoundaries,
    minzoom: LANE_DETAIL_MIN_ZOOM,
    filter: ["==", ["get", "kind"], "separator"],
    layout: { "line-cap": "butt", "line-join": "round" },
    paint: {
      "line-color": SEPARATOR_COLOR,
      "line-width": 1,
      "line-dasharray": [2, 2],
      "line-opacity": 0.9,
    },
  };

  const turnArrows: LayerSpecification = {
    id: LAYER_IDS.turnArrows,
    type: "symbol",
    source: SOURCE_IDS.turnArrows,
    minzoom: LANE_LABEL_MIN_ZOOM,
    layout: {
      "text-field": ["get", "arrow"],
      "text-size": 14,
      "text-font": ["Noto Sans Regular"],
      "text-rotate": ["get", "bearing"],
      "text-rotation-alignment": "map",
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#fafaf9",
      "text-halo-color": "#1c1917",
      "text-halo-width": 1.2,
    },
  };

  const laneParkingLine: LayerSpecification = {
    id: LAYER_IDS.laneParkingLine,
    type: "line",
    source: SOURCE_IDS.laneUseMarkings,
    minzoom: LANE_DETAIL_MIN_ZOOM,
    filter: ["==", ["get", "kind"], "parking"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": PARKING_MARKING_COLOR,
      "line-width": 2.5,
      "line-dasharray": [3, 2],
    },
  };

  const laneParkingLabel: LayerSpecification = {
    id: LAYER_IDS.laneParkingLabel,
    type: "symbol",
    source: SOURCE_IDS.laneUseMarkings,
    minzoom: LANE_LABEL_MIN_ZOOM,
    filter: ["==", ["get", "kind"], "parking"],
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 100,
      "text-field": "P",
      "text-size": 11,
      "text-font": ["Noto Sans Regular"],
    },
    paint: {
      "text-color": "#fafaf9",
      "text-halo-color": PARKING_MARKING_COLOR,
      "text-halo-width": 1.2,
    },
  };

  const laneCyclewayLine: LayerSpecification = {
    id: LAYER_IDS.laneCyclewayLine,
    type: "line",
    source: SOURCE_IDS.laneUseMarkings,
    minzoom: LANE_DETAIL_MIN_ZOOM,
    filter: ["==", ["get", "kind"], "cycleway"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": CYCLEWAY_COLOR,
      "line-width": 2,
    },
  };

  return [
    laneBusSurface,
    laneParkingLine,
    laneParkingLabel,
    laneCyclewayLine,
    laneBoundaryEdge,
    laneBoundarySeparator,
    laneBusLabel,
    turnArrows,
  ];
}
