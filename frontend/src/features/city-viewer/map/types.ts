export type MapMode = "view" | "edit-geometry";

export interface MapSelection {
  type: "road" | "intersection";
  id: string;
}

/** Per-entity-type layer toggles shown in `MapLayersPanel` (see
 * `map/layers/layerIds.ts`'s `LAYER_GROUPS`). */
export interface LayerVisibility {
  roads: boolean;
  intersections: boolean;
  trafficLights: boolean;
  amenities: boolean;
  laneConnectivity: boolean;
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  roads: true,
  intersections: true,
  trafficLights: true,
  amenities: true,
  laneConnectivity: false,
};
