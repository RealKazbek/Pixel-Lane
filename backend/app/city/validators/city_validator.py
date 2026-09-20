"""Cross-reference and business-rule validation for a City payload.

Pydantic already enforces structural validation (types, required fields,
ranges, list lengths) at the schema layer. This module adds the checks that
require looking across the whole payload: ID uniqueness and every
reference between entities. It is pure Python -- no database, no FastAPI --
so it is unit-testable on its own.
"""

from uuid import UUID

from app.city.domain.enums import MovementType, TrafficRuleTargetType
from app.city.schemas.city import CityCreate, ValidationIssue


def validate_city(city: CityCreate) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    seen_ids: set[UUID] = set()

    def register_id(entity_id: UUID, path: str) -> None:
        if entity_id in seen_ids:
            issues.append(
                ValidationIssue(
                    code="DUPLICATE_ID",
                    message=f"Duplicate id {entity_id} reused across the city payload",
                    path=path,
                )
            )
        seen_ids.add(entity_id)

    def check_no_duplicates(
        values: "list[UUID] | list[MovementType]", path: str, code: str, message: str
    ) -> None:
        if len(set(values)) != len(values):
            issues.append(ValidationIssue(code=code, message=message, path=path))

    register_id(city.id, "id")

    road_ids: set[UUID] = set()
    lane_ids: set[UUID] = set()
    lane_road: dict[UUID, UUID] = {}

    for ri, road in enumerate(city.roads):
        road_path = f"roads[{ri}]"
        register_id(road.id, f"{road_path}.id")
        road_ids.add(road.id)

        seen_indices: set[int] = set()
        for li, lane in enumerate(road.lanes):
            lane_path = f"{road_path}.lanes[{li}]"
            register_id(lane.id, f"{lane_path}.id")
            lane_ids.add(lane.id)
            lane_road[lane.id] = road.id

            if lane.index in seen_indices:
                issues.append(
                    ValidationIssue(
                        code="DUPLICATE_LANE_INDEX",
                        message=f"Lane index {lane.index} is used more than once on road {road.id}",
                        path=f"{lane_path}.index",
                    )
                )
            seen_indices.add(lane.index)

            check_no_duplicates(
                lane.allowed_movements,
                f"{lane_path}.allowed_movements",
                "DUPLICATE_MOVEMENT",
                "allowed_movements contains the same movement more than once",
            )

    intersection_ids: set[UUID] = set()
    for ii, intersection in enumerate(city.intersections):
        path = f"intersections[{ii}]"
        register_id(intersection.id, f"{path}.id")
        intersection_ids.add(intersection.id)

        check_no_duplicates(
            intersection.connected_road_ids,
            f"{path}.connected_road_ids",
            "DUPLICATE_REFERENCE",
            "connected_road_ids contains the same road more than once",
        )
        for rid in intersection.connected_road_ids:
            if rid not in road_ids:
                issues.append(
                    ValidationIssue(
                        code="UNKNOWN_ROAD_REFERENCE",
                        message=f"Intersection references unknown road {rid}",
                        path=f"{path}.connected_road_ids",
                    )
                )

        check_no_duplicates(
            intersection.connected_lane_ids,
            f"{path}.connected_lane_ids",
            "DUPLICATE_REFERENCE",
            "connected_lane_ids contains the same lane more than once",
        )
        for lid in intersection.connected_lane_ids:
            if lid not in lane_ids:
                issues.append(
                    ValidationIssue(
                        code="UNKNOWN_LANE_REFERENCE",
                        message=f"Intersection references unknown lane {lid}",
                        path=f"{path}.connected_lane_ids",
                    )
                )

    seen_connection_keys: set[tuple[UUID, UUID, UUID, MovementType]] = set()
    for ci, connection in enumerate(city.lane_connections):
        path = f"lane_connections[{ci}]"
        register_id(connection.id, f"{path}.id")
        connection_key = (
            connection.intersection_id,
            connection.from_lane_id,
            connection.to_lane_id,
            connection.maneuver,
        )
        if connection_key in seen_connection_keys:
            issues.append(
                ValidationIssue(
                    code="DUPLICATE_CONNECTION",
                    message="The same lane movement is repeated",
                    path=path,
                )
            )
        seen_connection_keys.add(connection_key)
        if connection.intersection_id not in intersection_ids:
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_INTERSECTION_REFERENCE",
                    message="Lane connection references unknown intersection",
                    path=f"{path}.intersection_id",
                )
            )
        if connection.from_road_id not in road_ids:
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_ROAD_REFERENCE",
                    message="Lane connection references unknown source road",
                    path=f"{path}.from_road_id",
                )
            )
        if connection.to_road_id not in road_ids:
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_ROAD_REFERENCE",
                    message="Lane connection references unknown target road",
                    path=f"{path}.to_road_id",
                )
            )
        if connection.from_lane_id not in lane_ids:
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_LANE_REFERENCE",
                    message="Lane connection references unknown source lane",
                    path=f"{path}.from_lane_id",
                )
            )
        elif lane_road.get(connection.from_lane_id) != connection.from_road_id:
            issues.append(
                ValidationIssue(
                    code="LANE_ROAD_MISMATCH",
                    message="Source lane does not belong to source road",
                    path=f"{path}.from_lane_id",
                )
            )
        if connection.to_lane_id not in lane_ids:
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_LANE_REFERENCE",
                    message="Lane connection references unknown target lane",
                    path=f"{path}.to_lane_id",
                )
            )
        elif lane_road.get(connection.to_lane_id) != connection.to_road_id:
            issues.append(
                ValidationIssue(
                    code="LANE_ROAD_MISMATCH",
                    message="Target lane does not belong to target road",
                    path=f"{path}.to_lane_id",
                )
            )

        found_intersection = next(
            (item for item in city.intersections if item.id == connection.intersection_id), None
        )
        if found_intersection is not None:
            if connection.from_road_id not in found_intersection.connected_road_ids:
                issues.append(
                    ValidationIssue(
                        code="CONNECTION_ROAD_NOT_AT_INTERSECTION",
                        message="Source road is not connected to the intersection",
                        path=f"{path}.from_road_id",
                    )
                )
            if connection.to_road_id not in found_intersection.connected_road_ids:
                issues.append(
                    ValidationIssue(
                        code="CONNECTION_ROAD_NOT_AT_INTERSECTION",
                        message="Target road is not connected to the intersection",
                        path=f"{path}.to_road_id",
                    )
                )
            if connection.from_lane_id not in found_intersection.connected_lane_ids:
                issues.append(
                    ValidationIssue(
                        code="CONNECTION_LANE_NOT_AT_INTERSECTION",
                        message="Source lane is not connected to the intersection",
                        path=f"{path}.from_lane_id",
                    )
                )
            if connection.to_lane_id not in found_intersection.connected_lane_ids:
                issues.append(
                    ValidationIssue(
                        code="CONNECTION_LANE_NOT_AT_INTERSECTION",
                        message="Target lane is not connected to the intersection",
                        path=f"{path}.to_lane_id",
                    )
                )

    traffic_light_ids: set[UUID] = set()
    intersections_with_light: set[UUID] = set()

    for ti, light in enumerate(city.traffic_lights):
        path = f"traffic_lights[{ti}]"
        register_id(light.id, f"{path}.id")
        traffic_light_ids.add(light.id)

        if light.intersection_id not in intersection_ids:
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_INTERSECTION_REFERENCE",
                    message=(
                        f"Traffic light references unknown intersection {light.intersection_id}"
                    ),
                    path=f"{path}.intersection_id",
                )
            )
        elif light.intersection_id in intersections_with_light:
            issues.append(
                ValidationIssue(
                    code="DUPLICATE_TRAFFIC_LIGHT",
                    message=f"Intersection {light.intersection_id} has more than one traffic light",
                    path=f"{path}.intersection_id",
                )
            )
        else:
            intersections_with_light.add(light.intersection_id)

        group_ids: set[UUID] = set()
        for gi, group in enumerate(light.signal_groups):
            group_path = f"{path}.signal_groups[{gi}]"
            register_id(group.id, f"{group_path}.id")
            group_ids.add(group.id)

            check_no_duplicates(
                group.controlled_lane_ids,
                f"{group_path}.controlled_lane_ids",
                "DUPLICATE_REFERENCE",
                "controlled_lane_ids contains the same lane more than once",
            )
            for lid in group.controlled_lane_ids:
                if lid not in lane_ids:
                    issues.append(
                        ValidationIssue(
                            code="UNKNOWN_LANE_REFERENCE",
                            message=f"Signal group references unknown lane {lid}",
                            path=f"{group_path}.controlled_lane_ids",
                        )
                    )

        for pi, phase in enumerate(light.phases):
            phase_path = f"{path}.phases[{pi}]"
            register_id(phase.id, f"{phase_path}.id")

            check_no_duplicates(
                phase.green_signal_group_ids,
                f"{phase_path}.green_signal_group_ids",
                "DUPLICATE_REFERENCE",
                "green_signal_group_ids contains the same signal group more than once",
            )
            for gid in phase.green_signal_group_ids:
                if gid not in group_ids:
                    issues.append(
                        ValidationIssue(
                            code="UNKNOWN_SIGNAL_GROUP_REFERENCE",
                            message=f"Phase references unknown signal group {gid}",
                            path=f"{phase_path}.green_signal_group_ids",
                        )
                    )

    for ii, intersection in enumerate(city.intersections):
        if (
            intersection.traffic_light_id is not None
            and intersection.traffic_light_id not in traffic_light_ids
        ):
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_TRAFFIC_LIGHT_REFERENCE",
                    message=(
                        f"Intersection references unknown traffic light "
                        f"{intersection.traffic_light_id}"
                    ),
                    path=f"intersections[{ii}].traffic_light_id",
                )
            )

    target_pools: dict[TrafficRuleTargetType, set[UUID]] = {
        TrafficRuleTargetType.ROAD: road_ids,
        TrafficRuleTargetType.LANE: lane_ids,
        TrafficRuleTargetType.INTERSECTION: intersection_ids,
        TrafficRuleTargetType.MOVEMENT: intersection_ids,
    }
    for ri, rule in enumerate(city.traffic_rules):
        path = f"traffic_rules[{ri}]"
        register_id(rule.id, f"{path}.id")

        if rule.target_id not in target_pools[rule.target_type]:
            issues.append(
                ValidationIssue(
                    code="INVALID_RULE_TARGET",
                    message=(
                        f"Traffic rule targets unknown {rule.target_type.value} {rule.target_id}"
                    ),
                    path=f"{path}.target_id",
                )
            )

    for pi, parking in enumerate(city.parking_zones):
        path = f"parking_zones[{pi}]"
        register_id(parking.id, f"{path}.id")

        if parking.road_id not in road_ids:
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_ROAD_REFERENCE",
                    message=f"Parking zone references unknown road {parking.road_id}",
                    path=f"{path}.road_id",
                )
            )
        if parking.lane_id is not None:
            if parking.lane_id not in lane_ids:
                issues.append(
                    ValidationIssue(
                        code="UNKNOWN_LANE_REFERENCE",
                        message=f"Parking zone references unknown lane {parking.lane_id}",
                        path=f"{path}.lane_id",
                    )
                )
            elif lane_road.get(parking.lane_id) != parking.road_id:
                issues.append(
                    ValidationIssue(
                        code="LANE_ROAD_MISMATCH",
                        message="Parking zone's lane does not belong to its road",
                        path=f"{path}.lane_id",
                    )
                )

    for si, stop in enumerate(city.bus_stops):
        path = f"bus_stops[{si}]"
        register_id(stop.id, f"{path}.id")

        if stop.road_id not in road_ids:
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_ROAD_REFERENCE",
                    message=f"Bus stop references unknown road {stop.road_id}",
                    path=f"{path}.road_id",
                )
            )

    for ci, crossing in enumerate(city.crosswalks):
        path = f"crosswalks[{ci}]"
        register_id(crossing.id, f"{path}.id")

        if crossing.road_id not in road_ids:
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_ROAD_REFERENCE",
                    message=f"Crosswalk references unknown road {crossing.road_id}",
                    path=f"{path}.road_id",
                )
            )

    for di, demand in enumerate(city.traffic_demands):
        path = f"traffic_demands[{di}]"
        register_id(demand.id, f"{path}.id")

        if demand.source_intersection_id not in intersection_ids:
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_INTERSECTION_REFERENCE",
                    message=(
                        f"Traffic demand references unknown source intersection "
                        f"{demand.source_intersection_id}"
                    ),
                    path=f"{path}.source_intersection_id",
                )
            )
        if demand.destination_intersection_id is not None:
            if demand.destination_intersection_id not in intersection_ids:
                issues.append(
                    ValidationIssue(
                        code="UNKNOWN_INTERSECTION_REFERENCE",
                        message=(
                            f"Traffic demand references unknown destination intersection "
                            f"{demand.destination_intersection_id}"
                        ),
                        path=f"{path}.destination_intersection_id",
                    )
                )
            elif demand.destination_intersection_id == demand.source_intersection_id:
                issues.append(
                    ValidationIssue(
                        code="INVALID_DEMAND_ENDPOINTS",
                        message="Traffic demand source and destination must differ",
                        path=f"{path}.destination_intersection_id",
                    )
                )

    return issues
