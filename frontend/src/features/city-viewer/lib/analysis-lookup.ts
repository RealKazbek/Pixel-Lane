import type {
  Bottleneck,
  IntersectionMetric,
  LaneMetric,
  RoadMetric,
  TrafficAnalysisResult,
} from "../types/traffic-analysis";

/** Indexes a `TrafficAnalysisResult` by entity id so the renderer and
 * details panel can do O(1) lookups instead of scanning arrays per
 * road/lane/intersection on every redraw. */
export interface AnalysisLookup {
  roadMetrics: Map<string, RoadMetric>;
  laneMetrics: Map<string, LaneMetric>;
  intersectionMetrics: Map<string, IntersectionMetric>;
  bottlenecksByEntity: Map<string, Bottleneck>;
}

export function buildAnalysisLookup(
  result: TrafficAnalysisResult | null,
): AnalysisLookup {
  const lookup: AnalysisLookup = {
    roadMetrics: new Map(),
    laneMetrics: new Map(),
    intersectionMetrics: new Map(),
    bottlenecksByEntity: new Map(),
  };
  if (!result) return lookup;

  for (const metric of result.road_metrics)
    lookup.roadMetrics.set(metric.road_id, metric);
  for (const metric of result.lane_metrics)
    lookup.laneMetrics.set(metric.lane_id, metric);
  for (const metric of result.intersection_metrics) {
    lookup.intersectionMetrics.set(metric.intersection_id, metric);
  }
  for (const bottleneck of result.bottlenecks) {
    lookup.bottlenecksByEntity.set(bottleneck.entity_id, bottleneck);
  }
  return lookup;
}
