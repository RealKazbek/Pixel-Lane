"""Deterministic shortest-path routing.

v1 routing strategy: Dijkstra's algorithm over free-flow travel time (not
raw distance). This picks the fastest route under uncongested conditions --
a single, understandable, deterministic strategy. It intentionally does
NOT model:
  - route choice changing with congestion (no equilibrium/rerouting),
  - multiple paths splitting one demand,
  - stochastic or learned routing.
Those are explicitly out of scope for v1 (see docs/architecture.md).
"""

from __future__ import annotations

import heapq
from dataclasses import dataclass
from uuid import UUID

from pixel_lane_simulation.traffic.graph.graph import NetworkGraph


@dataclass(frozen=True)
class PathResult:
    node_ids: tuple[UUID, ...]
    edge_ids: tuple[str, ...]
    total_length_m: float
    total_travel_time_s: float


def shortest_path(graph: NetworkGraph, source: UUID, destination: UUID) -> PathResult | None:
    """Dijkstra shortest path by free-flow travel time. Returns None if
    `destination` is unreachable from `source`."""
    if source not in graph.nodes or destination not in graph.nodes:
        return None

    best_time: dict[UUID, float] = {source: 0.0}
    came_from: dict[UUID, tuple[UUID, str]] = {}
    frontier: list[tuple[float, UUID]] = [(0.0, source)]
    visited: set[UUID] = set()

    while frontier:
        time_so_far, node_id = heapq.heappop(frontier)
        if node_id in visited:
            continue
        visited.add(node_id)

        if node_id == destination:
            return _reconstruct_path(graph, came_from, source, destination)

        for edge in graph.outgoing_edges(node_id):
            neighbor = edge.to_node
            candidate_time = time_so_far + edge.free_flow_travel_time_s
            if candidate_time < best_time.get(neighbor, float("inf")):
                best_time[neighbor] = candidate_time
                came_from[neighbor] = (node_id, edge.id)
                heapq.heappush(frontier, (candidate_time, neighbor))

    return None


def _reconstruct_path(
    graph: NetworkGraph,
    came_from: dict[UUID, tuple[UUID, str]],
    source: UUID,
    destination: UUID,
) -> PathResult:
    node_ids: list[UUID] = [destination]
    edge_ids: list[str] = []
    current = destination
    while current != source:
        previous, edge_id = came_from[current]
        edge_ids.append(edge_id)
        node_ids.append(previous)
        current = previous

    node_ids.reverse()
    edge_ids.reverse()

    total_length_m = sum(graph.edges[edge_id].length_m for edge_id in edge_ids)
    total_travel_time_s = sum(graph.edges[edge_id].free_flow_travel_time_s for edge_id in edge_ids)

    return PathResult(
        node_ids=tuple(node_ids),
        edge_ids=tuple(edge_ids),
        total_length_m=total_length_m,
        total_travel_time_s=total_travel_time_s,
    )
