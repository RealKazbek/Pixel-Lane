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
    node -- see build_demo_district's Zhastar Street segments."""
    city = build_demo_district()
    near = next(r for r in city.roads if r.name == "Zhastar Street (northbound, near)")
    far = next(r for r in city.roads if r.name == "Zhastar Street (northbound, far)")
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
