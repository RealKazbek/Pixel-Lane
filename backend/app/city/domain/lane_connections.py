"""Deterministic lane-to-lane matching primitives.

Only immutable domain values enter this module. Pydantic and SQLAlchemy
translation belongs to the application/persistence layers.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from math import atan2, degrees, hypot
from uuid import UUID, uuid5

from app.city.domain.enums import LaneDirection, LaneRelativeDirection, MovementType

LANE_CONNECTION_NAMESPACE = UUID("9df7d638-67e1-5db6-8c0d-0c6c5a6c58b3")
GEOMETRY_EPSILON = 1e-9


@dataclass(frozen=True)
class LaneNetworkPoint:
    x: float
    y: float


@dataclass(frozen=True)
class LaneNetworkLane:
    id: UUID
    index: int
    direction: LaneDirection
    allowed_movements: tuple[MovementType, ...] = ()


@dataclass(frozen=True)
class LaneNetworkRoad:
    id: UUID
    points: tuple[LaneNetworkPoint, ...]
    lanes: tuple[LaneNetworkLane, ...]


@dataclass(frozen=True)
class LaneNetworkIntersection:
    id: UUID
    position: LaneNetworkPoint
    connected_road_ids: tuple[UUID, ...]
    connected_lane_ids: tuple[UUID, ...]


@dataclass(frozen=True)
class CityLaneNetwork:
    roads: tuple[LaneNetworkRoad, ...]
    intersections: tuple[LaneNetworkIntersection, ...]


@dataclass(frozen=True)
class LaneApproach:
    road_id: UUID
    lane_id: UUID
    lane_index: int
    direction: LaneDirection
    outward_bearing_deg: float
    allowed_movements: tuple[MovementType, ...] = ()


@dataclass(frozen=True)
class LaneConnectionValue:
    id: UUID
    intersection_id: UUID
    from_road_id: UUID
    from_lane_id: UUID
    to_road_id: UUID
    to_lane_id: UUID
    maneuver: MovementType


@dataclass(frozen=True)
class LaneMatchResult:
    connections: tuple[LaneConnectionValue, ...]
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

    connections: list[LaneConnectionValue] = []
    for source, target in zip(incoming_lanes, outgoing_lanes, strict=True):
        if source.lane_id == target.lane_id:
            continue
        maneuver = classify_maneuver(source.outward_bearing_deg, target.outward_bearing_deg)
        if source.allowed_movements and maneuver not in source.allowed_movements:
            continue
        connections.append(
            LaneConnectionValue(
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


def _road_approaches(city: CityLaneNetwork, intersection_id: UUID) -> tuple[LaneApproach, ...]:
    intersection = next(item for item in city.intersections if item.id == intersection_id)
    approaches: list[LaneApproach] = []
    connected_lanes = set(intersection.connected_lane_ids)
    for road in city.roads:
        if road.id not in intersection.connected_road_ids or len(road.points) < 2:
            continue
        first, last = road.points[0], road.points[-1]
        first_distance = hypot(first.x - intersection.position.x, first.y - intersection.position.y)
        last_distance = hypot(last.x - intersection.position.x, last.y - intersection.position.y)
        at_first = first_distance < last_distance
        endpoint = first if at_first else last
        adjacent = road.points[1] if at_first else road.points[-2]
        if hypot(adjacent.x - endpoint.x, adjacent.y - endpoint.y) <= GEOMETRY_EPSILON:
            continue
        outward_bearing = _bearing_from_intersection(endpoint.x, endpoint.y, adjacent.x, adjacent.y)
        for lane in road.lanes:
            if connected_lanes and lane.id not in connected_lanes:
                continue
            approaches.append(
                LaneApproach(
                    road_id=road.id,
                    lane_id=lane.id,
                    lane_index=lane.index,
                    direction=lane.direction,
                    outward_bearing_deg=outward_bearing,
                    allowed_movements=lane.allowed_movements,
                )
            )
    return tuple(approaches)


def generate_intersection_connections(
    city: CityLaneNetwork, intersection_id: UUID
) -> LaneMatchResult:
    """Generate all supported incoming-to-outgoing movements at one node."""
    approaches = _road_approaches(city, intersection_id)
    incoming = [
        approach for approach in approaches if _is_incoming(city, intersection_id, approach)
    ]
    outgoing = [
        approach for approach in approaches if not _is_incoming(city, intersection_id, approach)
    ]
    road_ids = sorted({approach.road_id for approach in approaches}, key=str)
    all_connections: list[LaneConnectionValue] = []
    warnings: list[str] = []
    for from_road_id in road_ids:
        for to_road_id in road_ids:
            from_lanes = tuple(lane for lane in incoming if lane.road_id == from_road_id)
            to_lanes = tuple(lane for lane in outgoing if lane.road_id == to_road_id)
            if not from_lanes or not to_lanes:
                continue
            result = match_lane_approaches(intersection_id, from_lanes, to_lanes)
            if from_road_id == to_road_id:
                all_connections.extend(
                    connection
                    for connection in result.connections
                    if connection.maneuver == MovementType.U_TURN
                )
            else:
                all_connections.extend(
                    connection
                    for connection in result.connections
                    if connection.maneuver != MovementType.U_TURN
                )
            warnings.extend(result.warnings)
    unique = {connection.id: connection for connection in all_connections}
    return LaneMatchResult(
        tuple(unique[key] for key in sorted(unique, key=str)), tuple(sorted(set(warnings)))
    )


def _is_incoming(city: CityLaneNetwork, intersection_id: UUID, approach: LaneApproach) -> bool:
    return (
        lane_direction_relative_to_intersection(
            city, intersection_id, approach.road_id, approach.direction
        )
        == LaneRelativeDirection.INBOUND
    )


def lane_direction_relative_to_intersection(
    city: CityLaneNetwork,
    intersection_id: UUID,
    road_id: UUID,
    direction: LaneDirection,
) -> LaneRelativeDirection | None:
    """Resolve a road-relative lane direction at one intersection."""
    intersection = next((item for item in city.intersections if item.id == intersection_id), None)
    road = next((item for item in city.roads if item.id == road_id), None)
    if intersection is None or road is None or len(road.points) < 2:
        return None
    if road_id not in intersection.connected_road_ids:
        return None
    first, last = road.points[0], road.points[-1]
    first_distance = hypot(first.x - intersection.position.x, first.y - intersection.position.y)
    last_distance = hypot(last.x - intersection.position.x, last.y - intersection.position.y)
    at_first = first_distance < last_distance
    inbound = direction == (LaneDirection.BACKWARD if at_first else LaneDirection.FORWARD)
    return LaneRelativeDirection.INBOUND if inbound else LaneRelativeDirection.OUTBOUND
