"""Application/service layer for the City aggregate.

Coordinates validation, persistence, and retrieval. Routes call only this
module, never the repository or validator directly, so transaction and
validation behavior stays in one place.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.city.domain.geometry import Polyline
from app.city.errors import CityValidationError
from app.city.repositories import city_repository, spatial_repository
from app.city.schemas.city import CityCreate, CityRead, CitySummary, CityValidationResult
from app.city.schemas.intersection import IntersectionRead
from app.city.schemas.road import RoadRead
from app.city.schemas.spatial import BBox
from app.city.services.city_mapper import to_city_read, to_intersection_read, to_road_read
from app.city.validators.city_validator import validate_city


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
    city = city_repository.update_road_geometry(db, city_id, road_id, geometry)
    if city is None:
        return None
    road = next((r for r in city.roads if r.id == road_id), None)
    assert road is not None  # just updated in this same transaction
    return to_road_read(road)


def find_roads_in_bbox(db: Session, city_id: UUID, bbox: BBox) -> list[RoadRead] | None:
    """Roads intersecting the viewport `bbox` -- the bbox-scoped
    counterpart to `get_city`'s full-city road list (see
    docs/city-model.md's viewport-loading architecture). `None` if the
    city doesn't exist at all (distinct from an empty list, which means
    the city exists but has nothing in that bbox)."""
    if not city_repository.city_exists(db, city_id):
        return None
    roads = spatial_repository.find_roads_in_bbox(db, city_id, bbox)
    return [to_road_read(road) for road in roads]


def find_intersections_in_bbox(
    db: Session, city_id: UUID, bbox: BBox
) -> list[IntersectionRead] | None:
    """Intersections within the viewport `bbox`. `None` if the city
    doesn't exist (see `find_roads_in_bbox`)."""
    if not city_repository.city_exists(db, city_id):
        return None
    intersections = spatial_repository.find_intersections_in_bbox(db, city_id, bbox)
    traffic_light_by_intersection = spatial_repository.find_traffic_lights_by_intersection_ids(
        db, [i.id for i in intersections]
    )
    return [
        to_intersection_read(intersection, traffic_light_by_intersection)
        for intersection in intersections
    ]
