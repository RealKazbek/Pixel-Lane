import { describe, expect, it } from "vitest";
import { buildAnalysisLookup } from "../analysis-lookup";
import type { TrafficAnalysisResult } from "../../types/traffic-analysis";

function makeResult(): TrafficAnalysisResult {
  return {
    network_summary: {
      node_count: 1,
      edge_count: 1,
      road_count: 1,
      lane_count: 1,
      total_demand_vph: 100,
      routed_demand_count: 1,
      unrouted_demand_count: 0,
    },
    road_metrics: [
      {
        road_id: "road-1",
        name: "Main St",
        volume_vph: 500,
        capacity_vph: 1800,
        volume_capacity_ratio: 0.28,
        utilization_percent: 28,
        congestion_level: "FREE_FLOW",
      },
    ],
    lane_metrics: [
      {
        lane_id: "lane-1",
        road_id: "road-1",
        volume_vph: 500,
        capacity_vph: 1800,
        volume_capacity_ratio: 0.28,
        utilization_percent: 28,
        congestion_level: "FREE_FLOW",
      },
    ],
    intersection_metrics: [],
    routes: [],
    bottlenecks: [
      {
        entity_type: "road",
        entity_id: "road-1",
        severity: "high",
        volume_capacity_ratio: 1.5,
      },
    ],
    warnings: [],
  };
}

describe("buildAnalysisLookup", () => {
  it("maps each road metric to its road id", () => {
    const lookup = buildAnalysisLookup(makeResult());
    expect(lookup.roadMetrics.get("road-1")?.congestion_level).toBe(
      "FREE_FLOW",
    );
  });

  it("maps each lane metric to its lane id", () => {
    const lookup = buildAnalysisLookup(makeResult());
    expect(lookup.laneMetrics.get("lane-1")?.volume_vph).toBe(500);
  });

  it("indexes bottlenecks by entity id", () => {
    const lookup = buildAnalysisLookup(makeResult());
    expect(lookup.bottlenecksByEntity.get("road-1")?.severity).toBe("high");
  });

  it("returns empty maps when there is no result yet", () => {
    const lookup = buildAnalysisLookup(null);
    expect(lookup.roadMetrics.size).toBe(0);
    expect(lookup.laneMetrics.size).toBe(0);
    expect(lookup.intersectionMetrics.size).toBe(0);
  });

  it("returns undefined for a road with no metric (analysis run before it existed)", () => {
    const lookup = buildAnalysisLookup(makeResult());
    expect(lookup.roadMetrics.get("unknown-road")).toBeUndefined();
  });
});
