"""Unit tests for the Demo District generator.

Pure: no database, no FastAPI -- exercises `build_demo_district()` and
the existing `validate_city` cross-reference validator directly.
"""

from app.city.domain.enums import CoordinateSystem, LaneType, MedianType, TurnLaneType
from app.city.examples.demo_district import DEMO_DISTRICT_CITY_ID, build_demo_district
from app.city.validators.city_validator import validate_city


def test_demo_district_passes_full_validation() -> None:
    city = build_demo_district()
    assert validate_city(city) == []


def test_demo_district_is_local_cartesian() -> None:
    """Never WGS84 -- this is what lets the frontend gate its schematic
    per-lane rendering to controlled fixtures only (see
    adapters/laneGeometry.ts and docs/city-model.md's Demo City section)."""
    city = build_demo_district()
    assert city.coordinate_system == CoordinateSystem.LOCAL_CARTESIAN


def test_demo_district_is_deterministic() -> None:
    """Same ids every call -- required for idempotent re-seeding (see
    seed_demo_district.py)."""
    first = build_demo_district()
    second = build_demo_district()

    assert first.id == second.id == DEMO_DISTRICT_CITY_ID
    assert [r.id for r in first.roads] == [r.id for r in second.roads]
    assert [i.id for i in first.intersections] == [i.id for i in second.intersections]


def test_demo_district_includes_a_divided_arterial_with_physical_median() -> None:
    city = build_demo_district()
    divided_roads = [r for r in city.roads if "Turan Avenue" in r.name]

    assert len(divided_roads) == 2
    for road in divided_roads:
        assert road.median == MedianType.PHYSICAL
        assert road.one_way is True


def test_demo_district_includes_a_bus_lane() -> None:
    city = build_demo_district()
    bus_lanes = [
        lane for road in city.roads for lane in road.lanes if lane.lane_type == LaneType.BUS
    ]
    assert len(bus_lanes) >= 1


def test_demo_district_includes_a_bike_lane() -> None:
    city = build_demo_district()
    bike_lanes = [
        lane for road in city.roads for lane in road.lanes if lane.lane_type == LaneType.BICYCLE
    ]
    assert len(bike_lanes) >= 1


def test_demo_district_includes_turn_only_lanes_with_normalized_turn_data() -> None:
    """Turn pockets must carry Part 2A's `allowed_turns` (not just the
    older `allowed_movements`), since that's what the frontend's turn-
    arrow rendering actually reads."""
    city = build_demo_district()
    turn_only_lanes = [
        lane for road in city.roads for lane in road.lanes if lane.lane_type.value == "TURN_ONLY"
    ]
    assert len(turn_only_lanes) >= 2
    for lane in turn_only_lanes:
        assert lane.allowed_turns
        assert all(isinstance(t, TurnLaneType) for t in lane.allowed_turns)


def test_demo_district_includes_a_lane_drop() -> None:
    """A lane count that decreases across two sequential roads sharing a
    node -- see build_demo_district's Zhastar Street segments. Several
    segments intentionally share the display name "Zhastar Street" (see
    _RoadBuilder's `key` vs. `name` docstring), so segments are
    distinguished here by their geometry, not by name."""
    city = build_demo_district()
    zhastar_segments = [r for r in city.roads if r.name == "Zhastar Street"]
    near = next(
        r
        for r in zhastar_segments
        if r.geometry.points[0].y == 152.0 and r.geometry.points[-1].y == 220.0
    )
    far = next(
        r
        for r in zhastar_segments
        if r.geometry.points[0].y == 220.0 and r.geometry.points[-1].y == 300.0
    )
    assert len(near.lanes) > len(far.lanes)


def test_demo_district_includes_a_curved_road() -> None:
    city = build_demo_district()
    curved = next(r for r in city.roads if "Round Park Drive" in r.name)
    assert len(curved.geometry.points) > 2


def test_demo_district_includes_a_controlled_and_an_uncontrolled_intersection() -> None:
    city = build_demo_district()
    control_types = {i.control_type.value for i in city.intersections}
    assert "TRAFFIC_LIGHT" in control_types
    assert "UNCONTROLLED" in control_types or "STOP_SIGN" in control_types


def test_demo_district_has_a_parking_zone() -> None:
    city = build_demo_district()
    assert len(city.parking_zones) >= 1


def test_demo_district_has_routable_traffic_demand_for_real_congestion_analysis() -> None:
    """No fabricated/hardcoded congestion colors: the demo relies on the
    real Traffic Analysis pipeline, which needs a routable (source !=
    destination) demand to produce anything -- see this generator's
    module docstring."""
    city = build_demo_district()
    assert len(city.traffic_demands) >= 1
    for demand in city.traffic_demands:
        assert demand.destination_intersection_id is not None
        assert demand.source_intersection_id != demand.destination_intersection_id


