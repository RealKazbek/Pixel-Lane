import pytest

from pixel_lane_simulation.traffic.config import TrafficEngineConfig
from pixel_lane_simulation.traffic.errors import InvalidNetworkTopologyError, UnknownReferenceError
from pixel_lane_simulation.traffic.graph.builder import build_network_graph
from tests.traffic.factories import city, intersection, lane, linear_network, point, road


def test_build_simple_directed_graph() -> None:
    built_city, a_id, b_id, _ = linear_network()
    graph = build_network_graph(built_city, TrafficEngineConfig(), [])

    assert set(graph.nodes) == {a_id, b_id, built_city.intersections[2].id}
    # one road -> both a forward and a backward edge
    a_out = {edge.to_node for edge in graph.outgoing_edges(a_id)}
    assert a_out == {b_id}


def test_lane_direction_respected() -> None:
    road_ab = road(point(0, 0), point(100, 0), (lane("FORWARD"),), name="one-way")
    node_a = intersection(point(0, 0), (road_ab.id,))
    node_b = intersection(point(100, 0), (road_ab.id,))
    built_city = city((road_ab,), (node_a, node_b))

    graph = build_network_graph(built_city, TrafficEngineConfig(), [])

    assert [e.to_node for e in graph.outgoing_edges(node_a.id)] == [node_b.id]
    assert graph.outgoing_edges(node_b.id) == []  # no BACKWARD lane -> no return edge


def test_multiple_roads_between_same_intersections_aggregate_capacity() -> None:
    lanes = (lane("FORWARD"), lane("FORWARD", index=1))
    r = road(point(0, 0), point(500, 0), lanes)
    node_a = intersection(point(0, 0), (r.id,))
    node_b = intersection(point(500, 0), (r.id,))
    built_city = city((r,), (node_a, node_b))

    graph = build_network_graph(built_city, TrafficEngineConfig(), [])
    edges = graph.outgoing_edges(node_a.id)

    assert len(edges) == 1
    assert edges[0].capacity_vph == 2 * TrafficEngineConfig().capacity_per_lane_vph
    assert len(edges[0].lane_ids) == 2


def test_dead_end_road_produces_warning_and_no_edge() -> None:
    r = road(point(0, 0), point(100, 0), (lane("FORWARD"), lane("BACKWARD")))
    node_a = intersection(point(0, 0), (r.id,))
    built_city = city((r,), (node_a,))

    warnings: list[str] = []
    graph = build_network_graph(built_city, TrafficEngineConfig(), warnings)

    assert graph.edges == {}
    assert any("dead end" in w for w in warnings)


def test_unreachable_node_has_no_incoming_edge_from_disconnected_component() -> None:
    built_city, a_id, _, c_id = linear_network()
    graph = build_network_graph(built_city, TrafficEngineConfig(), [])
    # C only reachable via B, not directly from A
    assert c_id not in {e.to_node for e in graph.outgoing_edges(a_id)}


def test_unknown_road_reference_raises() -> None:
    import uuid

    node_a = intersection(point(0, 0), (uuid.uuid4(),))
    built_city = city((), (node_a,))

    with pytest.raises(UnknownReferenceError):
        build_network_graph(built_city, TrafficEngineConfig(), [])


def test_road_with_more_than_two_intersections_raises() -> None:
    r = road(point(0, 0), point(100, 0), (lane("FORWARD"),))
    node_a = intersection(point(0, 0), (r.id,))
    node_b = intersection(point(50, 0), (r.id,))
    node_c = intersection(point(100, 0), (r.id,))
    built_city = city((r,), (node_a, node_b, node_c))

    with pytest.raises(InvalidNetworkTopologyError):
        build_network_graph(built_city, TrafficEngineConfig(), [])
