"""Persistence access for the City aggregate.

Routes and services must not issue raw SQLAlchemy queries directly -- they
go through this module, which owns transaction boundaries and eager-loading
strategy.
"""

import uuid
from uuid import UUID

from geoalchemy2 import WKTElement
from sqlalchemy import and_, delete, exists, func, or_, select, update
from sqlalchemy.orm import Session, selectinload

from app.city.domain.geometry import WGS84_SRID, Polyline, polyline_to_wkt
from app.city.domain.limits import EDITOR_INTERSECTION_SNAP_TOLERANCE_M
from app.city.models.city import City
from app.city.models.intersection import Intersection
from app.city.models.lane import Lane
from app.city.models.lane_connection import LaneConnection
from app.city.models.road import Road
from app.city.models.traffic_light import TrafficLight
from app.city.models.traffic_rule import TrafficRule
from app.city.repositories.city_builder import build_city
from app.city.schemas.city import CityCreate
from app.city.schemas.lane_connection import LaneConnectionCreate
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
    selectinload(City.lane_connections),
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


def replace_lane_connections(
    db: Session, city_id: UUID, connections: list[LaneConnectionCreate]
) -> City | None:
    """Replace one city's explicit lane movements in one transaction."""
    city = get_city(db, city_id)
    if city is None:
        return None
    try:
        _apply_lane_connections(city, city_id, connections)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return get_city(db, city_id)


def _apply_lane_connections(
    city: City, city_id: UUID, connections: list[LaneConnectionCreate]
) -> None:
    city.lane_connections.clear()
    city.lane_connections.extend(
        LaneConnection(
            id=connection.id,
            city_id=city_id,
            intersection_id=connection.intersection_id,
            from_road_id=connection.from_road_id,
            from_lane_id=connection.from_lane_id,
            to_road_id=connection.to_road_id,
            to_lane_id=connection.to_lane_id,
            maneuver=connection.maneuver.value,
        )
        for connection in connections
    )
    city.updated_at = func.now()


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
        if properties.lane_allowed_movements is not None:
            lane.allowed_movements = [
                movement.value for movement in properties.lane_allowed_movements[index]
            ]
        configured_lanes.append(lane)
    # A lane added to an incident road must participate in the same explicit
    # junction topology, otherwise valid maneuver writes fail after reload.
    intersections = db.scalars(
        select(Intersection)
        .where(
            Intersection.city_id == city_id, Intersection.connected_roads.any(Road.id == road_id)
        )
        .options(selectinload(Intersection.connected_lanes))
    ).all()
    for intersection in intersections:
        intersection.connected_lanes = [
            lane for lane in intersection.connected_lanes if lane.road_id != road_id
        ] + configured_lanes
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
    road = _road_from_create(city_id, payload)
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


def _road_from_create(city_id: UUID, payload: RoadCreate) -> Road:
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
    return road


def delete_road(db: Session, city_id: UUID, road_id: UUID) -> bool:
    road = db.execute(
        select(Road).where(Road.id == road_id, Road.city_id == city_id)
    ).scalar_one_or_none()
    if road is None:
        return False
    road_lane_ids = {lane.id for lane in road.lanes}
    removed_intersection_ids: set[UUID] = set()
    for intersection in list(road.city.intersections):
        if road not in intersection.connected_roads:
            continue
        intersection.connected_roads = [
            connected for connected in intersection.connected_roads if connected.id != road_id
        ]
        intersection.connected_lanes = [
            lane for lane in intersection.connected_lanes if lane.id not in road_lane_ids
        ]
        # An intersection is derived from shared topology and is not useful
        # with fewer than two incident roads. Preserve it otherwise.
        if len(intersection.connected_roads) < 2:
            removed_intersection_ids.add(intersection.id)
            db.delete(intersection)

    # Most road-owned entities are protected by database ON DELETE CASCADE:
    # lanes, lane connections, markings/amenities, and signal associations.
    # TrafficRule targets are intentionally polymorphic and therefore have no
    # FK; remove rules targeting the road/its lanes, plus rules targeting an
    # intersection that topology cleanup removes.
    db.execute(
        delete(TrafficRule).where(
            TrafficRule.city_id == city_id,
            or_(
                and_(TrafficRule.target_type == "ROAD", TrafficRule.target_id == road_id),
                and_(
                    TrafficRule.target_type == "LANE",
                    TrafficRule.target_id.in_(road_lane_ids),
                ),
                and_(
                    TrafficRule.target_type.in_(["INTERSECTION", "MOVEMENT"]),
                    TrafficRule.target_id.in_(removed_intersection_ids),
                ),
            ),
        )
    )
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
    try:
        _apply_topology(db, city, city_id, payload)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return True


