"""Unit tests for the pure OSM-normalization layer.

No network access, and no networkx/osmnx dependency: `extract_network`
only needs an object shaped like `.nodes(data=True)` / `.edges(keys=True,
data=True)`, so a tiny hand-rolled fake graph is enough (see `FakeGraph`
below) -- these tests run whether or not the optional `osm` extra is
installed.
"""

from app.city.importers.osm.normalization import (
    extract_network,
    parse_bridge,
    parse_bus_lanes,
    parse_change_lanes,
    parse_cycleways,
    parse_lane_count,
    parse_level,
    parse_maxspeed_kmh,
    parse_node_control,
    parse_oneway,
    parse_parking_lanes,
    parse_tunnel,
    parse_turn_lanes,
    parse_width_m,
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
    result = parse_lane_count({"lanes:forward": "2"}, oneway=False)
    assert result.count == 2
    assert result.quality == "SOURCE"
    assert result.forward_raw == 2
    assert result.backward_raw is None


def test_parse_lane_count_does_not_split_generic_lanes_for_two_way() -> None:
    """Regression: lanes=4, oneway=no must NEVER be inferred as 2+2 -- see
    the Part 2A audit. With no directional tags this falls back to
    DEFAULT_LANE_COUNT, explicitly marked FALLBACK, not a guessed split."""
    result = parse_lane_count({"lanes": "4"}, oneway=False)
    assert result.count == 1
    assert result.quality == "FALLBACK"
    assert result.forward_raw is None
    assert result.backward_raw is None


def test_parse_lane_count_uses_full_generic_lanes_for_oneway() -> None:
    result = parse_lane_count({"lanes": "3"}, oneway=True)
    assert result.count == 3
    assert result.quality == "INFERRED"


def test_parse_lane_count_fallback_when_no_lane_data() -> None:
    assert parse_lane_count({}, oneway=False).count == 1
    assert parse_lane_count({}, oneway=False).quality == "FALLBACK"
    assert parse_lane_count({}, oneway=True).count == 1
    assert parse_lane_count({}, oneway=True).quality == "FALLBACK"


def test_parse_lane_count_observed_only_never_synthesizes_fallback() -> None:
    result = parse_lane_count({}, oneway=False, observed_only=True)
    assert result.count == 0
    assert result.quality == "UNKNOWN"


def test_parse_lane_count_explicit_forward_and_backward_and_both_ways() -> None:
    result = parse_lane_count(
        {"lanes": "4", "lanes:forward": "3", "lanes:backward": "1", "lanes:both_ways": "1"},
        oneway=False,
    )
    assert result.count == 3
    assert result.quality == "SOURCE"
    assert result.forward_raw == 3
    assert result.backward_raw == 1
    assert result.both_ways_raw == 1


def test_parse_lane_count_reversed_edge_uses_backward_tag() -> None:
    """A reversed edge (OSMnx's `reversed=True`, e.g. from `oneway=-1`
    normalization) must read `lanes:backward`, never `lanes:forward`."""
    result = parse_lane_count(
        {"lanes:forward": "3", "lanes:backward": "1", "reversed": True}, oneway=False
    )
    assert result.count == 1
    assert result.quality == "SOURCE"


def test_parse_lane_count_malformed_directional_tag_does_not_crash() -> None:
    result = parse_lane_count({"lanes:forward": "not-a-number", "lanes": "2"}, oneway=True)
    assert result.count == 2
    assert result.quality == "INFERRED"
    assert result.forward_raw is None


def test_parse_turn_lanes_single_and_multiple_turns_per_lane() -> None:
    warnings: list[str] = []
    result = parse_turn_lanes(
        {"turn:lanes": "left|through;right"},
        oneway=True,
        lane_count=2,
        warnings=warnings,
        edge_label="x",
    )
    assert result == (("LEFT",), ("THROUGH", "RIGHT"))
    assert warnings == []


def test_parse_turn_lanes_empty_lane_token_is_distinct_from_missing_tag() -> None:
    warnings: list[str] = []
    result = parse_turn_lanes(
        {"turn:lanes": "through||right"},
        oneway=True,
        lane_count=3,
        warnings=warnings,
        edge_label="x",
    )
    assert result == (("THROUGH",), (), ("RIGHT",))

    assert parse_turn_lanes({}, oneway=True, lane_count=1, warnings=[], edge_label="x") is None


def test_parse_turn_lanes_unsupported_token_is_skipped_with_warning() -> None:
    warnings: list[str] = []
    result = parse_turn_lanes(
        {"turn:lanes": "left|bogus_token"},
        oneway=True,
        lane_count=2,
        warnings=warnings,
        edge_label="way 1",
    )
    assert result == (("LEFT",), ())
    assert any("bogus_token" in w and "way 1" in w for w in warnings)


def test_parse_turn_lanes_mismatched_lane_count_discards_data_safely() -> None:
    """Regression: a malformed/stale turn:lanes tag whose group count
    doesn't match the resolved lane count must never be applied to the
    wrong lane indices -- discard with a warning instead of crashing or
    guessing."""
    warnings: list[str] = []
    result = parse_turn_lanes(
        {"turn:lanes": "left|through|right"},
        oneway=True,
        lane_count=2,
        warnings=warnings,
        edge_label="way 2",
    )
    assert result is None
    assert any("way 2" in w for w in warnings)


def test_parse_turn_lanes_two_way_requires_directional_suffix() -> None:
    """An unsuffixed turn:lanes on a two-way way is ambiguous and must
    never be applied -- only turn:lanes:forward/:backward are trusted."""
    result = parse_turn_lanes(
        {"turn:lanes": "left|right"}, oneway=False, lane_count=2, warnings=[], edge_label="x"
    )
    assert result is None

    result_forward = parse_turn_lanes(
        {"turn:lanes:forward": "left|right"},
        oneway=False,
        lane_count=2,
        warnings=[],
        edge_label="x",
    )
    assert result_forward == (("LEFT",), ("RIGHT",))

    result_backward = parse_turn_lanes(
        {"turn:lanes:forward": "left|right", "turn:lanes:backward": "through", "reversed": True},
        oneway=False,
        lane_count=1,
        warnings=[],
        edge_label="x",
    )
    assert result_backward == (("THROUGH",),)


def test_parse_change_lanes_tokens() -> None:
    warnings: list[str] = []
    result = parse_change_lanes(
        {"change:lanes": "yes|not_left|no"},
        oneway=True,
        lane_count=3,
        warnings=warnings,
        edge_label="x",
    )
    assert result == ("YES", "NOT_LEFT", "NO")
    assert warnings == []


def test_parse_change_lanes_empty_token_is_none_not_a_guess() -> None:
    result = parse_change_lanes(
        {"change:lanes": "yes|"}, oneway=True, lane_count=2, warnings=[], edge_label="x"
    )
    assert result == ("YES", None)


def test_parse_change_lanes_missing_tag_is_unknown() -> None:
    assert parse_change_lanes({}, oneway=True, lane_count=1, warnings=[], edge_label="x") is None


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


def test_parse_width_m_plain_number() -> None:
    assert parse_width_m({"width": "7.5"}) == 7.5


def test_parse_width_m_with_meter_suffix() -> None:
    assert parse_width_m({"width": "12 m"}) == 12.0


def test_parse_width_m_missing_is_none() -> None:
    assert parse_width_m({}) is None


def test_parse_width_m_rejects_unreasonable_values() -> None:
    assert parse_width_m({"width": "abc"}) is None
    assert parse_width_m({"width": "-5"}) is None
    assert parse_width_m({"width": "0"}) is None


def test_parse_bridge_and_tunnel_flags() -> None:
    assert parse_bridge({"bridge": "yes"}) is True
    assert parse_bridge({"bridge": "no"}) is False
    assert parse_bridge({}) is False
    assert parse_tunnel({"tunnel": "yes"}) is True
    assert parse_tunnel({}) is False


def test_parse_level_uses_explicit_layer_tag() -> None:
    assert parse_level({"layer": "2"}) == 2
    assert parse_level({"layer": "-1"}) == -1


def test_parse_level_falls_back_to_bridge_or_tunnel_when_no_layer_tag() -> None:
    assert parse_level({"bridge": "yes"}) == 1
    assert parse_level({"tunnel": "yes"}) == -1
    assert parse_level({}) == 0


def test_parse_level_clamps_extreme_values() -> None:
    assert parse_level({"layer": "99"}) == 4
    assert parse_level({"layer": "-99"}) == -4


def test_parse_bus_lanes_from_bus_lanes_tag() -> None:
    warnings: list[str] = []
    result = parse_bus_lanes(
        {"bus:lanes": "designated|no|no"},
        oneway=True,
        lane_count=3,
        warnings=warnings,
        edge_label="x",
    )
    assert result == (True, False, False)
    assert warnings == []


def test_parse_bus_lanes_falls_back_to_psv_lanes() -> None:
    result = parse_bus_lanes(
        {"psv:lanes": "yes|no"}, oneway=True, lane_count=2, warnings=[], edge_label="x"
    )
    assert result == (True, False)


def test_parse_bus_lanes_missing_tag_is_none() -> None:
    assert parse_bus_lanes({}, oneway=True, lane_count=1, warnings=[], edge_label="x") is None


def test_parse_bus_lanes_mismatched_count_discards_data_safely() -> None:
    warnings: list[str] = []
    result = parse_bus_lanes(
        {"bus:lanes": "designated|no|no"},
        oneway=True,
        lane_count=2,
        warnings=warnings,
        edge_label="way 3",
    )
    assert result is None
    assert any("way 3" in w for w in warnings)


def test_parse_parking_lanes_left_right_and_both() -> None:
    assert parse_parking_lanes({"parking:lane:left": "parallel", "parking:lane:right": "no"}) == (
        "PARALLEL",
        "NONE",
    )
    assert parse_parking_lanes({"parking:lane:both": "diagonal"}) == ("DIAGONAL", "DIAGONAL")
    assert parse_parking_lanes({}) == (None, None)
    assert parse_parking_lanes({"parking:lane:right": "yes"}) == (None, "MARKED")


def test_parse_cycleways_left_right_and_shared() -> None:
    assert parse_cycleways({"cycleway": "lane"}) == ("LANE", "LANE")
    assert parse_cycleways({"cycleway:left": "track", "cycleway:right": "no"}) == ("TRACK", "NONE")
    assert parse_cycleways({}) == (None, None)
