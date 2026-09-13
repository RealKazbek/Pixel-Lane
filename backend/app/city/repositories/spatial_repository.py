"""Bbox-scoped spatial queries against `Road.geom`/`Intersection.geom`.

Isolated from `city_repository.py` on purpose: this is the one module
allowed to reference PostGIS SQL functions (`ST_MakeEnvelope`,
`ST_Intersects`) directly, so that knowledge doesn't spread across the
repository layer. Callers (the service layer) only ever see ORM rows in,
Pydantic schemas out -- see `city_service.py`'s `find_roads_in_bbox`/
`find_intersections_in_bbox`.
"""

from uuid import UUID

from geoalchemy2.functions import ST_Intersects, ST_MakeEnvelope
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.city.domain.geometry import WGS84_SRID
from app.city.models.intersection import Intersection
from app.city.models.road import Road
from app.city.models.traffic_light import TrafficLight
from app.city.schemas.spatial import BBox


def _envelope(bbox: BBox):  # noqa: ANN202 -- returns a PostGIS function expression, not a plain type
    return ST_MakeEnvelope(bbox.min_lon, bbox.min_lat, bbox.max_lon, bbox.max_lat, WGS84_SRID)


def find_roads_in_bbox(db: Session, city_id: UUID, bbox: BBox) -> list[Road]:
    """Roads whose geometry intersects `bbox` at all (including roads that
    merely cross the boundary) -- an "intersects", not "fully contained",
    query, since a viewport edge case that misses a road crossing into
    view would be a worse user experience than one extra partial road.
    Roads with no `geom` (non-WGS84 cities, see Road.geom's docstring)
    never match, since a bbox query is only meaningful for real
    geographic coordinates."""
    stmt = (
        select(Road)
        .where(
            Road.city_id == city_id,
            Road.geom.isnot(None),
            ST_Intersects(Road.geom, _envelope(bbox)),
        )
        .options(selectinload(Road.lanes))
    )
    return list(db.execute(stmt).scalars().all())


def find_intersections_in_bbox(db: Session, city_id: UUID, bbox: BBox) -> list[Intersection]:
    """Intersections whose point geometry falls within `bbox`. A point is
    either inside the envelope or not -- there is no meaningful
    "crossing the boundary" case for a point the way there is for a
    line, so `ST_Intersects` and `ST_Within` are equivalent here;
    `ST_Intersects` is used for consistency with the road query and
    because it lets the same GiST index support both without a second
    predicate."""
    stmt = (
        select(Intersection)
        .where(
            Intersection.city_id == city_id,
            Intersection.geom.isnot(None),
            ST_Intersects(Intersection.geom, _envelope(bbox)),
        )
        .options(
            selectinload(Intersection.connected_roads),
            selectinload(Intersection.connected_lanes),
        )
    )
    return list(db.execute(stmt).scalars().all())


def find_traffic_lights_by_intersection_ids(
    db: Session, intersection_ids: list[UUID]
) -> dict[UUID, UUID]:
    """Maps `intersection_id -> traffic_light_id` for exactly the given
    intersections -- the same shape `city_mapper.to_intersection_read`
    already expects, kept small (not the whole city's traffic lights)
    since a viewport query only needs its own intersections' lights."""
    if not intersection_ids:
        return {}
    stmt = select(TrafficLight.intersection_id, TrafficLight.id).where(
        TrafficLight.intersection_id.in_(intersection_ids)
    )
    return {row[0]: row[1] for row in db.execute(stmt).all()}