def test_slip_road_endpoints_exactly_match_real_shared_nodes() -> None:
    """Regression: a slip road that merely comes close to another road's
    coordinates is NOT a real connection -- both of Zevit Slip Road's
    endpoints must exactly match an existing intersection position / an
    existing point already on the road it joins (see docs/city-model.md's
    "visual connection implies topological connection" invariant)."""
    city = build_demo_district()
    slip_road = next(r for r in city.roads if r.name == "Zevit Slip Road")
    start = slip_road.geometry.points[0]
    end = slip_road.geometry.points[-1]

    lane_drop_node = next(
        i
        for i in city.intersections
        if any(r == slip_road.id for r in i.connected_road_ids)
        and (start.x, start.y) == (i.position.x, i.position.y)
    )
    assert lane_drop_node.control_type.value == "UNCONTROLLED"

    turan = next(r for r in city.roads if r.name == "Turan Avenue" and end in r.geometry.points)
    assert end in turan.geometry.points


def test_kokzhiek_access_road_is_a_real_t_junction_off_samal_street() -> None:
    """Regression: Kokzhiek Access Road's start point exactly matches
    Samal Street's endpoint -- that visual join must be backed by an
    actual Intersection, not left as two independently-drawn roads."""
    city = build_demo_district()
    samal = next(r for r in city.roads if r.name == "Samal Street")
    kokzhiek = next(r for r in city.roads if r.name == "Kokzhiek Access Road")

    shared_point = kokzhiek.geometry.points[0]
    assert shared_point == samal.geometry.points[-1]

    junction = next(
        i
        for i in city.intersections
        if samal.id in i.connected_road_ids and kokzhiek.id in i.connected_road_ids
    )
    assert (junction.position.x, junction.position.y) == (shared_point.x, shared_point.y)


def test_road_names_deduplicate_for_clean_map_labels() -> None:
    """Regression for the label-clutter complaint: multi-segment real
    streets (divided carriageways, a lane-drop pair, a loop) must share
    one clean display name, never leak internal segment/direction
    identity like "(northbound, near)" into the user-facing name."""
    city = build_demo_district()
    for road in city.roads:
        assert "(" not in road.name, f"{road.name!r} looks like a debug label"


def test_demo_district_includes_an_acute_y_junction() -> None:
    city = build_demo_district()
    fork = next(i for i in city.intersections if (i.position.x, i.position.y) == (80.0, 50.0))
    assert len(fork.connected_road_ids) == 3
    road_names = {r.name for r in city.roads if r.id in fork.connected_road_ids}
    assert road_names == {"Zharyq Approach", "Bereke Lane", "Zharyq Alley"}


def test_demo_district_includes_a_lane_split_diverge() -> None:
    """The reverse of the Zhastar lane-drop: one single-lane approach
    forking into two single-lane branches at a shared node."""
    city = build_demo_district()
    fork = next(i for i in city.intersections if (i.position.x, i.position.y) == (260.0, 340.0))
    assert len(fork.connected_road_ids) == 3
    branch_roads = [r for r in city.roads if r.id in fork.connected_road_ids]
    assert all(len(r.lanes) == 1 for r in branch_roads)


def test_demo_district_has_bus_stops_referencing_real_roads() -> None:
    city = build_demo_district()
    road_ids = {r.id for r in city.roads}
    assert len(city.bus_stops) >= 1
    for stop in city.bus_stops:
        assert stop.road_id in road_ids


def test_demo_district_has_crosswalks_referencing_real_roads() -> None:
    city = build_demo_district()
    road_ids = {r.id for r in city.roads}
    assert len(city.crosswalks) >= 1
    for crossing in city.crosswalks:
        assert crossing.road_id in road_ids
        assert 0.0 <= crossing.position_ratio <= 1.0


def test_every_shared_road_endpoint_is_backed_by_a_real_intersection() -> None:
    """General (not per-road) topology invariant: whenever two roads in
    this district visually touch (share an exact endpoint coordinate),
    at least one Intersection must reference both of them. This is
    exactly "visual connection implies topological connection" -- a
    frontend renderer that later fuses road polygons at shared points
    (see roadSurfaceGeometry.ts) must never be asked to fuse roads the
    domain model doesn't actually consider connected."""
    city = build_demo_district()
    endpoints_by_road = {
        road.id: (
            (road.geometry.points[0].x, road.geometry.points[0].y),
            (road.geometry.points[-1].x, road.geometry.points[-1].y),
        )
        for road in city.roads
    }
    connected_pairs = {
        frozenset((a, b))
        for i in city.intersections
        for a in i.connected_road_ids
        for b in i.connected_road_ids
        if a != b
    }

    for road_a in city.roads:
        for road_b in city.roads:
            if road_a.id >= road_b.id:
                continue
            shares_point = bool(
                set(endpoints_by_road[road_a.id]) & set(endpoints_by_road[road_b.id])
            )
            if not shares_point:
                continue
            assert frozenset((road_a.id, road_b.id)) in connected_pairs, (
                f"{road_a.name!r} and {road_b.name!r} share an endpoint but no "
                "Intersection connects them"
            )
