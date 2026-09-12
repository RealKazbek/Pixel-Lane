"""The Traffic Engine's analysis result contract.

Plain dataclasses -- no Pydantic/FastAPI dependency. A separate
serialization layer (the backend adapter) is responsible for turning this
into an API response.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID


@dataclass(frozen=True)
class NetworkSummary:
    node_count: int
    edge_count: int
    road_count: int
    lane_count: int
    total_demand_vph: float
    routed_demand_count: int
    unrouted_demand_count: int


@dataclass(frozen=True)
class RoadMetric:
    road_id: UUID
    name: str
    volume_vph: float
    capacity_vph: float
    volume_capacity_ratio: float
    utilization_percent: float
    congestion_level: str


@dataclass(frozen=True)
class LaneMetric:
    lane_id: UUID
    road_id: UUID
    volume_vph: float
    capacity_vph: float
    volume_capacity_ratio: float
    utilization_percent: float
    congestion_level: str


@dataclass(frozen=True)
class IntersectionMetric:
    intersection_id: UUID
    inbound_volume_vph: float
    inbound_capacity_vph: float
    volume_capacity_ratio: float
    utilization_percent: float
    congestion_level: str


@dataclass(frozen=True)
class RouteResult:
    demand_id: UUID
    source_intersection_id: UUID
    destination_intersection_id: UUID
    vehicles_per_hour: float
    road_ids: tuple[UUID, ...]
    total_length_m: float
    total_free_flow_travel_time_s: float


@dataclass(frozen=True)
class Bottleneck:
    """A baseline threshold-heuristic finding -- not a validated
    traffic-engineering bottleneck model."""

    entity_type: str  # "road" | "lane" | "intersection"
    entity_id: UUID
    severity: str  # "medium" | "high"
    volume_capacity_ratio: float


@dataclass(frozen=True)
class TrafficAnalysisResult:
    network_summary: NetworkSummary
    road_metrics: tuple[RoadMetric, ...] = field(default_factory=tuple)
    lane_metrics: tuple[LaneMetric, ...] = field(default_factory=tuple)
    intersection_metrics: tuple[IntersectionMetric, ...] = field(default_factory=tuple)
    routes: tuple[RouteResult, ...] = field(default_factory=tuple)
    bottlenecks: tuple[Bottleneck, ...] = field(default_factory=tuple)
    warnings: tuple[str, ...] = field(default_factory=tuple)
