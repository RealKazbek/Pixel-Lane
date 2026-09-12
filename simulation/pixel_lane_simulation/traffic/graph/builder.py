"""Builds a NetworkGraph from a CityInput.

The City Model does not store "which end of this road touches which
intersection" explicitly -- only `Intersection.connected_road_ids` (this
road touches that intersection) and each road's ordered polyline. So for
every road, this module resolves its two endpoint intersections by
matching polyline endpoints to intersection positions by distance.

For LOCAL_CARTESIAN cities, coordinate units are assumed to be meters (the
City Model does not carry a unit; this is a documented v1 simplification).
"""

from uuid import UUID

from pixel_lane_simulation.traffic.capacity.capacity import edge_capacity_vph
from pixel_lane_simulation.traffic.config import TrafficEngineConfig
from pixel_lane_simulation.traffic.errors import InvalidNetworkTopologyError, UnknownReferenceError
from pixel_lane_simulation.traffic.graph.geometry import distance, polyline_length
from pixel_lane_simulation.traffic.graph.graph import Edge, NetworkGraph, Node
from pixel_lane_simulation.traffic.models.inputs import CityInput, CoordinateSystem, RoadInput

_KMH_TO_MS = 1000.0 / 3600.0


def build_network_graph(
    city: CityInput, config: TrafficEngineConfig, warnings: list[str]
) -> NetworkGraph:
    graph = NetworkGraph()
    for intersection in city.intersections:
        graph.add_node(Node(id=intersection.id, position=intersection.position))

    road_ids = {road.id for road in city.roads}
    connections_by_road: dict[UUID, list[UUID]] = {}
    for intersection in city.intersections:
        for road_id in intersection.connected_road_ids:
            if road_id not in road_ids:
                raise UnknownReferenceError(
                    f"Intersection {intersection.id} references unknown road {road_id}"
                )
            connections_by_road.setdefault(road_id, []).append(intersection.id)

    for road in city.roads:
        endpoints = connections_by_road.get(road.id, [])
        if len(endpoints) == 0:
            warnings.append(
                f"Road {road.id} ('{road.name}') is not connected to any intersection; skipped."
            )
            continue
        if len(endpoints) == 1:
            warnings.append(
                f"Road {road.id} ('{road.name}') only touches one intersection "
                "(dead end); no through edge was created."
            )
            continue
        if len(endpoints) > 2:
            raise InvalidNetworkTopologyError(
                f"Road {road.id} ('{road.name}') is listed as connected by "
                f"{len(endpoints)} intersections; a road can only have two endpoints."
            )

        start_node, end_node = _resolve_endpoints(road, endpoints, city, graph)
        _add_road_edges(graph, road, start_node, end_node, city.coordinate_system, config)

    return graph


def _resolve_endpoints(
    road: RoadInput, candidate_ids: list[UUID], city: CityInput, graph: NetworkGraph
) -> tuple[UUID, UUID]:
    """Decide which candidate intersection is the polyline's start vs end,
    by whichever pairing minimizes total mismatch distance."""
    start_point = road.geometry_points[0]
    end_point = road.geometry_points[-1]
    a, b = candidate_ids[0], candidate_ids[1]
    a_pos = graph.nodes[a].position
    b_pos = graph.nodes[b].position

    cs = city.coordinate_system
    cost_a_start = distance(a_pos, start_point, cs) + distance(b_pos, end_point, cs)
    cost_b_start = distance(b_pos, start_point, cs) + distance(a_pos, end_point, cs)

    return (a, b) if cost_a_start <= cost_b_start else (b, a)


def _add_road_edges(
    graph: NetworkGraph,
    road: RoadInput,
    start_node: UUID,
    end_node: UUID,
    coordinate_system: CoordinateSystem,
    config: TrafficEngineConfig,
) -> None:
    length_m = polyline_length(road.geometry_points, coordinate_system)
    free_flow_speed_kmh = (
        road.default_speed_limit_kmh
        if road.default_speed_limit_kmh > 0
        else config.default_free_flow_speed_kmh
    )
    travel_time_s = (
        length_m / (free_flow_speed_kmh * _KMH_TO_MS) if free_flow_speed_kmh > 0 else 0.0
    )

    forward_lanes = tuple(lane.id for lane in road.lanes if lane.direction == "FORWARD")
    backward_lanes = tuple(lane.id for lane in road.lanes if lane.direction == "BACKWARD")

    if forward_lanes:
        graph.add_edge(
            Edge(
                id=f"{road.id}:forward",
                road_id=road.id,
                from_node=start_node,
                to_node=end_node,
                lane_ids=forward_lanes,
                length_m=length_m,
                free_flow_travel_time_s=travel_time_s,
                capacity_vph=edge_capacity_vph(len(forward_lanes), config),
            )
        )
    if backward_lanes:
        graph.add_edge(
            Edge(
                id=f"{road.id}:backward",
                road_id=road.id,
                from_node=end_node,
                to_node=start_node,
                lane_ids=backward_lanes,
                length_m=length_m,
                free_flow_travel_time_s=travel_time_s,
                capacity_vph=edge_capacity_vph(len(backward_lanes), config),
            )
        )
