from pixel_lane_simulation.traffic.config import TrafficEngineConfig
from pixel_lane_simulation.traffic.flow.assignment import assign_flows
from pixel_lane_simulation.traffic.graph.builder import build_network_graph
from tests.traffic.factories import demand, linear_network


def test_one_demand_assigns_flow_to_its_route() -> None:
    built_city, a_id, b_id, _ = linear_network()
    graph = build_network_graph(built_city, TrafficEngineConfig(), [])
    demands = (demand(a_id, b_id, 300.0),)

    result = assign_flows(graph, demands, [])

    assert result.routed_demand_count == 1
    assert len(result.routes) == 1
    assert sum(result.edge_volumes_vph.values()) == 300.0


def test_multiple_demands_aggregate_on_shared_edge() -> None:
    built_city, a_id, b_id, c_id = linear_network()
    graph = build_network_graph(built_city, TrafficEngineConfig(), [])
    demands = (
        demand(a_id, b_id, 200.0),
        demand(a_id, c_id, 150.0),  # also uses the A->B edge
    )

    result = assign_flows(graph, demands, [])

    ab_edge_id = next(e.id for e in graph.outgoing_edges(a_id) if e.to_node == b_id)
    assert result.edge_volumes_vph[ab_edge_id] == 350.0
    assert result.routed_demand_count == 2


def test_flow_propagates_over_full_route() -> None:
    built_city, a_id, _, c_id = linear_network()
    graph = build_network_graph(built_city, TrafficEngineConfig(), [])
    demands = (demand(a_id, c_id, 100.0),)

    result = assign_flows(graph, demands, [])

    assert len(result.routes[0].road_ids) == 2
    for volume in result.edge_volumes_vph.values():
        assert volume == 100.0


def test_movement_only_demand_is_skipped_with_warning() -> None:
    built_city, a_id, _, _ = linear_network()
    graph = build_network_graph(built_city, TrafficEngineConfig(), [])
    demands = (demand(a_id, None, 100.0),)
    warnings: list[str] = []

    result = assign_flows(graph, demands, warnings)

    assert result.routed_demand_count == 0
    assert result.unrouted_demand_count == 1
    assert any("movement-only" in w for w in warnings)


def test_unreachable_demand_is_skipped_with_warning() -> None:
    from tests.traffic.factories import city, intersection, lane, point, road

    r = road(point(0, 0), point(100, 0), (lane("FORWARD"),))
    node_a = intersection(point(0, 0), (r.id,))
    node_b = intersection(point(100, 0), (r.id,))
    isolated = intersection(point(999, 999), ())
    built_city = city((r,), (node_a, node_b, isolated))
    graph = build_network_graph(built_city, TrafficEngineConfig(), [])

    warnings: list[str] = []
    result = assign_flows(graph, (demand(node_a.id, isolated.id, 50.0),), warnings)

    assert result.unrouted_demand_count == 1
    assert any("no route found" in w for w in warnings)
