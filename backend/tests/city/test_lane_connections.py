from dataclasses import replace
from uuid import UUID

import pytest

from app.city.domain.enums import LaneDirection, LaneRelativeDirection, MovementType
from app.city.domain.lane_connections import (
    CityLaneNetwork,
    LaneApproach,
    LaneNetworkIntersection,
    LaneNetworkLane,
    LaneNetworkPoint,
    LaneNetworkRoad,
    classify_maneuver,
    generate_intersection_connections,
    lane_direction_relative_to_intersection,
    match_lane_approaches,
    stable_lane_connection_id,
)
from app.city.examples import load_four_way_intersection
from app.city.schemas.city import CityCreate
from app.city.validators.lane_connection_validator import build_lane_network

INTERSECTION_ID = UUID("00000000-0000-0000-0000-000000000001")


def _approaches(prefix: str, count: int, bearing: float) -> list[LaneApproach]:
    return [
        LaneApproach(
            road_id=UUID(int=10 if prefix == "from" else 20),
            lane_id=UUID(int=(100 if prefix == "from" else 200) + index),
            lane_index=index,
            direction=LaneDirection.FORWARD,
            outward_bearing_deg=bearing,
        )
        for index in range(count)
    ]


@pytest.mark.parametrize("lane_count", [1, 2, 3])
def test_equal_lane_groups_match_by_semantic_index(lane_count: int) -> None:
    result = match_lane_approaches(
        INTERSECTION_ID,
        _approaches("from", lane_count, 180),
        _approaches("to", lane_count, 0),
    )
    assert len(result.connections) == lane_count
    assert all(connection.maneuver == MovementType.STRAIGHT for connection in result.connections)
    assert len({connection.id for connection in result.connections}) == lane_count


def test_matching_is_deterministic() -> None:
    first = match_lane_approaches(
        INTERSECTION_ID,
        list(reversed(_approaches("from", 3, 180))),
        list(reversed(_approaches("to", 3, 0))),
    )
    second = match_lane_approaches(
        INTERSECTION_ID,
        _approaches("from", 3, 180),
        _approaches("to", 3, 0),
    )
    assert first == second


def test_reversed_approach_bearings_classify_from_geometry_not_render_order() -> None:
    result = match_lane_approaches(
        INTERSECTION_ID,
        _approaches("from", 1, 270),
        _approaches("to", 1, 0),
    )
    assert result.connections[0].maneuver == MovementType.LEFT


def test_asymmetric_lane_counts_are_explicitly_unsupported() -> None:
    result = match_lane_approaches(
        INTERSECTION_ID,
        _approaches("from", 2, 180),
        _approaches("to", 3, 0),
    )
    assert result.connections == ()
    assert result.warnings == ("UNSUPPORTED_ASYMMETRIC_LANE_COUNTS",)


def test_forbidden_maneuver_is_excluded_by_lane_permission() -> None:
    incoming = _approaches("from", 1, 270)
    incoming[0] = replace(incoming[0], allowed_movements=(MovementType.STRAIGHT,))
    result = match_lane_approaches(INTERSECTION_ID, incoming, _approaches("to", 1, 0))
    assert result.connections == ()


def test_maneuver_classification_and_stable_identity() -> None:
    assert classify_maneuver(180, 0) == MovementType.STRAIGHT
    assert classify_maneuver(180, 270) == MovementType.LEFT
    assert classify_maneuver(180, 90) == MovementType.RIGHT
    assert classify_maneuver(180, 180) == MovementType.U_TURN
    assert stable_lane_connection_id(
        INTERSECTION_ID, UUID(int=1), UUID(int=2), MovementType.RIGHT
    ) == stable_lane_connection_id(INTERSECTION_ID, UUID(int=1), UUID(int=2), MovementType.RIGHT)


