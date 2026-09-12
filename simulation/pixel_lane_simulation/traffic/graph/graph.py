"""The Traffic Engine's internal network graph.

A plain adjacency-list structure -- no NetworkX. v1's graph is small
(one self-service city), and a dict-of-lists gives O(1) node/edge lookup
and O(out-degree) neighbor iteration, which is all Dijkstra needs.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID

from pixel_lane_simulation.traffic.models.inputs import PointInput


@dataclass(frozen=True)
class Node:
    id: UUID
    position: PointInput


@dataclass(frozen=True)
class Edge:
    """A directed connection between two intersections, aggregating every
    lane on the road that travels in this direction."""

    id: str
    road_id: UUID
    from_node: UUID
    to_node: UUID
    lane_ids: tuple[UUID, ...]
    length_m: float
    free_flow_travel_time_s: float
    capacity_vph: float


@dataclass
class NetworkGraph:
    nodes: dict[UUID, Node] = field(default_factory=dict)
    edges: dict[str, Edge] = field(default_factory=dict)
    _adjacency: dict[UUID, list[str]] = field(default_factory=dict)
    _edges_by_road: dict[UUID, list[str]] = field(default_factory=dict)

    def add_node(self, node: Node) -> None:
        self.nodes[node.id] = node
        self._adjacency.setdefault(node.id, [])

    def add_edge(self, edge: Edge) -> None:
        self.edges[edge.id] = edge
        self._adjacency.setdefault(edge.from_node, []).append(edge.id)
        self._edges_by_road.setdefault(edge.road_id, []).append(edge.id)

    def outgoing_edges(self, node_id: UUID) -> list[Edge]:
        return [self.edges[edge_id] for edge_id in self._adjacency.get(node_id, [])]

    def edges_for_road(self, road_id: UUID) -> list[Edge]:
        return [self.edges[edge_id] for edge_id in self._edges_by_road.get(road_id, [])]
