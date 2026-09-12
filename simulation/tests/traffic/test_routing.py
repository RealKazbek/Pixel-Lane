from uuid import uuid4

from pixel_lane_simulation.traffic.config import TrafficEngineConfig
from pixel_lane_simulation.traffic.graph.builder import build_network_graph
from pixel_lane_simulation.traffic.routing.router import shortest_path
from tests.traffic.factories import city, intersection, lane, linear_network, point, road


def test_direct_route() -> None:
    built_city, a_id, b_id, _ = linear_network()
    graph = build_network_graph(built_city, TrafficEngineConfig(), [])

    path = shortest_path(graph, a_id, b_id)

    assert path is not None
    assert len(path.edge_ids) == 1


def test_multi_edge_route() -> None:
    built_city, a_id, _, c_id = linear_network()
    graph = build_network_graph(built_city, TrafficEngineConfig(), [])

    path = shortest_path(graph, a_id, c_id)

    assert path is not None
    assert len(path.edge_ids) == 2
    assert path.total_length_m > 0


def test_chooses_shorter_path_by_travel_time() -> None:
    # A -> B direct (fast, high speed limit) vs A -> D -> B (longer detour).
    a_id, b_id, d_id = uuid4(), uuid4(), uuid4()

    direct = road(point(0, 0), point(1000, 0), (lane("FORWARD"),), speed_limit_kmh=100)
    leg1 = road(point(0, 0), point(0, 1000), (lane("FORWARD"),), speed_limit_kmh=30, name="leg1")
    leg2 = road(point(0, 1000), point(1000, 0), (lane("FORWARD"),), speed_limit_kmh=30, name="leg2")

    node_a = intersection(point(0, 0), (direct.id, leg1.id), a_id)
    node_b = intersection(point(1000, 0), (direct.id, leg2.id), b_id)
    node_d = intersection(point(0, 1000), (leg1.id, leg2.id), d_id)

    built_city = city((direct, leg1, leg2), (node_a, node_b, node_d))
    graph = build_network_graph(built_city, TrafficEngineConfig(), [])

    path = shortest_path(graph, a_id, b_id)

    assert path is not None
    assert len(path.edge_ids) == 1  # takes the direct fast road, not the detour


def test_unreachable_destination_returns_none() -> None:
    r = road(point(0, 0), point(100, 0), (lane("FORWARD"),))
    node_a = intersection(point(0, 0), (r.id,))
    node_b = intersection(point(100, 0), (r.id,))
    isolated = intersection(point(999, 999), ())
    built_city = city((r,), (node_a, node_b, isolated))

    graph = build_network_graph(built_city, TrafficEngineConfig(), [])

    assert shortest_path(graph, node_a.id, isolated.id) is None
