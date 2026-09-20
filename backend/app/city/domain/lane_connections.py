"""Deterministic lane-to-lane matching primitives.

This module deliberately knows nothing about SQLAlchemy or FastAPI.  Roads and
lanes are reduced to approaches at an intersection, then explicit connection
records are generated from those semantic inputs.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from math import atan2, degrees, hypot
from uuid import UUID, uuid5

from app.city.domain.enums import LaneDirection, MovementType
from app.city.schemas.city import CityRead
from app.city.schemas.lane_connection import LaneConnectionCreate

LANE_CONNECTION_NAMESPACE = UUID("9df7d638-67e1-5db6-8c0d-0c6c5a6c58b3")


@dataclass(frozen=True)
class LaneApproach:
    road_id: UUID
    lane_id: UUID
    lane_index: int
    direction: LaneDirection
    outward_bearing_deg: float
    allowed_movements: tuple[MovementType, ...] = ()


@dataclass(frozen=True)
class LaneMatchResult:
    connections: tuple[LaneConnectionCreate, ...]
    warnings: tuple[str, ...] = ()


def stable_lane_connection_id(
    intersection_id: UUID,
    from_lane_id: UUID,
    to_lane_id: UUID,
    maneuver: MovementType,
) -> UUID:
    key = f"{intersection_id}:{from_lane_id}:{to_lane_id}:{maneuver.value}"
    return uuid5(LANE_CONNECTION_NAMESPACE, key)


def classify_maneuver(from_bearing_deg: float, to_bearing_deg: float) -> MovementType:
    """Classify a movement from approach-outward to departure-outward bearing."""
    delta = (to_bearing_deg - from_bearing_deg) % 360
    if delta < 30 or delta >= 330:
        return MovementType.U_TURN
    if 150 <= delta <= 210:
        return MovementType.STRAIGHT
    if delta < 150:
        return MovementType.LEFT
    return MovementType.RIGHT


def match_lane_approaches(
    intersection_id: UUID,
    incoming: Iterable[LaneApproach],
    outgoing: Iterable[LaneApproach],
) -> LaneMatchResult:
    """Match equal-sized lane groups without depending on render order."""
    incoming_lanes = sorted(incoming, key=lambda lane: (lane.lane_index, str(lane.lane_id)))
    outgoing_lanes = sorted(outgoing, key=lambda lane: (lane.lane_index, str(lane.lane_id)))
    if len(incoming_lanes) != len(outgoing_lanes):
        return LaneMatchResult((), ("UNSUPPORTED_ASYMMETRIC_LANE_COUNTS",))
    if not 1 <= len(incoming_lanes) <= 3:
        return LaneMatchResult((), ("UNSUPPORTED_LANE_COUNT",))

    connections: list[LaneConnectionCreate] = []
    for source, target in zip(incoming_lanes, outgoing_lanes, strict=True):
        maneuver = classify_maneuver(source.outward_bearing_deg, target.outward_bearing_deg)
        if source.allowed_movements and maneuver not in source.allowed_movements:
            continue
        connections.append(
            LaneConnectionCreate(
                id=stable_lane_connection_id(
                    intersection_id, source.lane_id, target.lane_id, maneuver
                ),
                intersection_id=intersection_id,
                from_road_id=source.road_id,
                from_lane_id=source.lane_id,
                to_road_id=target.road_id,
                to_lane_id=target.lane_id,
                maneuver=maneuver,
            )
        )
    return LaneMatchResult(tuple(connections))


def _bearing_from_intersection(
    intersection_x: float, intersection_y: float, point_x: float, point_y: float
) -> float:
    return (degrees(atan2(point_x - intersection_x, point_y - intersection_y)) + 360) % 360


def _road_approaches(city: CityRead, intersection_id: UUID) -> tuple[LaneApproach, ...]:
    intersection = next(item for item in city.intersections if item.id == intersection_id)
    approaches: list[LaneApproach] = []
    connected_lanes = set(intersection.connected_lane_ids)
    for road in city.roads:
        if road.id not in intersection.connected_road_ids:
            continue
        points = road.geometry.points
        first, last = points[0], points[-1]
        first_distance = hypot(first.x - intersection.position.x, first.y - intersection.position.y)
        last_distance = hypot(last.x - intersection.position.x, last.y - intersection.position.y)
        endpoint = first if first_distance <= last_distance else last
        outward_bearing = _bearing_from_intersection(
            intersection.position.x, intersection.position.y, endpoint.x, endpoint.y
        )
        for lane in road.lanes:
            if connected_lanes and lane.id not in connected_lanes:
                continue
            approaches.append(
                LaneApproach(
                    road_id=road.id,
                    lane_id=lane.id,
                    lane_index=lane.index,
                    direction=LaneDirection(lane.direction),
                    outward_bearing_deg=outward_bearing,
                    allowed_movements=tuple(
                        MovementType(value) for value in lane.allowed_movements
                    ),
                )
            )
    return tuple(approaches)


def generate_intersection_connections(city: CityRead, intersection_id: UUID) -> LaneMatchResult:
    """Generate all supported incoming-to-outgoing movements at one node."""
    approaches = _road_approaches(city, intersection_id)
    incoming = [
        approach for approach in approaches if _is_incoming(city, intersection_id, approach)
    ]
    outgoing = [
        approach for approach in approaches if not _is_incoming(city, intersection_id, approach)
    ]
    road_ids = sorted({approach.road_id for approach in approaches}, key=str)
    all_connections: list[LaneConnectionCreate] = []
    warnings: list[str] = []
    for from_road_id in road_ids:
        for to_road_id in road_ids:
            if from_road_id == to_road_id:
                continue
            result = match_lane_approaches(
                intersection_id,
                (lane for lane in incoming if lane.road_id == from_road_id),
                (lane for lane in outgoing if lane.road_id == to_road_id),
            )
            all_connections.extend(result.connections)
            warnings.extend(result.warnings)
    unique = {connection.id: connection for connection in all_connections}
    return LaneMatchResult(
        tuple(unique[key] for key in sorted(unique, key=str)), tuple(sorted(set(warnings)))
    )


def _is_incoming(city: CityRead, intersection_id: UUID, approach: LaneApproach) -> bool:
    intersection = next(item for item in city.intersections if item.id == intersection_id)
    road = next(item for item in city.roads if item.id == approach.road_id)
    first, last = road.geometry.points[0], road.geometry.points[-1]
    at_first = hypot(first.x - intersection.position.x, first.y - intersection.position.y) <= hypot(
        last.x - intersection.position.x, last.y - intersection.position.y
    )
    return approach.direction == (LaneDirection.BACKWARD if at_first else LaneDirection.FORWARD)
