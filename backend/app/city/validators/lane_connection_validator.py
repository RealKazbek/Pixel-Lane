"""Validation for lane connections against an existing City document."""

from uuid import UUID

from app.city.domain.enums import LaneRelativeDirection
from app.city.domain.lane_connections import lane_direction_relative_to_intersection
from app.city.schemas.city import CityRead, ValidationIssue
from app.city.schemas.lane_connection import LaneConnectionCreate


def validate_lane_connections(
    city: CityRead, connections: list[LaneConnectionCreate]
) -> list[ValidationIssue]:
    road_ids = {road.id for road in city.roads}
    lane_road = {lane.id: road.id for road in city.roads for lane in road.lanes}
    intersection_by_id = {intersection.id: intersection for intersection in city.intersections}
    seen_ids: set[UUID] = set()
    seen_keys: set[tuple[UUID, UUID, UUID, str]] = set()
    issues: list[ValidationIssue] = []

    for index, connection in enumerate(connections):
        path = f"connections[{index}]"
        if connection.id in seen_ids:
            issues.append(
                ValidationIssue(
                    code="DUPLICATE_ID",
                    message="Connection id is repeated",
                    path=f"{path}.id",
                )
            )
        seen_ids.add(connection.id)

        key = (
            connection.intersection_id,
            connection.from_lane_id,
            connection.to_lane_id,
            connection.maneuver.value,
        )
        if key in seen_keys:
            issues.append(
                ValidationIssue(
                    code="DUPLICATE_CONNECTION",
                    message="The same lane movement is repeated",
                    path=path,
                )
            )
        seen_keys.add(key)

        intersection = intersection_by_id.get(connection.intersection_id)
        if intersection is None:
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_INTERSECTION_REFERENCE",
                    message="Lane connection references an unknown intersection",
                    path=f"{path}.intersection_id",
                )
            )
            continue

        if connection.from_road_id not in road_ids:
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_ROAD_REFERENCE",
                    message="Source road does not exist in the city",
                    path=f"{path}.from_road_id",
                )
            )
        if connection.to_road_id not in road_ids:
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_ROAD_REFERENCE",
                    message="Target road does not exist in the city",
                    path=f"{path}.to_road_id",
                )
            )

        for lane_id, road_id, field_name in (
            (connection.from_lane_id, connection.from_road_id, "from_lane_id"),
            (connection.to_lane_id, connection.to_road_id, "to_lane_id"),
        ):
            if lane_id not in lane_road:
                issues.append(
                    ValidationIssue(
                        code="UNKNOWN_LANE_REFERENCE",
                        message="Lane does not exist in the city",
                        path=f"{path}.{field_name}",
                    )
                )
            elif lane_road[lane_id] != road_id:
                issues.append(
                    ValidationIssue(
                        code="LANE_ROAD_MISMATCH",
                        message="Lane does not belong to the referenced road",
                        path=f"{path}.{field_name}",
                    )
                )
            elif lane_id not in intersection.connected_lane_ids:
                issues.append(
                    ValidationIssue(
                        code="CONNECTION_LANE_NOT_AT_INTERSECTION",
                        message="Lane is not connected to the referenced intersection",
                        path=f"{path}.{field_name}",
                    )
                )

        from_road = next((road for road in city.roads if road.id == connection.from_road_id), None)
        from_lane_model = next(
            (
                lane
                for road in city.roads
                if road.id == connection.from_road_id
                for lane in road.lanes
                if lane.id == connection.from_lane_id
            ),
            None,
        )
        to_lane_model = next(
            (
                lane
                for road in city.roads
                if road.id == connection.to_road_id
                for lane in road.lanes
                if lane.id == connection.to_lane_id
            ),
            None,
        )
        if from_road is not None and from_lane_model is not None:
            if (
                lane_direction_relative_to_intersection(
                    city,
                    connection.intersection_id,
                    connection.from_road_id,
                    from_lane_model.direction,
                )
                != LaneRelativeDirection.INBOUND
            ):
                issues.append(
                    ValidationIssue(
                        code="CONNECTION_SOURCE_NOT_INBOUND",
                        message="Connection source lane must enter the intersection",
                        path=f"{path}.from_lane_id",
                    )
                )
        if to_lane_model is not None:
            if (
                lane_direction_relative_to_intersection(
                    city,
                    connection.intersection_id,
                    connection.to_road_id,
                    to_lane_model.direction,
                )
                != LaneRelativeDirection.OUTBOUND
            ):
                issues.append(
                    ValidationIssue(
                        code="CONNECTION_TARGET_NOT_OUTBOUND",
                        message="Connection target lane must leave the intersection",
                        path=f"{path}.to_lane_id",
                    )
                )

        if connection.from_road_id not in intersection.connected_road_ids:
            issues.append(
                ValidationIssue(
                    code="CONNECTION_ROAD_NOT_AT_INTERSECTION",
                    message="Source road is not connected to the intersection",
                    path=f"{path}.from_road_id",
                )
            )
        if connection.to_road_id not in intersection.connected_road_ids:
            issues.append(
                ValidationIssue(
                    code="CONNECTION_ROAD_NOT_AT_INTERSECTION",
                    message="Target road is not connected to the intersection",
                    path=f"{path}.to_road_id",
                )
            )

    return issues


def validate_road_direction_changes(city: CityRead, road_id: UUID) -> list[ValidationIssue]:
    """Validate only persisted movements affected by a road direction edit."""
    issues: list[ValidationIssue] = []
    for index, connection in enumerate(city.lane_connections):
        if connection.from_road_id != road_id and connection.to_road_id != road_id:
            continue
        intersection = next(
            (item for item in city.intersections if item.id == connection.intersection_id),
            None,
        )
        from_road = next((road for road in city.roads if road.id == connection.from_road_id), None)
        to_road = next((road for road in city.roads if road.id == connection.to_road_id), None)
        from_lane = next(
            (
                lane
                for road in city.roads
                for lane in road.lanes
                if lane.id == connection.from_lane_id
            ),
            None,
        )
        to_lane = next(
            (
                lane
                for road in city.roads
                for lane in road.lanes
                if lane.id == connection.to_lane_id
            ),
            None,
        )
        if not intersection or not from_road or not to_road or not from_lane or not to_lane:
            continue
        path = f"connections[{index}]"
        if (
            lane_direction_relative_to_intersection(
                city, intersection.id, from_road.id, from_lane.direction
            )
            != LaneRelativeDirection.INBOUND
        ):
            issues.append(
                ValidationIssue(
                    code="CONNECTION_SOURCE_NOT_INBOUND",
                    message="Connection source lane must enter the intersection",
                    path=f"{path}.from_lane_id",
                )
            )
        if (
            lane_direction_relative_to_intersection(
                city, intersection.id, to_road.id, to_lane.direction
            )
            != LaneRelativeDirection.OUTBOUND
        ):
            issues.append(
                ValidationIssue(
                    code="CONNECTION_TARGET_NOT_OUTBOUND",
                    message="Connection target lane must leave the intersection",
                    path=f"{path}.to_lane_id",
                )
            )
    return issues
