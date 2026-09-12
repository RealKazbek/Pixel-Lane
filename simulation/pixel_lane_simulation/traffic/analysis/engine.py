"""Traffic Engine v1 public entry point.

    result = analyze_city(city_input)

or, to reuse a non-default configuration across many calls:

    engine = TrafficEngine(config)
    result = engine.analyze(city_input)

Pipeline (see docs/architecture.md for the full picture):
    City Model -> Network Graph -> Capacity -> Demand Assignment
    -> Flow Estimation -> Congestion Metrics -> Bottleneck Detection
"""

from dataclasses import dataclass, field

from pixel_lane_simulation.traffic.analysis.bottlenecks import detect_bottlenecks
from pixel_lane_simulation.traffic.config import TrafficEngineConfig
from pixel_lane_simulation.traffic.flow.assignment import assign_flows
from pixel_lane_simulation.traffic.graph.builder import build_network_graph
from pixel_lane_simulation.traffic.metrics.entity_metrics import (
    compute_intersection_metrics,
    compute_lane_metrics,
    compute_road_metrics,
)
from pixel_lane_simulation.traffic.models.inputs import CityInput
from pixel_lane_simulation.traffic.models.result import NetworkSummary, TrafficAnalysisResult


@dataclass(frozen=True)
class TrafficEngine:
    config: TrafficEngineConfig = field(default_factory=TrafficEngineConfig)

    def analyze(self, city: CityInput) -> TrafficAnalysisResult:
        warnings: list[str] = []
        graph = build_network_graph(city, self.config, warnings)

        if not graph.nodes:
            warnings.append("City has no intersections; nothing to analyze.")
            return TrafficAnalysisResult(
                network_summary=NetworkSummary(
                    node_count=0,
                    edge_count=0,
                    road_count=len(city.roads),
                    lane_count=sum(len(road.lanes) for road in city.roads),
                    total_demand_vph=sum(d.vehicles_per_hour for d in city.traffic_demands),
                    routed_demand_count=0,
                    unrouted_demand_count=len(city.traffic_demands),
                ),
                warnings=tuple(warnings),
            )

        assignment = assign_flows(graph, city.traffic_demands, warnings)

        road_metrics = compute_road_metrics(
            graph, city.roads, assignment.edge_volumes_vph, self.config
        )
        lane_metrics = compute_lane_metrics(graph, assignment.edge_volumes_vph, self.config)
        intersection_metrics = compute_intersection_metrics(
            graph, assignment.edge_volumes_vph, self.config
        )
        bottlenecks = detect_bottlenecks(road_metrics, lane_metrics, intersection_metrics)

        network_summary = NetworkSummary(
            node_count=len(graph.nodes),
            edge_count=len(graph.edges),
            road_count=len(city.roads),
            lane_count=sum(len(road.lanes) for road in city.roads),
            total_demand_vph=sum(d.vehicles_per_hour for d in city.traffic_demands),
            routed_demand_count=assignment.routed_demand_count,
            unrouted_demand_count=assignment.unrouted_demand_count,
        )

        return TrafficAnalysisResult(
            network_summary=network_summary,
            road_metrics=tuple(road_metrics),
            lane_metrics=tuple(lane_metrics),
            intersection_metrics=tuple(intersection_metrics),
            routes=tuple(assignment.routes),
            bottlenecks=tuple(bottlenecks),
            warnings=tuple(warnings),
        )


def analyze_city(
    city: CityInput, config: TrafficEngineConfig | None = None
) -> TrafficAnalysisResult:
    return TrafficEngine(config or TrafficEngineConfig()).analyze(city)
