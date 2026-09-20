from dataclasses import replace
from uuid import UUID

import pytest

from app.city.domain.enums import LaneDirection, MovementType
from app.city.domain.lane_connections import (
    LaneApproach,
    classify_maneuver,
    match_lane_approaches,
    stable_lane_connection_id,
)

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