def test_lane_direction_is_relative_to_the_connected_endpoint() -> None:
    city = CityCreate.model_validate(load_four_way_intersection())
    road = city.roads[0]
    intersection_at_a = city.intersections[0].model_copy(
        update={
            "id": UUID(int=99),
            "position": road.geometry.points[0],
            "connected_road_ids": [road.id],
        }
    )
    city = city.model_copy(update={"intersections": [*city.intersections, intersection_at_a]})
    network = build_lane_network(city)

    assert (
        lane_direction_relative_to_intersection(
            network, city.intersections[0].id, road.id, LaneDirection.FORWARD
        )
        == LaneRelativeDirection.INBOUND
    )
    assert (
        lane_direction_relative_to_intersection(
            network, intersection_at_a.id, road.id, LaneDirection.FORWARD
        )
        == LaneRelativeDirection.OUTBOUND
    )


def _network(
    roads: tuple[LaneNetworkRoad, ...],
    *,
    position: LaneNetworkPoint = LaneNetworkPoint(0, 0),
) -> CityLaneNetwork:
    return CityLaneNetwork(
        roads=roads,
        intersections=(
            LaneNetworkIntersection(
                id=INTERSECTION_ID,
                position=position,
                connected_road_ids=tuple(road.id for road in roads),
                connected_lane_ids=tuple(lane.id for road in roads for lane in road.lanes),
            ),
        ),
    )


def test_same_road_inbound_and_outbound_lanes_generate_only_uturn() -> None:
    road_id = UUID(int=10)
    inbound_id, outbound_id = UUID(int=101), UUID(int=102)
    city = _network(
        (
            LaneNetworkRoad(
                id=road_id,
                points=(LaneNetworkPoint(-10, 0), LaneNetworkPoint(0, 0)),
                lanes=(
                    LaneNetworkLane(inbound_id, 0, LaneDirection.FORWARD),
                    LaneNetworkLane(outbound_id, 1, LaneDirection.BACKWARD),
                ),
            ),
        )
    )

    result = generate_intersection_connections(city, INTERSECTION_ID)

    assert len(result.connections) == 1
    connection = result.connections[0]
    assert connection.maneuver == MovementType.U_TURN
    assert connection.from_road_id == connection.to_road_id == road_id
    assert connection.from_lane_id == inbound_id
    assert connection.to_lane_id == outbound_id


@pytest.mark.parametrize("target_at_start", [True, False])
def test_curved_road_uses_adjacent_junction_tangent(target_at_start: bool) -> None:
    incoming = LaneNetworkRoad(
        id=UUID(int=10),
        points=(
            LaneNetworkPoint(100, -100),
            LaneNetworkPoint(0, -10),
            LaneNetworkPoint(0, 0),
        ),
        lanes=(LaneNetworkLane(UUID(int=101), 0, LaneDirection.FORWARD),),
    )
    target_points = (
        LaneNetworkPoint(0, 0),
        LaneNetworkPoint(10, 0),
        LaneNetworkPoint(0, 100),
    )
    target = LaneNetworkRoad(
        id=UUID(int=20),
        points=target_points if target_at_start else tuple(reversed(target_points)),
        lanes=(
            LaneNetworkLane(
                UUID(int=201),
                0,
                LaneDirection.FORWARD if target_at_start else LaneDirection.BACKWARD,
            ),
        ),
    )

    result = generate_intersection_connections(_network((incoming, target)), INTERSECTION_ID)

    cross_road = [
        connection
        for connection in result.connections
        if connection.from_road_id == incoming.id and connection.to_road_id == target.id
    ]
    assert [connection.maneuver for connection in cross_road] == [MovementType.RIGHT]


def test_degenerate_adjacent_segment_is_skipped_safely() -> None:
    road = LaneNetworkRoad(
        id=UUID(int=10),
        points=(
            LaneNetworkPoint(-10, 0),
            LaneNetworkPoint(0, 0),
            LaneNetworkPoint(0, 0),
        ),
        lanes=(LaneNetworkLane(UUID(int=101), 0, LaneDirection.FORWARD),),
    )
    assert generate_intersection_connections(_network((road,)), INTERSECTION_ID).connections == ()
