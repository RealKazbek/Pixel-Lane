"""Unit tests for OSM -> Pixel Lane City Model mapping.

Pure: builds `NormalizedNode`/`NormalizedEdge` directly, no network, no
osmnx/networkx dependency at all.
"""

from uuid import uuid4

from app.city.domain.enums import IntersectionControlType, LaneDirection
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
) -> NormalizedEdge:
    return NormalizedEdge(
        u=u,
        v=v,
        key=key,
        osm_ids=(1000 + u * 10 + v,),
        points=points or ((0.0, 0.0), (0.001, 0.0)),
        name=name,
        highway="residential",
        oneway=oneway,
        lane_count=lane_count,
        maxspeed_kmh=maxspeed_kmh,
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
