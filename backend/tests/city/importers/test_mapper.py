"""Unit tests for OSM -> Pixel Lane City Model mapping.

Pure: builds `NormalizedNode`/`NormalizedEdge` directly, no network, no
osmnx/networkx dependency at all.
"""

from uuid import uuid4

from app.city.domain.enums import IntersectionControlType, LaneDirection, LaneType, MedianType
from app.city.importers.osm.mapper import map_network_to_city
from app.city.importers.osm.normalization import NormalizedEdge, NormalizedNetwork, NormalizedNode


def _node(
    osm_id: int, lon: float, lat: float, control_type: str = "UNCONTROLLED"
) -> NormalizedNode:
    return NormalizedNode(osm_id=osm_id, lon=lon, lat=lat, control_type=control_type)


def _edge(
    u: int,
    v: int,
    key: int = 0,
    *,
    points: tuple[tuple[float, float], ...] | None = None,
    oneway: bool = True,
    lane_count: int = 1,
    maxspeed_kmh: float | None = None,
    name: str | None = "Test Road",
    highway: str = "residential",
    width_m: float | None = None,
    bridge: bool = False,
    tunnel: bool = False,
    level: int = 0,
    lane_count_quality: str = "FALLBACK",
    lanes_forward_raw: int | None = None,
    lanes_backward_raw: int | None = None,
    lanes_both_ways_raw: int | None = None,
    turn_lanes: tuple[tuple[str, ...], ...] | None = None,
    change_lanes: tuple[str | None, ...] | None = None,
) -> NormalizedEdge:
    return NormalizedEdge(
        u=u,
        v=v,
        key=key,
        osm_ids=(1000 + u * 10 + v,),
        points=points or ((0.0, 0.0), (0.001, 0.0)),
        name=name,
        highway=highway,
        oneway=oneway,
        lane_count=lane_count,
        maxspeed_kmh=maxspeed_kmh,
        width_m=width_m,
        bridge=bridge,
        tunnel=tunnel,
        level=level,
        lane_count_quality=lane_count_quality,
        lanes_forward_raw=lanes_forward_raw,
        lanes_backward_raw=lanes_backward_raw,
        lanes_both_ways_raw=lanes_both_ways_raw,
        turn_lanes=turn_lanes,
        change_lanes=change_lanes,
    )


def _map(network: NormalizedNetwork):  # noqa: ANN201 -- test helper
    return map_network_to_city(network, city_id=uuid4(), city_name="Test City", description=None)


def test_two_way_road_produces_two_roads_one_per_direction() -> None:
    """A two-way OSM street is two directed edges -- mapped to two
    Pixel Lane Roads, each with only FORWARD lanes (see mapper.py's
    module docstring for why)."""
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, oneway=False), _edge(2, 1, oneway=False)),
    )

    result = _map(network)

    assert len(result.city.roads) == 2
    for road in result.city.roads:
        assert all(lane.direction == LaneDirection.FORWARD for lane in road.lanes)


def test_one_way_road_has_no_reverse_edge() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, oneway=True),),
    )

    result = _map(network)

    assert len(result.city.roads) == 1


def test_lane_metadata_sets_lane_count() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, lane_count=3),),
    )

    result = _map(network)

    assert len(result.city.roads[0].lanes) == 3


def test_fallback_lane_count_produces_one_lane() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, lane_count=1),),
    )

    result = _map(network)

    assert len(result.city.roads[0].lanes) == 1


def test_intermediate_polyline_points_are_preserved_in_order() -> None:
    points = ((0.0, 0.0), (0.0005, 0.0002), (0.001, -0.0001), (0.0015, 0.0))
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.0015, 0.0)),
        edges=(_edge(1, 2, points=points),),
    )

    result = _map(network)

    road_points = result.city.roads[0].geometry.points
    assert [(p.x, p.y) for p in road_points] == list(points)


def test_topology_node_becomes_intersection_with_connected_roads() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0), _node(3, 0.002, 0.0)),
        edges=(_edge(1, 2), _edge(2, 3)),
    )

    result = _map(network)

    node_2 = next(i for i in result.city.intersections if i.position.x == 0.001)
    assert len(node_2.connected_road_ids) == 2


def test_traffic_signal_node_gets_traffic_light() -> None:
    network = NormalizedNetwork(
        nodes=(
            _node(1, 0.0, 0.0),
            _node(2, 0.001, 0.0, control_type="TRAFFIC_LIGHT"),
        ),
        edges=(_edge(1, 2),),
    )

    result = _map(network)

    signal_intersection = next(
        i
        for i in result.city.intersections
        if i.control_type == IntersectionControlType.TRAFFIC_LIGHT
    )
    assert signal_intersection.traffic_light_id is not None
    assert len(result.city.traffic_lights) == 1
    light = result.city.traffic_lights[0]
    assert light.intersection_id == signal_intersection.id
    assert len(light.signal_groups) == 1
    assert len(light.phases) == 1


