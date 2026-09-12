"""Bottleneck detection.

This is a simple threshold heuristic on volume/capacity ratio -- HEAVY
congestion is reported as "medium" severity, SATURATED as "high". It is
NOT a validated traffic-engineering bottleneck model (no queueing, no
signal-timing analysis, no turning-movement conflicts).
"""

from pixel_lane_simulation.traffic.metrics.congestion import HEAVY, SATURATED
from pixel_lane_simulation.traffic.models.result import (
    Bottleneck,
    IntersectionMetric,
    LaneMetric,
    RoadMetric,
)

_SEVERITY_BY_LEVEL = {HEAVY: "medium", SATURATED: "high"}


def detect_bottlenecks(
    road_metrics: list[RoadMetric],
    lane_metrics: list[LaneMetric],
    intersection_metrics: list[IntersectionMetric],
) -> list[Bottleneck]:
    bottlenecks: list[Bottleneck] = []

    for road in road_metrics:
        if road.congestion_level in _SEVERITY_BY_LEVEL:
            bottlenecks.append(
                Bottleneck(
                    entity_type="road",
                    entity_id=road.road_id,
                    severity=_SEVERITY_BY_LEVEL[road.congestion_level],
                    volume_capacity_ratio=road.volume_capacity_ratio,
                )
            )

    for lane in lane_metrics:
        if lane.congestion_level in _SEVERITY_BY_LEVEL:
            bottlenecks.append(
                Bottleneck(
                    entity_type="lane",
                    entity_id=lane.lane_id,
                    severity=_SEVERITY_BY_LEVEL[lane.congestion_level],
                    volume_capacity_ratio=lane.volume_capacity_ratio,
                )
            )

    for intersection in intersection_metrics:
        if intersection.congestion_level in _SEVERITY_BY_LEVEL:
            bottlenecks.append(
                Bottleneck(
                    entity_type="intersection",
                    entity_id=intersection.intersection_id,
                    severity=_SEVERITY_BY_LEVEL[intersection.congestion_level],
                    volume_capacity_ratio=intersection.volume_capacity_ratio,
                )
            )

    bottlenecks.sort(key=lambda b: b.volume_capacity_ratio, reverse=True)
    return bottlenecks
