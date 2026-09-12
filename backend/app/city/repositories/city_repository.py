"""Persistence access for the City aggregate.

Routes and services must not issue raw SQLAlchemy queries directly -- they
go through this module, which owns transaction boundaries and eager-loading
strategy.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.city.models.city import City
from app.city.models.intersection import Intersection
from app.city.models.road import Road
from app.city.models.traffic_light import TrafficLight
from app.city.repositories.city_builder import build_city
from app.city.schemas.city import CityCreate

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


def get_city(db: Session, city_id: UUID) -> City | None:
    stmt = select(City).where(City.id == city_id).options(*_CITY_LOAD_OPTIONS)
    return db.execute(stmt).unique().scalar_one_or_none()


def list_cities(db: Session, *, limit: int = 50, offset: int = 0) -> list[City]:
    """Lightweight listing -- does not eager-load nested collections."""
    stmt = select(City).order_by(City.created_at.desc()).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())