def test_maxspeed_creates_speed_limit_rule() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, maxspeed_kmh=60.0),),
    )

    result = _map(network)

    assert len(result.city.traffic_rules) == 1
    rule = result.city.traffic_rules[0]
    assert rule.speed_limit_kmh == 60.0
    assert rule.target_id == result.city.roads[0].id


def test_missing_maxspeed_creates_no_rule_but_keeps_default_speed() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, maxspeed_kmh=None),),
    )

    result = _map(network)

    assert result.city.traffic_rules == []
    assert result.city.roads[0].default_speed_limit_kmh > 0


def test_deterministic_ids_across_two_mapping_runs() -> None:
    def build_network() -> NormalizedNetwork:
        return NormalizedNetwork(
            nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
            edges=(_edge(1, 2),),
        )

    city_id = uuid4()
    first = map_network_to_city(build_network(), city_id=city_id, city_name="A", description=None)
    second = map_network_to_city(build_network(), city_id=city_id, city_name="A", description=None)

    assert first.city.roads[0].id == second.city.roads[0].id
    assert first.city.intersections[0].id == second.city.intersections[0].id
    assert first.city.roads[0].lanes[0].id == second.city.roads[0].lanes[0].id


def test_node_with_no_connected_edges_is_skipped_with_warning() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0), _node(99, 5.0, 5.0)),
        edges=(_edge(1, 2),),
    )

    result = _map(network)

    assert len(result.city.intersections) == 2
    assert any("99" in w for w in result.warnings)


def test_unnamed_road_gets_fallback_name() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, name=None),),
    )

    result = _map(network)

    assert result.city.roads[0].name


def test_explicit_osm_width_is_preserved_and_not_marked_estimated() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, width_m=9.5),),
    )

    road = _map(network).city.roads[0]

    assert road.width_m == 9.5
    assert road.is_width_estimated is False


def test_missing_width_falls_back_to_estimate_and_is_marked_as_such() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, highway="motorway", lane_count=2),),
    )

    road = _map(network).city.roads[0]

    assert road.width_m is not None
    assert road.width_m > 0
    assert road.is_width_estimated is True


def test_motorway_estimated_wider_than_residential_same_lane_count() -> None:
    network = NormalizedNetwork(
        nodes=(
            _node(1, 0.0, 0.0),
            _node(2, 0.001, 0.0),
            _node(3, 0.002, 0.0),
            _node(4, 0.003, 0.0),
        ),
        edges=(
            _edge(1, 2, highway="motorway", lane_count=2),
            _edge(3, 4, highway="residential", lane_count=2),
        ),
    )

    roads = _map(network).city.roads
    motorway_road = next(r for r in roads if r.source_road_type == "motorway")
    residential_road = next(r for r in roads if r.source_road_type == "residential")

    assert motorway_road.width_m > residential_road.width_m


def test_two_way_road_has_single_undivided_carriageway() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, oneway=False),),
    )

    road = _map(network).city.roads[0]

    assert road.carriageway_count == 1
    assert road.median == MedianType.NONE


def test_one_way_road_is_not_assumed_to_be_a_divided_carriageway() -> None:
    """Regression: `oneway=yes` alone must never manufacture a second
    carriageway (see mapper._carriageway_and_median) -- each Road is
    exactly one traced physical way, so carriageway_count stays 1
    regardless of direction. The median also stays UNKNOWN (not NONE and
    not PHYSICAL/PAINTED): direction tells us nothing about a divider
    either way."""
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, oneway=True),),
    )

    road = _map(network).city.roads[0]

    assert road.carriageway_count == 1
    assert road.median == MedianType.UNKNOWN


def test_multi_lane_two_way_road_is_not_assumed_to_be_divided() -> None:
    """Regression: a high lane count must never imply a second
    carriageway or a median -- lane count and physical separation are
    independent facts."""
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, oneway=False, lane_count=4),),
    )

    road = _map(network).city.roads[0]

    assert road.carriageway_count == 1
    assert road.median == MedianType.NONE


def test_two_directed_edges_of_one_two_way_street_each_stay_undivided() -> None:
    """Regression: OSMnx models an ordinary two-way street as two directed
    edges (one per direction, same physical way) -- neither becomes a
    second carriageway or a divided median just because there are two
    Road rows for one street."""
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, oneway=False), _edge(2, 1, oneway=False)),
    )

    roads = _map(network).city.roads

    assert len(roads) == 2
    for road in roads:
        assert road.carriageway_count == 1
        assert road.median == MedianType.NONE


def test_bridge_and_tunnel_metadata_and_level_are_preserved() -> None:
    network = NormalizedNetwork(
        nodes=(
            _node(1, 0.0, 0.0),
            _node(2, 0.001, 0.0),
            _node(3, 0.002, 0.0),
            _node(4, 0.003, 0.0),
        ),
        edges=(
            _edge(1, 2, bridge=True, level=1),
            _edge(3, 4, tunnel=True, level=-1),
        ),
    )

    roads = _map(network).city.roads
    bridge_road = next(r for r in roads if r.is_bridge)
    tunnel_road = next(r for r in roads if r.is_tunnel)

    assert bridge_road.level == 1
    assert bridge_road.is_tunnel is False
    assert tunnel_road.level == -1
    assert tunnel_road.is_bridge is False


