"""Translates a persisted City (backend's Pydantic `CityRead`) into the
Traffic Engine's own, framework-independent input contract.

This is the one place allowed to depend on both sides: the backend's City
schemas and the `pixel_lane_simulation.traffic` engine. The engine itself
must never import anything from `app.*` (see docs/architecture.md).
"""

from pixel_lane_simulation.traffic.models.inputs import (
    CityInput,
    IntersectionInput,
    LaneInput,
    PointInput,
    RoadInput,
    TrafficDemandInput,
)

from app.city.schemas.city import CityRead
from app.city.schemas.lane import LaneRead
from app.city.schemas.road import RoadRead


def _to_lane_input(lane: LaneRead) -> LaneInput:
    return LaneInput(
        id=lane.id,
        index=lane.index,
        direction=lane.direction.value,  # type: ignore[arg-type]
        speed_limit_kmh=lane.speed_limit_kmh,
    )


def _to_road_input(road: RoadRead) -> RoadInput:
    return RoadInput(
        id=road.id,
        name=road.name,
        geometry_points=tuple(PointInput(x=p.x, y=p.y) for p in road.geometry.points),
        # The engine already treats nonpositive speed as unknown and uses
        # its explicit analysis configuration; never persist that assumption.
        default_speed_limit_kmh=road.default_speed_limit_kmh or 0,
        lanes=tuple(_to_lane_input(lane) for lane in road.lanes),
    )


def to_engine_city_input(city: CityRead) -> CityInput:
    return CityInput(
        id=city.id,
        name=city.name,
        coordinate_system=city.coordinate_system.value,  # type: ignore[arg-type]
        roads=tuple(_to_road_input(road) for road in city.roads),
        intersections=tuple(
            IntersectionInput(
                id=intersection.id,
                position=PointInput(x=intersection.position.x, y=intersection.position.y),
                connected_road_ids=tuple(intersection.connected_road_ids),
            )
            for intersection in city.intersections
        ),
        traffic_demands=tuple(
            TrafficDemandInput(
                id=demand.id,
                source_intersection_id=demand.source_intersection_id,
                destination_intersection_id=demand.destination_intersection_id,
                vehicles_per_hour=demand.vehicles_per_hour,
            )
            for demand in city.traffic_demands
        ),
    )