def _apply_topology(
    db: Session,
    city: City,
    city_id: UUID,
    payload: TopologyUpdate,
) -> None:
    roads = {road.id: road for road in city.roads}
    submitted_geometries = [road.geometry.points for road in payload.roads]
    for index, points in enumerate(submitted_geometries):
        if len(points) < 2 or any(
            ((left.x - right.x) ** 2 + (left.y - right.y) ** 2) ** 0.5 <= 1e-9
            for left, right in zip(points, points[1:], strict=False)
        ):
            raise ValueError(f"TOPOLOGY_DEGENERATE_ROAD:{index}")
        for other in submitted_geometries[index + 1 :]:
            if len(points) != len(other):
                continue
            direct = all(
                ((left.x - right.x) ** 2 + (left.y - right.y) ** 2) ** 0.5
                <= EDITOR_INTERSECTION_SNAP_TOLERANCE_M
                for left, right in zip(points, other, strict=True)
            )
            reverse = all(
                ((left.x - right.x) ** 2 + (left.y - right.y) ** 2) ** 0.5
                <= EDITOR_INTERSECTION_SNAP_TOLERANCE_M
                for left, right in zip(points, reversed(other), strict=True)
            )
            if direct or reverse:
                raise ValueError("TOPOLOGY_DUPLICATE_ROAD")
    for road_payload in payload.new_roads:
        if road_payload.id in roads:
            continue
        road = _road_from_create(city_id, road_payload)
        db.add(road)
        roads[road.id] = road
    db.flush()
    lanes = {lane.id: lane for road in roads.values() for lane in road.lanes}
    items = payload.intersections
    for index, left in enumerate(items):
        for right in items[index + 1 :]:
            distance = (
                (left.position.x - right.position.x) ** 2
                + (left.position.y - right.position.y) ** 2
            ) ** 0.5
            if distance <= EDITOR_INTERSECTION_SNAP_TOLERANCE_M:
                raise ValueError("TOPOLOGY_DUPLICATE_INTERSECTION")
    for update_payload in payload.roads:
        topology_road = roads.get(update_payload.id)
        if topology_road is None:
            raise ValueError("TOPOLOGY_ROAD_NOT_FOUND")
        topology_road.geometry = [point.model_dump() for point in update_payload.geometry.points]
    for intersection in list(city.intersections):
        db.delete(intersection)
    db.flush()
    for item in items:
        intersection = Intersection(
            id=item.id,
            city_id=city_id,
            position_x=item.position.x,
            position_y=item.position.y,
            control_type=item.control_type.value,
        )
        connected_roads = [roads.get(road_id) for road_id in item.connected_road_ids]
        if any(road is None for road in connected_roads):
            raise ValueError("TOPOLOGY_ROAD_NOT_FOUND")
        intersection.connected_roads = [road for road in connected_roads if road is not None]
        connected_lanes = [lanes.get(lane_id) for lane_id in item.connected_lane_ids]
        if any(lane is None for lane in connected_lanes):
            raise ValueError("TOPOLOGY_LANE_NOT_FOUND")
        if any(
            lane.road_id not in item.connected_road_ids
            for lane in connected_lanes
            if lane is not None
        ):
            raise ValueError("TOPOLOGY_LANE_ROAD_MISMATCH")
        intersection.connected_lanes = [lane for lane in connected_lanes if lane is not None]
        db.add(intersection)
    db.execute(update(City).where(City.id == city_id).values(updated_at=func.now()))


def replace_topology_and_lane_connections(
    db: Session,
    city_id: UUID,
    topology: TopologyUpdate,
    connections: list[LaneConnectionCreate],
) -> City | None:
    """Persist one editor topology change and its surviving maneuvers atomically."""
    city = get_city(db, city_id)
    if city is None:
        return None
    try:
        _apply_topology(db, city, city_id, topology)
        db.flush()
        _apply_lane_connections(city, city_id, connections)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return get_city(db, city_id)
