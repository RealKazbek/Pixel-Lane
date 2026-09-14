"""Builds an unpersisted City ORM object graph from a validated CityCreate.

Assumes the payload has already passed
`app.city.validators.city_validator.validate_city` -- reference integrity
is not re-checked here, only translated into ORM relationships.
"""

from uuid import UUID

from geoalchemy2 import WKTElement

from app.city.domain.enums import CoordinateSystem
from app.city.domain.geometry import WGS84_SRID, point_to_wkt, polyline_to_wkt
from app.city.models.bus_stop import BusStop
from app.city.models.city import City
from app.city.models.crosswalk import Crosswalk
from app.city.models.intersection import Intersection
from app.city.models.lane import Lane
from app.city.models.parking import ParkingZone
from app.city.models.road import Road
from app.city.models.traffic_demand import TrafficDemand
from app.city.models.traffic_light import Phase, SignalGroup, TrafficLight
from app.city.models.traffic_rule import TrafficRule
from app.city.schemas.city import CityCreate


def build_city(payload: CityCreate) -> City:
    # Only WGS84 cities have coordinates that are real geographic
    # positions -- LOCAL_CARTESIAN coordinates (e.g. the four-way-
    # intersection example) would produce nonsensical "geometry" if
    # stamped with SRID 4326, so `geom` stays NULL for them (see
    # Road.geom's/Intersection.geom's docstrings).
    is_wgs84 = payload.coordinate_system == CoordinateSystem.WGS84
    lanes_by_id: dict[UUID, Lane] = {}
    roads_by_id: dict[UUID, Road] = {}
    intersections_by_id: dict[UUID, Intersection] = {}

    roads = []
    for road_data in payload.roads:
        lanes = [
            Lane(
                id=lane_data.id,
                index=lane_data.index,
                direction=lane_data.direction.value,
                allowed_movements=[m.value for m in lane_data.allowed_movements],
                lane_type=lane_data.lane_type.value,
                speed_limit_kmh=lane_data.speed_limit_kmh,
                allowed_turns=(
                    [t.value for t in lane_data.allowed_turns]
                    if lane_data.allowed_turns is not None
                    else None
                ),
                lane_change=lane_data.lane_change.value if lane_data.lane_change else None,
            )
            for lane_data in road_data.lanes
        ]
        road = Road(
            id=road_data.id,
            name=road_data.name,
            road_type=road_data.road_type.value,
            geometry=[p.model_dump() for p in road_data.geometry.points],
            geom=(
                WKTElement(polyline_to_wkt(road_data.geometry), srid=WGS84_SRID)
                if is_wgs84
                else None
            ),
            default_speed_limit_kmh=road_data.default_speed_limit_kmh,
            source_id=road_data.source_id,
            source_road_type=road_data.source_road_type,
            one_way=road_data.one_way,
            source_lane_count=road_data.source_lane_count,
            width_m=road_data.width_m,
            is_width_estimated=road_data.is_width_estimated,
            carriageway_count=road_data.carriageway_count,
            median=road_data.median.value,
            level=road_data.level,
            is_bridge=road_data.is_bridge,
            is_tunnel=road_data.is_tunnel,
            forward_lane_count=road_data.forward_lane_count,
            backward_lane_count=road_data.backward_lane_count,
            both_ways_lane_count=road_data.both_ways_lane_count,
            lane_count_quality=road_data.lane_count_quality.value,
            parking_left=road_data.parking_left.value,
            parking_right=road_data.parking_right.value,
            cycleway_left=road_data.cycleway_left.value,
            cycleway_right=road_data.cycleway_right.value,
            lanes=lanes,
        )
        roads.append(road)
        roads_by_id[road.id] = road
        for lane, lane_data in zip(lanes, road_data.lanes, strict=True):
            lanes_by_id[lane_data.id] = lane

    intersections = []
    for intersection_data in payload.intersections:
        intersection = Intersection(
            id=intersection_data.id,
            position_x=intersection_data.position.x,
            position_y=intersection_data.position.y,
            geom=(
                WKTElement(point_to_wkt(intersection_data.position), srid=WGS84_SRID)
                if is_wgs84
                else None
            ),
            control_type=intersection_data.control_type.value,
            connected_roads=[roads_by_id[rid] for rid in intersection_data.connected_road_ids],
            connected_lanes=[lanes_by_id[lid] for lid in intersection_data.connected_lane_ids],
        )
        intersections.append(intersection)
        intersections_by_id[intersection.id] = intersection

    traffic_lights = []
    for light_data in payload.traffic_lights:
        signal_groups_by_id: dict[UUID, SignalGroup] = {}
        signal_groups = []
        for group_data in light_data.signal_groups:
            group = SignalGroup(
                id=group_data.id,
                name=group_data.name,
                controlled_lanes=[lanes_by_id[lid] for lid in group_data.controlled_lane_ids],
            )
            signal_groups.append(group)
            signal_groups_by_id[group.id] = group

        phases = [
            Phase(
                id=phase_data.id,
                name=phase_data.name,
                duration_seconds=phase_data.duration_seconds,
                green_signal_groups=[
                    signal_groups_by_id[gid] for gid in phase_data.green_signal_group_ids
                ],
            )
            for phase_data in light_data.phases
        ]

        traffic_lights.append(
            TrafficLight(
                id=light_data.id,
                intersection=intersections_by_id[light_data.intersection_id],
                signal_groups=signal_groups,
                phases=phases,
            )
        )

    traffic_rules = [
        TrafficRule(
            id=rule_data.id,
            rule_type=rule_data.rule_type.value,
            target_type=rule_data.target_type.value,
            target_id=rule_data.target_id,
            movement=rule_data.movement.value if rule_data.movement else None,
            speed_limit_kmh=rule_data.speed_limit_kmh,
        )
        for rule_data in payload.traffic_rules
    ]

    # Cross-aggregate references (parking -> road/lane, demand ->
    # intersections) are assigned via the relationship object, not the raw
    # FK column, so SQLAlchemy's unit of work knows to insert the
    # referenced row first.
    parking_zones = [
        ParkingZone(
            id=parking_data.id,
            road=roads_by_id[parking_data.road_id],
            lane=lanes_by_id[parking_data.lane_id] if parking_data.lane_id else None,
            allowed=parking_data.allowed,
            side=parking_data.side.value if parking_data.side else None,
            capacity=parking_data.capacity,
        )
        for parking_data in payload.parking_zones
    ]

    traffic_demands = [
        TrafficDemand(
            id=demand_data.id,
            source_intersection=intersections_by_id[demand_data.source_intersection_id],
            destination_intersection=(
                intersections_by_id[demand_data.destination_intersection_id]
                if demand_data.destination_intersection_id
                else None
            ),
            movement=demand_data.movement.value if demand_data.movement else None,
            vehicles_per_hour=demand_data.vehicles_per_hour,
            time_interval=demand_data.time_interval,
            vehicle_category=(
                demand_data.vehicle_category.value if demand_data.vehicle_category else None
            ),
        )
        for demand_data in payload.traffic_demands
    ]

    bus_stops = [
        BusStop(
            id=stop_data.id,
            road=roads_by_id[stop_data.road_id],
            position_x=stop_data.position_x,
            position_y=stop_data.position_y,
            name=stop_data.name,
        )
        for stop_data in payload.bus_stops
    ]

    crosswalks = [
        Crosswalk(
            id=crossing_data.id,
            road=roads_by_id[crossing_data.road_id],
            position_ratio=crossing_data.position_ratio,
        )
        for crossing_data in payload.crosswalks
    ]

    return City(
        id=payload.id,
        name=payload.name,
        description=payload.description,
        coordinate_system=payload.coordinate_system.value,
        import_source=payload.import_source,
        imported_at=payload.imported_at,
        import_query=payload.import_query,
        roads=roads,
        intersections=intersections,
        traffic_lights=traffic_lights,
        traffic_rules=traffic_rules,
        parking_zones=parking_zones,
        traffic_demands=traffic_demands,
        bus_stops=bus_stops,
        crosswalks=crosswalks,
    )
