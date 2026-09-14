/** Central registry of Pixel Lane's MapLibre source/layer ids -- one
 * place to see the whole stack (see map/README.md for the draw order). */

export const SOURCE_IDS = {
  roads: "pixel-lane-roads",
  intersections: "pixel-lane-intersections",
  trafficLights: "pixel-lane-traffic-lights",
  labels: "pixel-lane-labels",
  laneSurfaces: "pixel-lane-lane-surfaces",
  laneBoundaries: "pixel-lane-lane-boundaries",
  turnArrows: "pixel-lane-turn-arrows",
  laneUseMarkings: "pixel-lane-lane-use-markings",
  roadSurfaces: "pixel-lane-road-surfaces",
} as const;

export const LAYER_IDS = {
  roadCasing: "pixel-lane-road-casing",
  roadSurface: "pixel-lane-road-surface",
  roadSurfaceFill: "pixel-lane-road-surface-fill",
  roadSurfaceEdge: "pixel-lane-road-surface-edge",
  laneMarkings: "pixel-lane-lane-markings",
  selection: "pixel-lane-selection",
  intersections: "pixel-lane-intersections",
  intersectionDetails: "pixel-lane-intersection-details",
  trafficLights: "pixel-lane-traffic-lights",
  roadLabels: "pixel-lane-road-labels",
  laneBusSurface: "pixel-lane-lane-bus-surface",
  laneBusLabel: "pixel-lane-lane-bus-label",
  laneBoundaryEdge: "pixel-lane-lane-boundary-edge",
  laneBoundarySeparator: "pixel-lane-lane-boundary-separator",
  turnArrows: "pixel-lane-turn-arrows",
  laneParkingLine: "pixel-lane-lane-parking-line",
  laneParkingLabel: "pixel-lane-lane-parking-label",
  laneCyclewayLine: "pixel-lane-lane-cycleway-line",
} as const;

/** Draw order, back to front (basemap sits below all of these; Terra
 * Draw's own editor layers are added by its adapter and render above).
 * The close-zoom lane-detail layers draw above the base road
 * casing/surface but below selection/points, so a selected road/
 * intersection still reads clearly through the extra detail. */
export const LAYER_DRAW_ORDER: readonly string[] = [
  LAYER_IDS.roadCasing,
  LAYER_IDS.roadSurface,
  LAYER_IDS.roadSurfaceFill,
  LAYER_IDS.roadSurfaceEdge,
  LAYER_IDS.laneMarkings,
  LAYER_IDS.laneBusSurface,
  LAYER_IDS.laneParkingLine,
  LAYER_IDS.laneParkingLabel,
  LAYER_IDS.laneCyclewayLine,
  LAYER_IDS.laneBoundaryEdge,
  LAYER_IDS.laneBoundarySeparator,
  LAYER_IDS.laneBusLabel,
  LAYER_IDS.turnArrows,
  LAYER_IDS.selection,
  LAYER_IDS.intersections,
  LAYER_IDS.intersectionDetails,
  LAYER_IDS.trafficLights,
  LAYER_IDS.roadLabels,
];

/** Groups the layer stack into the user-facing toggles exposed by
 * `MapLayersPanel` -- one entry per independently-hideable entity type
 * (see setupLayers.ts's `setLayerGroupVisibility`). Selection/casing stay
 * with "roads" since they only ever render alongside road geometry. */
export const LAYER_GROUPS = {
  roads: [
    LAYER_IDS.roadCasing,
    LAYER_IDS.roadSurface,
    LAYER_IDS.roadSurfaceFill,
    LAYER_IDS.roadSurfaceEdge,
    LAYER_IDS.laneMarkings,
    LAYER_IDS.laneBusSurface,
    LAYER_IDS.laneBusLabel,
    LAYER_IDS.laneParkingLine,
    LAYER_IDS.laneParkingLabel,
    LAYER_IDS.laneCyclewayLine,
    LAYER_IDS.laneBoundaryEdge,
    LAYER_IDS.laneBoundarySeparator,
    LAYER_IDS.turnArrows,
    LAYER_IDS.selection,
    LAYER_IDS.roadLabels,
  ],
  intersections: [LAYER_IDS.intersections, LAYER_IDS.intersectionDetails],
  trafficLights: [LAYER_IDS.trafficLights],
} as const;

export type LayerGroupId = keyof typeof LAYER_GROUPS;