def test_default_road_has_ground_level_and_no_bridge_or_tunnel() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2),),
    )

    road = _map(network).city.roads[0]

    assert road.level == 0
    assert road.is_bridge is False
    assert road.is_tunnel is False


def test_a_bridge_and_an_unrelated_crossing_road_are_not_merged_into_one_intersection() -> None:
    """A road crossing another at a different vertical level must not be
    assumed to be a junction. This architecture only ever creates
    Intersections from real OSM graph nodes (see mapper.py's
    map_network_to_city), never from geometric line crossings, so two
    edges that happen to cross in plan view but share no OSM node produce
    no shared intersection at all."""
    network = NormalizedNetwork(
        nodes=(
            _node(1, 0.0, 0.0),
            _node(2, 0.001, 0.0),
            _node(3, 0.0005, -0.001),
            _node(4, 0.0005, 0.001),
        ),
        edges=(
            _edge(1, 2, bridge=True, level=1),
            _edge(3, 4, level=0),
        ),
    )

    result = _map(network)

    assert len(result.city.intersections) == 4
    for intersection in result.city.intersections:
        assert len(intersection.connected_road_ids) == 1


def test_lane_count_and_change_permissions_are_carried_onto_lane_rows() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(
            _edge(
                1,
                2,
                lane_count=2,
                lane_count_quality="SOURCE",
                lanes_forward_raw=2,
                lanes_backward_raw=1,
                turn_lanes=(("LEFT",), ("THROUGH", "RIGHT")),
                change_lanes=(None, "NO"),
            ),
        ),
    )

    road = _map(network).city.roads[0]

    assert road.lane_count_quality == "SOURCE"
    assert road.forward_lane_count == 2
    assert road.backward_lane_count == 1
    assert road.both_ways_lane_count is None
    assert [lane.allowed_turns for lane in road.lanes] == [["LEFT"], ["THROUGH", "RIGHT"]]
    assert [lane.lane_change for lane in road.lanes] == [None, "NO"]


def test_no_turn_or_change_lane_data_leaves_lanes_unmarked() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, lane_count=2),),
    )

    road = _map(network).city.roads[0]

    assert all(lane.allowed_turns is None for lane in road.lanes)
    assert all(lane.lane_change is None for lane in road.lanes)


def test_both_ways_lane_count_is_preserved() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, oneway=False, lanes_both_ways_raw=1),),
    )

    road = _map(network).city.roads[0]

    assert road.both_ways_lane_count == 1


def test_bus_lane_data_sets_lane_type_source_only() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, lane_count=2),),
    )
    # Patch the edge with bus_lanes via replace (NormalizedEdge is frozen).
    from dataclasses import replace

    edge = replace(network.edges[0], bus_lanes=(True, False))
    network = NormalizedNetwork(nodes=network.nodes, edges=(edge,))

    road = _map(network).city.roads[0]

    assert [lane.lane_type for lane in road.lanes] == [LaneType.BUS, LaneType.GENERAL]


def test_no_bus_lane_data_leaves_lanes_general() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, lane_count=2),),
    )

    road = _map(network).city.roads[0]

    assert all(lane.lane_type == LaneType.GENERAL for lane in road.lanes)


def test_parking_and_cycleway_are_source_only_and_unknown_by_default() -> None:
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2),),
    )

    road = _map(network).city.roads[0]

    assert road.parking_left == "UNKNOWN"
    assert road.parking_right == "UNKNOWN"
    assert road.cycleway_left == "UNKNOWN"
    assert road.cycleway_right == "UNKNOWN"


def test_parking_and_cycleway_are_carried_through_when_present() -> None:
    from dataclasses import replace

    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2),),
    )
    edge = replace(
        network.edges[0],
        parking_left="PARALLEL",
        parking_right="NONE",
        cycleway_left="TRACK",
        cycleway_right="NONE",
    )
    network = NormalizedNetwork(nodes=network.nodes, edges=(edge,))

    road = _map(network).city.roads[0]

    assert road.parking_left == "PARALLEL"
    assert road.parking_right == "NONE"
    assert road.cycleway_left == "TRACK"
    assert road.cycleway_right == "NONE"


def test_regression_one_way_road_still_has_single_carriageway_with_lane_data() -> None:
    """Regression for the Part 1 carriageway bug: adding bus/parking/
    cycleway data must never resurrect the old oneway->carriageway_count=2
    heuristic (see commit 22ba1ae)."""
    network = NormalizedNetwork(
        nodes=(_node(1, 0.0, 0.0), _node(2, 0.001, 0.0)),
        edges=(_edge(1, 2, oneway=True, lane_count=3),),
    )

    road = _map(network).city.roads[0]

    assert road.carriageway_count == 1
    assert road.median == MedianType.UNKNOWN
