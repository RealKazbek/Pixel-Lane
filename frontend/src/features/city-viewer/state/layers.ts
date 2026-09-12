export interface LayerVisibility {
  roads: boolean;
  lanes: boolean;
  intersections: boolean;
  trafficLights: boolean;
  parking: boolean;
  trafficAnalysis: boolean;
}

export const DEFAULT_LAYERS: LayerVisibility = {
  roads: true,
  lanes: true,
  intersections: true,
  trafficLights: true,
  parking: true,
  trafficAnalysis: true,
};

export const LAYER_LABELS: Record<keyof LayerVisibility, string> = {
  roads: "Roads",
  lanes: "Lanes",
  intersections: "Intersections",
  trafficLights: "Traffic lights",
  parking: "Parking",
  trafficAnalysis: "Traffic analysis",
};
