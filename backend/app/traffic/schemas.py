"""API response schemas for traffic analysis.

Separate from the Traffic Engine's own result dataclasses
(`pixel_lane_simulation.traffic.models.result`) on purpose -- the engine
stays Pydantic/FastAPI-free; this module is the serialization layer.
"""

from uuid import UUID

from pydantic import BaseModel


class NetworkSummaryResponse(BaseModel):
    node_count: int
    edge_count: int
    road_count: int
    lane_count: int
    total_demand_vph: float
    routed_demand_count: int
    unrouted_demand_count: int


class RoadMetricResponse(BaseModel):
    road_id: UUID
    name: str
    volume_vph: float
    capacity_vph: float
    volume_capacity_ratio: float
    utilization_percent: float
    congestion_level: str


class LaneMetricResponse(BaseModel):
    lane_id: UUID
    road_id: UUID
    volume_vph: float
    capacity_vph: float
    volume_capacity_ratio: float
    utilization_percent: float
    congestion_level: str


class IntersectionMetricResponse(BaseModel):
    intersection_id: UUID
    inbound_volume_vph: float
    inbound_capacity_vph: float
    volume_capacity_ratio: float
    utilization_percent: float
    congestion_level: str


class RouteResponse(BaseModel):
    demand_id: UUID
    source_intersection_id: UUID
    destination_intersection_id: UUID
    vehicles_per_hour: float
    road_ids: list[UUID]
    total_length_m: float
    total_free_flow_travel_time_s: float


class BottleneckResponse(BaseModel):
    entity_type: str
    entity_id: UUID
    severity: str
    volume_capacity_ratio: float


class TrafficAnalysisResponse(BaseModel):
    network_summary: NetworkSummaryResponse
    road_metrics: list[RoadMetricResponse]
    lane_metrics: list[LaneMetricResponse]
    intersection_metrics: list[IntersectionMetricResponse]
    routes: list[RouteResponse]
    bottlenecks: list[BottleneckResponse]
    warnings: list[str]
