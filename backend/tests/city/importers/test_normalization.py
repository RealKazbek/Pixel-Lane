"""Unit tests for the pure OSM-normalization layer.

No network access, and no networkx/osmnx dependency: `extract_network`
only needs an object shaped like `.nodes(data=True)` / `.edges(keys=True,
data=True)`, so a tiny hand-rolled fake graph is enough (see `FakeGraph`
below) -- these tests run whether or not the optional `osm` extra is
installed.
"""

from app.city.importers.osm.normalization import (
    extract_network,
    parse_lane_count,
    parse_maxspeed_kmh,
    parse_node_control,
    parse_oneway,
)


class FakeGeometry:
    """Stands in for a shapely LineString -- only `.coords` is used."""

    def __init__(self, coords: list[tuple[float, float]]) -> None:
        self.coords = coords


class FakeGraph:
    def __init__(self, nodes: dict[int, dict], edges: list[tuple[int, int, int, dict]]) -> None:
        self._nodes = nodes
        self._edges = edges

    def nodes(self, data: bool = False):  # noqa: ANN001, ANN201 -- test double
        return list(self._nodes.items())

    def edges(self, keys: bool = False, data: bool = False):  # noqa: ANN001, ANN201
        return list(self._edges)


def test_parse_oneway_bool_passthrough() -> None:
    assert parse_oneway({"oneway": True}) is True
    assert parse_oneway({"oneway": False}) is False


def test_parse_oneway_missing_defaults_false() -> None:
    assert parse_oneway({}) is False


def test_parse_lane_count_uses_directional_tag() -> None:
    assert parse_lane_count({"lanes:forward": "2"}, oneway=False) == 2


def test_parse_lane_count_splits_generic_lanes_for_two_way() -> None:
    assert parse_lane_count({"lanes": "4"}, oneway=False) == 2


def test_parse_lane_count_uses_full_generic_lanes_for_oneway() -> None:
    assert parse_lane_count({"lanes": "3"}, oneway=True) == 3


def test_parse_lane_count_fallback_when_no_lane_data() -> None:
    assert parse_lane_count({}, oneway=False) == 1
    assert parse_lane_count({}, oneway=True) == 1


def test_parse_maxspeed_kmh_plain_number() -> None:
    warnings: list[str] = []
    assert parse_maxspeed_kmh({"maxspeed": "50"}, warnings, edge_label="x") == 50.0
    assert warnings == []


def test_parse_maxspeed_kmh_mph_converted() -> None:
    warnings: list[str] = []
    result = parse_maxspeed_kmh({"maxspeed": "30 mph"}, warnings, edge_label="x")
    assert result is not None
    assert 48.0 < result < 48.5


def test_parse_maxspeed_kmh_unknown_value_warns_and_skips() -> None:
    warnings: list[str] = []
    result = parse_maxspeed_kmh({"maxspeed": "RU:urban"}, warnings, edge_label="way 1")
    assert result is None
    assert len(warnings) == 1
    assert "way 1" in warnings[0]


def test_parse_maxspeed_kmh_missing_tag() -> None:
    warnings: list[str] = []
    assert parse_maxspeed_kmh({}, warnings, edge_label="x") is None
    assert warnings == []


def test_parse_node_control_traffic_signals() -> None:
    assert parse_node_control({"highway": "traffic_signals"}) == "TRAFFIC_LIGHT"


def test_parse_node_control_stop_and_give_way() -> None:
    assert parse_node_control({"highway": "stop"}) == "STOP_SIGN"
    assert parse_node_control({"highway": "give_way"}) == "YIELD_SIGN"


def test_parse_node_control_default_uncontrolled() -> None:
    assert parse_node_control({}) == "UNCONTROLLED"


def test_extract_network_maps_nodes_and_edges() -> None:
    graph = FakeGraph(
        nodes={
            1: {"x": 76.9, "y": 43.2},
            2: {"x": 76.91, "y": 43.21},
        },
        edges=[(1, 2, 0, {"osmid": 100, "name": "Test St", "oneway": True, "lanes": "2"})],
    )

    network = extract_network(graph)

    assert len(network.nodes) == 2
    assert len(network.edges) == 1
    edge = network.edges[0]
    assert edge.points == ((76.9, 43.2), (76.91, 43.21))
    assert edge.lane_count == 2
    assert edge.oneway is True


def test_extract_network_preserves_intermediate_geometry_points() -> None:
    """Intermediate shape points come from the edge's own geometry, not
    just the two endpoint nodes -- they must not be turned into
    intersections (see mapper.py)."""
    graph = FakeGraph(
        nodes={1: {"x": 0.0, "y": 0.0}, 2: {"x": 3.0, "y": 0.0}},
        edges=[
            (
                1,
                2,
                0,
                {
                    "osmid": 5,
                    "oneway": True,
                    "geometry": FakeGeometry([(0.0, 0.0), (1.0, 0.5), (2.0, -0.5), (3.0, 0.0)]),
                },
            )
        ],
    )

    network = extract_network(graph)

    assert len(network.edges[0].points) == 4


def test_extract_network_skips_edge_with_missing_endpoint() -> None:
    graph = FakeGraph(
        nodes={1: {"x": 0.0, "y": 0.0}},
        edges=[(1, 999, 0, {"osmid": 1, "oneway": True})],
    )

    network = extract_network(graph)

    assert network.edges == ()
    assert any("999" in w or "endpoint" in w for w in network.warnings)


def test_extract_network_handles_parallel_edges_with_distinct_keys() -> None:
    graph = FakeGraph(
        nodes={1: {"x": 0.0, "y": 0.0}, 2: {"x": 1.0, "y": 0.0}},
        edges=[
            (1, 2, 0, {"osmid": 10, "oneway": True}),
            (1, 2, 1, {"osmid": 11, "oneway": True}),
        ],
    )

    network = extract_network(graph)

    assert len(network.edges) == 2
    assert {e.key for e in network.edges} == {0, 1}
