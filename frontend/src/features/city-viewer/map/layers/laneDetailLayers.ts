/**
 * Close-zoom lane-detail layers (Road + Lane Representation V1): lane
 * separators, bus-lane surface/badge, parking/cycleway schematic
 * markings, and turn arrows -- everything driven by
 * `adapters/laneGeometry.ts`'s derived GeoJSON, never by re-deriving
 * geometry in a paint expression (see map/README.md's performance notes).
 *
 * `line-dasharray` cannot be data-driven in MapLibre (zoom-only), so
 * parking (dashed) and cycleway (solid) each get their own layer instead
 * of one layer switching style via a `case` expression -- see
 * roadLayers.ts's `laneMarkings` comment for the same constraint.
 *
 * Bus/parking markings are `icon-image` badges (`layers/icons.ts`), not
 * repeated plain text -- see that file's docstring for why (controlled
 * on-screen spacing + real icon collision detection, replacing a
 * cluttered "A A A A A A..." every ~80m).
 */

import type { LayerSpecification } from "maplibre-gl";
import { ICON_IDS } from "./icons";
import { LAYER_IDS, SOURCE_IDS } from "./layerIds";
import { LANE_DETAIL_MIN_ZOOM, LANE_LABEL_MIN_ZOOM } from "./zoomThresholds";
import type { MapThemeColors } from "../styles/mapTheme";

/** Screen-pixel spacing between repeated badges along a lane -- large
 * enough that a normal city block shows at most one or two, never a
 * dense repeated stencil. */
const BADGE_SYMBOL_SPACING_PX = 220;

export function buildLaneDetailLayers(theme: MapThemeColors): LayerSpecification[] {
  const BUS_LANE_COLOR = theme.busLane;
  const PARKING_MARKING_COLOR = theme.parking;
  const CYCLEWAY_COLOR = theme.cycleway;
  const SEPARATOR_COLOR = theme.laneMarking;
  const EDGE_COLOR = theme.roadCasing.HIGHWAY;
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
      "symbol-spacing": BADGE_SYMBOL_SPACING_PX,
      "icon-image": ICON_IDS.busLaneBadge,
      "icon-size": 0.6,
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": false,
      "icon-ignore-placement": false,
      "icon-padding": 4,
    },
    paint: {},
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
      "text-color": theme.laneMarking,
      "text-halo-color": theme.roadCasing.HIGHWAY,
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
      "symbol-spacing": BADGE_SYMBOL_SPACING_PX,
      "icon-image": ICON_IDS.parkingBadge,
      "icon-size": 0.55,
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": false,
      "icon-ignore-placement": false,
      "icon-padding": 4,
    },
    paint: {},
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
