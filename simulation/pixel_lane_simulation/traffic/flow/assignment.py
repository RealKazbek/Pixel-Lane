"""Static traffic assignment: route each demand once, load its full volume
onto every edge along that route.

This is a static, all-or-nothing assignment -- one demand, one shortest
path, no splitting across multiple routes, no iteration towards
equilibrium, no per-vehicle/timestep simulation. That is a deliberate v1
scope limit (see docs/architecture.md).
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field

from pixel_lane_simulation.traffic.graph.graph import NetworkGraph
from pixel_lane_simulation.traffic.models.inputs import TrafficDemandInput
from pixel_lane_simulation.traffic.models.result import RouteResult
from pixel_lane_simulation.traffic.routing.router import shortest_path


@dataclass
class FlowAssignment:
    routes: list[RouteResult] = field(default_factory=list)
    edge_volumes_vph: dict[str, float] = field(default_factory=dict)
    routed_demand_count: int = 0
    unrouted_demand_count: int = 0


def assign_flows(
    graph: NetworkGraph, demands: tuple[TrafficDemandInput, ...], warnings: list[str]
) -> FlowAssignment:
    result = FlowAssignment()
    volumes: dict[str, float] = defaultdict(float)

    for demand in demands:
        if demand.destination_intersection_id is None:
            warnings.append(
                f"Traffic demand {demand.id} has no destination intersection "
                "(movement-only demand); skipped in route-based flow assignment "
                "(v1 limitation -- see docs/architecture.md)."
            )
            result.unrouted_demand_count += 1
            continue

        source = demand.source_intersection_id
        destination = demand.destination_intersection_id
        if source not in graph.nodes or destination not in graph.nodes:
            warnings.append(
                f"Traffic demand {demand.id} references an unknown intersection "
                f"({source} -> {destination}); skipped."
            )
            result.unrouted_demand_count += 1
            continue

        path = shortest_path(graph, source, destination)
        if path is None:
            warnings.append(
                f"Traffic demand {demand.id}: no route found from {source} to "
                f"{destination}; destination is unreachable in this network."
            )
            result.unrouted_demand_count += 1
            continue

        for edge_id in path.edge_ids:
            volumes[edge_id] += demand.vehicles_per_hour

        road_ids = tuple(graph.edges[edge_id].road_id for edge_id in path.edge_ids)
        result.routes.append(
            RouteResult(
                demand_id=demand.id,
                source_intersection_id=source,
                destination_intersection_id=destination,
                vehicles_per_hour=demand.vehicles_per_hour,
                road_ids=road_ids,
                total_length_m=path.total_length_m,
                total_free_flow_travel_time_s=path.total_travel_time_s,
            )
        )
        result.routed_demand_count += 1

    result.edge_volumes_vph = dict(volumes)
    return result
