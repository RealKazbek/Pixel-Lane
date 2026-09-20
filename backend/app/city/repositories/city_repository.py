"""Persistence access for the City aggregate.

Routes and services must not issue raw SQLAlchemy queries directly -- they
go through this module, which owns transaction boundaries and eager-loading
strategy.
"""

import uuid
from uuid import UUID

from geoalchemy2 import WKTElement
from sqlalchemy import exists, func, select, update
from sqlalchemy.orm import Session, selectinload

from app.city.domain.geometry import WGS84_SRID, Polyline, polyline_to_wkt
from app.city.models.city import City
from app.city.models.intersection import Intersection
from app.city.models.lane import Lane
from app.city.models.road import Road
from app.city.models.traffic_light import TrafficLight
from app.city.repositories.city_builder import build_city
from app.city.schemas.city import CityCreate
from app.city.schemas.road import RoadCreate, RoadPropertiesUpdate
from app.city.schemas.topology import TopologyUpdate

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


def initialize_empty_city(db: Session, city_id: UUID, payload: CityCreate) -> City:
    """Install a fixture into an empty legacy placeholder atomically.

    This is intentionally narrower than imported-city replacement: it is
    only valid when the existing city has no child entities, and it supports
    LOCAL_CARTESIAN fixtures whose spatial mirrors are intentionally NULL.
    """
    existing = db.execute(select(City).where(City.id == city_id)).scalar_one_or_none()
    if existing is None:
        return create_city(db, payload)
    if (
        existing.roads
        or existing.intersections
        or existing.traffic_lights
        or existing.traffic_rules
        or existing.parking_zones
        or existing.traffic_demands
        or existing.bus_stops
        or existing.crosswalks
    ):
        return existing

    replacement = build_city(payload)
    try:
        db.delete(existing)
        db.flush()
        db.add(replacement)
        db.commit()
    except Exception:
        db.rollback()
        raise
    loaded = get_city(db, city_id)
    assert loaded is not None
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
    road.left_edge_marking = properties.left_edge_marking.value
    road.right_edge_marking = properties.right_edge_marking.value
    road.lane_boundary_markings = (
        [m.value for m in properties.lane_boundary_markings]
        if properties.lane_boundary_markings
        else None
    )
    existing_by_index = {lane.index: lane for lane in road.lanes}
    configured_lanes: list[Lane] = []
    for index, direction in enumerate(properties.lane_directions):
        lane = existing_by_index.get(index)
        if lane is None:
            lane = Lane(
                id=uuid.uuid4(),
                road_id=road.id,
                index=index,
                allowed_movements=[],
                lane_type="GENERAL",
            )
        lane.index = index
        lane.direction = direction.value
        configured_lanes.append(lane)
    road.lanes = configured_lanes
    db.execute(update(City).where(City.id == city_id).values(updated_at=func.now()))
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return road


def create_road(db: Session, city_id: UUID, payload: RoadCreate) -> Road | None:
    city = db.execute(select(City).where(City.id == city_id)).scalar_one_or_none()
    if city is None:
        return None
    road = Road(
        id=payload.id,
        city_id=city_id,
        name=payload.name,
        road_type=payload.road_type.value,
        geometry=[point.model_dump() for point in payload.geometry.points],
        default_speed_limit_kmh=payload.default_speed_limit_kmh,
        width_m=payload.width_m,
        is_width_estimated=payload.is_width_estimated,
        carriageway_count=payload.carriageway_count,
        median=payload.median.value,
        level=payload.level,
        is_bridge=payload.is_bridge,
        is_tunnel=payload.is_tunnel,
        lane_count_quality=payload.lane_count_quality.value,
        left_edge_marking=payload.left_edge_marking.value,
        right_edge_marking=payload.right_edge_marking.value,
        lane_boundary_markings=[m.value for m in payload.lane_boundary_markings]
        if payload.lane_boundary_markings is not None
        else None,
    )
    road.lanes = [
        Lane(
            id=lane.id,
            road_id=payload.id,
            index=lane.index,
            direction=lane.direction.value,
            allowed_movements=[movement.value for movement in lane.allowed_movements],
            lane_type=lane.lane_type.value,
            speed_limit_kmh=lane.speed_limit_kmh,
        )
        for lane in payload.lanes
    ]
    db.add(road)
    db.execute(update(City).where(City.id == city_id).values(updated_at=func.now()))
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    loaded = db.execute(
        select(Road).where(Road.id == payload.id).options(selectinload(Road.lanes))
    ).scalar_one()
    return loaded


def delete_road(db: Session, city_id: UUID, road_id: UUID) -> bool:
    road = db.execute(
        select(Road).where(Road.id == road_id, Road.city_id == city_id)
    ).scalar_one_or_none()
    if road is None:
        return False
    db.delete(road)
    db.execute(update(City).where(City.id == city_id).values(updated_at=func.now()))
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return True


def replace_topology(db: Session, city_id: UUID, payload: TopologyUpdate) -> bool:
    city = get_city(db, city_id)
    if city is None:
        return False
    roads = {road.id: road for road in city.roads}
    for update_payload in payload.roads:
        road = roads.get(update_payload.id)
        if road is None:
            raise ValueError("TOPOLOGY_ROAD_NOT_FOUND")
        road.geometry = [point.model_dump() for point in update_payload.geometry.points]
    for intersection in list(city.intersections):
        db.delete(intersection)
    db.flush()
    for item in payload.intersections:
        intersection = Intersection(
            id=item.id,
            city_id=city_id,
            position_x=item.position.x,
            position_y=item.position.y,
            control_type=item.control_type.value,
        )
        intersection.connected_roads = [roads[road_id] for road_id in item.connected_road_ids]
        db.add(intersection)
    db.execute(update(City).where(City.id == city_id).values(updated_at=func.now()))
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return True
