/**
 * Mirrors `backend/app/traffic/schemas.py` (`TrafficAnalysisResponse`).
 */

export type CongestionLevel = "FREE_FLOW" | "MODERATE" | "HEAVY" | "SATURATED";

export interface NetworkSummary {
  node_count: number;
  edge_count: number;
  road_count: number;
  lane_count: number;
  total_demand_vph: number;
  routed_demand_count: number;
  unrouted_demand_count: number;
}

export interface RoadMetric {
  road_id: string;
  name: string;
  volume_vph: number;
  capacity_vph: number;
  volume_capacity_ratio: number;
  utilization_percent: number;
  congestion_level: CongestionLevel;
}

export interface LaneMetric {
  lane_id: string;
  road_id: string;
  volume_vph: number;
  capacity_vph: number;
  volume_capacity_ratio: number;
  utilization_percent: number;
  congestion_level: CongestionLevel;
}

export interface IntersectionMetric {
  intersection_id: string;
  inbound_volume_vph: number;
  inbound_capacity_vph: number;
  volume_capacity_ratio: number;
  utilization_percent: number;
  congestion_level: CongestionLevel;
}

export interface RouteResult {
  demand_id: string;
  source_intersection_id: string;
  destination_intersection_id: string;
  vehicles_per_hour: number;
  road_ids: string[];
  total_length_m: number;
  total_free_flow_travel_time_s: number;
}

export type BottleneckEntityType = "road" | "lane" | "intersection";
export type BottleneckSeverity = "medium" | "high";

export interface Bottleneck {
  entity_type: BottleneckEntityType;
  entity_id: string;
  severity: BottleneckSeverity;
  volume_capacity_ratio: number;
}

export interface TrafficAnalysisResult {
  network_summary: NetworkSummary;
  road_metrics: RoadMetric[];
  lane_metrics: LaneMetric[];
  intersection_metrics: IntersectionMetric[];
  routes: RouteResult[];
  bottlenecks: Bottleneck[];
  warnings: string[];
}
