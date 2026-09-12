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
  LAYER_IDS.trafficLights,
  LAYER_IDS.roadLabels,
];
