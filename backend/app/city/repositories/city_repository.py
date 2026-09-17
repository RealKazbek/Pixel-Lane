"""Persistence access for the City aggregate.

Routes and services must not issue raw SQLAlchemy queries directly -- they
go through this module, which owns transaction boundaries and eager-loading
strategy.
"""

from uuid import UUID

from geoalchemy2 import WKTElement
from sqlalchemy import exists, func, select, update
from sqlalchemy.orm import Session, selectinload

from app.city.domain.geometry import WGS84_SRID, Polyline, polyline_to_wkt
from app.city.models.city import City
from app.city.models.intersection import Intersection
from app.city.models.road import Road
from app.city.models.traffic_light import TrafficLight
from app.city.repositories.city_builder import build_city
from app.city.schemas.city import CityCreate
from app.city.schemas.road import RoadPropertiesUpdate

# Eager-load every relationship a CityRead needs in a bounded number of
# queries (selectinload avoids both N+1 row-by-row lookups and a single
# giant JOIN across every table).
_CITY_LOAD_OPTIONS = (
    selectinload(City.roads).selectinload(Road.lanes),
    selectinload(City.intersections).selectinload(Intersection.connected_roads),
    selectinload(City.intersections).selectinload(Intersection.connected_lanes),
    selectinload(City.traffic_lights).selectinload(TrafficLight.signal_groups),
    selectinload(City.traffic_lights).selectinload(TrafficLight.phases),
    selectinload(City.traffic_rules),
    selectinload(City.parking_zones),
    selectinload(City.traffic_demands),
)


def create_city(db: Session, payload: CityCreate) -> City:
    """Persist a validated City payload as a single transaction.

    If anything fails (e.g. a database constraint), the transaction is
    rolled back and no partial city is left behind.
    """
    city = build_city(payload)
    try:
        db.add(city)
        db.commit()
    except Exception:
        db.rollback()
        raise

    city_id = city.id
    loaded = get_city(db, city_id)
    assert loaded is not None  # just persisted in this same transaction
    return loaded


def city_exists(db: Session, city_id: UUID) -> bool:
    """Cheap existence check for the bbox endpoints -- avoids loading
    the whole city (all roads/lanes/intersections) just to 404 or
    proceed with a spatially-scoped query."""
    stmt = select(exists().where(City.id == city_id))
    return bool(db.execute(stmt).scalar())


def get_city(db: Session, city_id: UUID) -> City | None:
    stmt = select(City).where(City.id == city_id).options(*_CITY_LOAD_OPTIONS)
    return db.execute(stmt).unique().scalar_one_or_none()


def list_cities(db: Session, *, limit: int = 50, offset: int = 0) -> list[City]:
    """Lightweight listing -- does not eager-load nested collections."""
    stmt = select(City).order_by(City.created_at.desc()).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())


def update_road_geometry(
    db: Session, city_id: UUID, road_id: UUID, geometry: Polyline
) -> Road | None:
    """Replaces one road's polyline in place (e.g. a manual map-editor
    correction). Returns the reloaded City, or None if the road doesn't
    exist under that city."""
    road = db.execute(
        select(Road).where(Road.id == road_id, Road.city_id == city_id)
    ).scalar_one_or_none()
    if road is None:
        return None

    road.geometry = [point.model_dump() for point in geometry.points]
    db.execute(update(City).where(City.id == city_id).values(updated_at=func.now()))
    # Keep the spatial mirror in sync -- see Road.geom's docstring. Only
    # WGS84 roads have one to begin with (None for LOCAL_CARTESIAN roads,
    # which have no `geom` to update).
    if road.geom is not None:
        # GeoAlchemy2's Geometry-typed column has a loose mypy signature
        # (SQLCoreOperations | WKBElement | None); assigning a WKTElement
        # for the ORM to write on flush is the documented usage.
        road.geom = WKTElement(polyline_to_wkt(geometry), srid=WGS84_SRID)  # type: ignore[assignment]
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return road


def update_road_properties(
    db: Session, city_id: UUID, road_id: UUID, properties: RoadPropertiesUpdate
) -> Road | None:
    road = db.execute(
        select(Road).where(Road.id == road_id, Road.city_id == city_id)
    ).scalar_one_or_none()
    if road is None:
        return None
    road.name = properties.name.strip()
    road.width_m = properties.width_m
    road.is_width_estimated = False
    db.execute(update(City).where(City.id == city_id).values(updated_at=func.now()))
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return road
