"""Explicit conversion from City ORM models to API read schemas.

Kept explicit rather than relying on automatic `from_attributes` coercion
everywhere, since a few fields (geometry, positions, many-to-many id
lists, the derived intersection<->traffic-light link) need real
translation, not a 1:1 attribute copy.
"""

from uuid import UUID

from app.city.domain.enums import (
    CoordinateSystem,
    IntersectionControlType,
    LaneDirection,
    LaneType,
    MedianType,
    MovementType,
    ParkingSide,
    RoadType,
    TrafficRuleTargetType,
    TrafficRuleType,
    VehicleCategory,
)
from app.city.domain.geometry import Point, Polyline
from app.city.models.city import City
from app.city.models.intersection import Intersection
from app.city.models.lane import Lane
from app.city.models.parking import ParkingZone
from app.city.models.road import Road
from app.city.models.traffic_demand import TrafficDemand
from app.city.models.traffic_light import Phase, SignalGroup, TrafficLight
from app.city.models.traffic_rule import TrafficRule
from app.city.schemas.city import CityRead
from app.city.schemas.intersection import IntersectionRead
from app.city.schemas.lane import LaneRead
from app.city.schemas.parking import ParkingZoneRead
from app.city.schemas.road import RoadRead
from app.city.schemas.traffic_demand import TrafficDemandRead
from app.city.schemas.traffic_light import PhaseRead, SignalGroupRead, TrafficLightRead
from app.city.schemas.traffic_rule import TrafficRuleRead


def _to_lane_read(lane: Lane) -> LaneRead:
    return LaneRead(
        id=lane.id,
        road_id=lane.road_id,
        index=lane.index,
        direction=LaneDirection(lane.direction),
        allowed_movements=[MovementType(m) for m in lane.allowed_movements],
        lane_type=LaneType(lane.lane_type),
        speed_limit_kmh=lane.speed_limit_kmh,
    )


def to_road_read(road: Road) -> RoadRead:
    return RoadRead(
        id=road.id,
        city_id=road.city_id,
        name=road.name,
        road_type=RoadType(road.road_type),
        geometry=Polyline(points=[Point(**point) for point in road.geometry]),
        default_speed_limit_kmh=road.default_speed_limit_kmh,
        source_id=road.source_id,
        source_road_type=road.source_road_type,
        one_way=road.one_way,
        source_lane_count=road.source_lane_count,
        width_m=road.width_m,
        is_width_estimated=road.is_width_estimated,
        carriageway_count=road.carriageway_count,
        median=MedianType(road.median),
        level=road.level,
        is_bridge=road.is_bridge,
        is_tunnel=road.is_tunnel,
        lanes=[_to_lane_read(lane) for lane in road.lanes],
    )


def to_intersection_read(
    intersection: Intersection, traffic_light_by_intersection: dict[UUID, UUID]
) -> IntersectionRead:
    return IntersectionRead(
        id=intersection.id,
        city_id=intersection.city_id,
        position=Point(x=intersection.position_x, y=intersection.position_y),
        connected_road_ids=[road.id for road in intersection.connected_roads],
        connected_lane_ids=[lane.id for lane in intersection.connected_lanes],
        control_type=IntersectionControlType(intersection.control_type),
        traffic_light_id=traffic_light_by_intersection.get(intersection.id),
    )


def _to_signal_group_read(group: SignalGroup) -> SignalGroupRead:
    return SignalGroupRead(
        id=group.id,
        name=group.name,
        controlled_lane_ids=[lane.id for lane in group.controlled_lanes],
    )


def _to_phase_read(phase: Phase) -> PhaseRead:
    return PhaseRead(
        id=phase.id,
        name=phase.name,
        duration_seconds=phase.duration_seconds,
        green_signal_group_ids=[group.id for group in phase.green_signal_groups],
    )


def _to_traffic_light_read(light: TrafficLight) -> TrafficLightRead:
    return TrafficLightRead(
        id=light.id,
        city_id=light.city_id,
        intersection_id=light.intersection_id,
        signal_groups=[_to_signal_group_read(g) for g in light.signal_groups],
        phases=[_to_phase_read(p) for p in light.phases],
    )


def _to_traffic_rule_read(rule: TrafficRule) -> TrafficRuleRead:
    return TrafficRuleRead(
        id=rule.id,
        city_id=rule.city_id,
        rule_type=TrafficRuleType(rule.rule_type),
        target_type=TrafficRuleTargetType(rule.target_type),
        target_id=rule.target_id,
        movement=MovementType(rule.movement) if rule.movement else None,
        speed_limit_kmh=rule.speed_limit_kmh,
    )


def _to_parking_zone_read(parking: ParkingZone) -> ParkingZoneRead:
    return ParkingZoneRead(
        id=parking.id,
        city_id=parking.city_id,
        road_id=parking.road_id,
        lane_id=parking.lane_id,
        allowed=parking.allowed,
        side=ParkingSide(parking.side) if parking.side else None,
        capacity=parking.capacity,
    )


def _to_traffic_demand_read(demand: TrafficDemand) -> TrafficDemandRead:
    return TrafficDemandRead(
        id=demand.id,
        city_id=demand.city_id,
        source_intersection_id=demand.source_intersection_id,
        destination_intersection_id=demand.destination_intersection_id,
        movement=MovementType(demand.movement) if demand.movement else None,
        vehicles_per_hour=demand.vehicles_per_hour,
        time_interval=demand.time_interval,
        vehicle_category=VehicleCategory(demand.vehicle_category)
        if demand.vehicle_category
        else None,
    )


def to_city_read(city: City) -> CityRead:
    traffic_light_by_intersection = {
        light.intersection_id: light.id for light in city.traffic_lights
    }
    return CityRead(
        id=city.id,
        name=city.name,
        description=city.description,
        coordinate_system=CoordinateSystem(city.coordinate_system),
        created_at=city.created_at,
        updated_at=city.updated_at,
        roads=[to_road_read(road) for road in city.roads],
        intersections=[
            to_intersection_read(i, traffic_light_by_intersection) for i in city.intersections
        ],
        traffic_lights=[_to_traffic_light_read(light) for light in city.traffic_lights],
        traffic_rules=[_to_traffic_rule_read(rule) for rule in city.traffic_rules],
        parking_zones=[_to_parking_zone_read(p) for p in city.parking_zones],
        traffic_demands=[_to_traffic_demand_read(d) for d in city.traffic_demands],
    )
