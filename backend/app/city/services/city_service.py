"""Application/service layer for the City aggregate.

Coordinates validation, persistence, and retrieval. Routes call only this
module, never the repository or validator directly, so transaction and
validation behavior stays in one place.
"""

import json
from uuid import UUID

from sqlalchemy.orm import Session

from app.city.domain.enums import CyclewayType, LaneCountQuality, MedianType, ParkingLaneOrientation
from app.city.domain.geometry import Point, Polyline
from app.city.errors import CityValidationError
from app.city.repositories import city_repository, spatial_repository
from app.city.schemas.city import (
    CityCreate,
    CityMetadata,
    CityRead,
    CitySummary,
    CityValidationResult,
)
from app.city.schemas.import_city import CityImport
from app.city.schemas.intersection import IntersectionRead
from app.city.schemas.road import RoadRead
from app.city.schemas.spatial import BBox, MapLaneSummary, MapRoad
from app.city.services.city_mapper import to_city_read, to_intersection_read, to_road_read
from app.city.validators.city_validator import validate_city


def find_map_roads(db: Session, city_id: UUID, bbox: BBox, zoom: float) -> list[MapRoad] | None:
    if not city_repository.city_exists(db, city_id):
        return None
    rows = spatial_repository.find_map_roads(db, city_id, bbox, zoom)
    if len(rows) > 25000:
        raise ValueError("VIEWPORT_TOO_LARGE")
    return [
        MapRoad(
            id=row["id"],
            name=row["name"],
            road_type=row["road_type"],
            lane_count=row["lane_count"],
            geometry=Polyline(
                points=[
                    Point(x=lon, y=lat) for lon, lat in json.loads(row["geometry"])["coordinates"]
                ]
            ),
            width_m=row["width_m"],
            is_width_estimated=row["is_width_estimated"],
            carriageway_count=row["carriageway_count"],
            median=MedianType(row["median"]),
            level=row["level"],
            is_bridge=row["is_bridge"],
            is_tunnel=row["is_tunnel"],
            forward_lane_count=row["forward_lane_count"],
            backward_lane_count=row["backward_lane_count"],
            both_ways_lane_count=row["both_ways_lane_count"],
            lane_count_quality=LaneCountQuality(row["lane_count_quality"]),
            parking_left=ParkingLaneOrientation(row["parking_left"]),
            parking_right=ParkingLaneOrientation(row["parking_right"]),
            cycleway_left=CyclewayType(row["cycleway_left"]),
            cycleway_right=CyclewayType(row["cycleway_right"]),
            lanes=[
                MapLaneSummary.model_validate(lane)
                for lane in _parse_lane_details(row["lane_details"])
            ],
        )
        for row in rows
    ]


def _parse_lane_details(raw: object) -> list[dict]:
    """`lane_details` comes back from `json_agg` as either an already-
    decoded list (typical psycopg JSON handling) or a JSON string,
    depending on driver/column typing -- normalize both. `NULL` (a road
    with no lanes at all) becomes an empty list, never fabricated data.
    Re-sorted by the embedded `index` field: `json_agg` itself does not
    guarantee row order (see spatial_repository.find_map_roads)."""
    if raw is None:
        return []
    details = json.loads(raw) if isinstance(raw, str) else raw
    assert isinstance(details, list)
    return sorted(details, key=lambda lane: lane["index"])


def replace_imported_city(db: Session, payload: CityImport) -> None:
    from app.city.repositories.import_repository import replace_city

    if not payload.roads or not payload.intersections:
        raise ValueError("Refusing to replace a city with an empty network")
    issues = validate_city(payload)
    if issues:
        raise CityValidationError(issues)
    replace_city(db, payload)


def validate_city_payload(payload: CityCreate) -> CityValidationResult:
    issues = validate_city(payload)
    return CityValidationResult(valid=len(issues) == 0, issues=issues)


def create_city(db: Session, payload: CityCreate) -> CityRead:
    issues = validate_city(payload)
    if issues:
        raise CityValidationError(issues)

    city = city_repository.create_city(db, payload)
    return to_city_read(city)


def get_city(db: Session, city_id: UUID) -> CityRead | None:
    city = city_repository.get_city(db, city_id)
    if city is None:
        return None
    return to_city_read(city)


def list_cities(db: Session, *, limit: int = 50, offset: int = 0) -> list[CitySummary]:
    cities = city_repository.list_cities(db, limit=limit, offset=offset)
    return [CitySummary.model_validate(city) for city in cities]


def update_road_geometry(
    db: Session, city_id: UUID, road_id: UUID, geometry: Polyline
) -> RoadRead | None:
    """Replaces one road's polyline (e.g. a manual map-editor correction
    to imported OSM geometry). Structural validation (point count/bounds)
    is Pydantic's job via `Polyline`; returns None if the road doesn't
    exist under that city."""
    road = city_repository.update_road_geometry(db, city_id, road_id, geometry)
    if road is None:
        return None
    return to_road_read(road)


def find_roads_in_bbox(
    db: Session, city_id: UUID, bbox: BBox, zoom: float = 20
) -> list[RoadRead] | None:
    """Roads intersecting the viewport `bbox` -- the bbox-scoped
    counterpart to `get_city`'s full-city road list (see
    docs/city-model.md's viewport-loading architecture). `None` if the
    city doesn't exist at all (distinct from an empty list, which means
    the city exists but has nothing in that bbox)."""
    if not city_repository.city_exists(db, city_id):
        return None
    roads = spatial_repository.find_roads_in_bbox(db, city_id, bbox, zoom)
    if len(roads) > 10000:
        raise ValueError("VIEWPORT_TOO_LARGE")
    return [to_road_read(road) for road in roads]


def find_intersections_in_bbox(
    db: Session, city_id: UUID, bbox: BBox
) -> list[IntersectionRead] | None:
    """Intersections within the viewport `bbox`. `None` if the city
    doesn't exist (see `find_roads_in_bbox`)."""
    if not city_repository.city_exists(db, city_id):
        return None
    intersections = spatial_repository.find_intersections_in_bbox(db, city_id, bbox)
    if len(intersections) > 10000:
        raise ValueError("VIEWPORT_TOO_LARGE")
    traffic_light_by_intersection = spatial_repository.find_traffic_lights_by_intersection_ids(
        db, [i.id for i in intersections]
    )
    return [
        to_intersection_read(intersection, traffic_light_by_intersection)
        for intersection in intersections
    ]


def get_city_metadata(db: Session, city_id: UUID) -> CityMetadata | None:
    result = spatial_repository.get_metadata(db, city_id)
    if result is None:
        return None
    city, bounds, count = result
    return CityMetadata(
        **CitySummary.model_validate(city).model_dump(),
        description=city.description,
        bounds=bounds,
        road_count=count,
    )


def get_road(db: Session, city_id: UUID, road_id: UUID) -> RoadRead | None:
    road = spatial_repository.get_road(db, city_id, road_id)
    return to_road_read(road) if road is not None else None


def get_intersection(db: Session, city_id: UUID, intersection_id: UUID) -> IntersectionRead | None:
    intersection = spatial_repository.get_intersection(db, city_id, intersection_id)
    if intersection is None:
        return None
    lights = spatial_repository.find_traffic_lights_by_intersection_ids(db, [intersection_id])
    return to_intersection_read(intersection, lights)
