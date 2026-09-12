"""Turns raw edge volumes into per-lane/road/intersection congestion metrics.

Two documented v1 simplifications:
  - Lane-level volume splits an edge's volume evenly across the lanes that
    make it up (the engine does not model per-lane lane-choice).
  - Intersection "inbound volume" sums all inbound edge volumes as a rough
    load indicator -- it is not a real intersection-capacity model (no
    turning movements, no signal-timing analysis).
"""

from collections import defaultdict
from uuid import UUID

from pixel_lane_simulation.traffic.config import TrafficEngineConfig
from pixel_lane_simulation.traffic.graph.graph import NetworkGraph
from pixel_lane_simulation.traffic.metrics.congestion import classify, volume_capacity_ratio
from pixel_lane_simulation.traffic.models.inputs import RoadInput
from pixel_lane_simulation.traffic.models.result import (
    IntersectionMetric,
    LaneMetric,
    RoadMetric,
)


def compute_lane_metrics(
    graph: NetworkGraph, edge_volumes_vph: dict[str, float], config: TrafficEngineConfig
) -> list[LaneMetric]:
    metrics = []
    for edge in graph.edges.values():
        volume = edge_volumes_vph.get(edge.id, 0.0)
        lane_count = len(edge.lane_ids)
        if lane_count == 0:
            continue
        volume_per_lane = volume / lane_count
        capacity_per_lane = edge.capacity_vph / lane_count
        ratio = volume_capacity_ratio(volume_per_lane, capacity_per_lane)
        for lane_id in edge.lane_ids:
            metrics.append(
                LaneMetric(
                    lane_id=lane_id,
                    road_id=edge.road_id,
                    volume_vph=volume_per_lane,
                    capacity_vph=capacity_per_lane,
                    volume_capacity_ratio=ratio,
                    utilization_percent=ratio * 100,
                    congestion_level=classify(ratio, config),
                )
            )
    return metrics


def compute_road_metrics(
    graph: NetworkGraph,
    roads: tuple[RoadInput, ...],
    edge_volumes_vph: dict[str, float],
    config: TrafficEngineConfig,
) -> list[RoadMetric]:
    metrics = []
    for road in roads:
        edges = graph.edges_for_road(road.id)
        if not edges:
            continue  # not part of the routable network (see build warnings)
        volume = sum(edge_volumes_vph.get(edge.id, 0.0) for edge in edges)
        capacity = sum(edge.capacity_vph for edge in edges)
        ratio = volume_capacity_ratio(volume, capacity)
        metrics.append(
            RoadMetric(
                road_id=road.id,
                name=road.name,
                volume_vph=volume,
                capacity_vph=capacity,
                volume_capacity_ratio=ratio,
                utilization_percent=ratio * 100,
                congestion_level=classify(ratio, config),
            )
        )
    return metrics


def compute_intersection_metrics(
    graph: NetworkGraph, edge_volumes_vph: dict[str, float], config: TrafficEngineConfig
) -> list[IntersectionMetric]:
    inbound_volume: dict[UUID, float] = defaultdict(float)
    inbound_capacity: dict[UUID, float] = defaultdict(float)
    for edge in graph.edges.values():
        inbound_volume[edge.to_node] += edge_volumes_vph.get(edge.id, 0.0)
        inbound_capacity[edge.to_node] += edge.capacity_vph

    metrics = []
    for node_id in graph.nodes:
        volume = inbound_volume.get(node_id, 0.0)
        capacity = inbound_capacity.get(node_id, 0.0)
        ratio = volume_capacity_ratio(volume, capacity)
        metrics.append(
            IntersectionMetric(
                intersection_id=node_id,
                inbound_volume_vph=volume,
                inbound_capacity_vph=capacity,
                volume_capacity_ratio=ratio,
                utilization_percent=ratio * 100,
                congestion_level=classify(ratio, config),
            )
        )
    return metrics
