/** Central registry of Pixel Lane's MapLibre source/layer ids -- one
 * place to see the whole stack (see map/README.md for the draw order). */

export const SOURCE_IDS = {
  roads: "pixel-lane-roads",
  intersections: "pixel-lane-intersections",
  trafficLights: "pixel-lane-traffic-lights",
  labels: "pixel-lane-labels",
} as const;

export const LAYER_IDS = {
  roadCasing: "pixel-lane-road-casing",
  roadSurface: "pixel-lane-road-surface",
  laneMarkings: "pixel-lane-lane-markings",
  selection: "pixel-lane-selection",
  intersections: "pixel-lane-intersections",
  intersectionDetails: "pixel-lane-intersection-details",
  trafficLights: "pixel-lane-traffic-lights",
  roadLabels: "pixel-lane-road-labels",
} as const;

/** Draw order, back to front (basemap sits below all of these; Terra
 * Draw's own editor layers are added by its adapter and render above). */
export const LAYER_DRAW_ORDER: readonly string[] = [
  LAYER_IDS.roadCasing,
  LAYER_IDS.roadSurface,
  LAYER_IDS.laneMarkings,
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
    LAYER_IDS.laneMarkings,
    LAYER_IDS.selection,
    LAYER_IDS.roadLabels,
  ],
  intersections: [LAYER_IDS.intersections, LAYER_IDS.intersectionDetails],
  trafficLights: [LAYER_IDS.trafficLights],
} as const;

export type LayerGroupId = keyof typeof LAYER_GROUPS;
