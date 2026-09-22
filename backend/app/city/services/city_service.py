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
from app.city.domain.lane_connections import generate_intersection_connections
from app.city.errors import CityValidationError
from app.city.examples.demo_district import DEMO_DISTRICT_CITY_ID, build_demo_district
from app.city.examples.editor_workspace import EDITOR_WORKSPACE_CITY_ID, build_editor_workspace
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
from app.city.schemas.lane import LaneRead
from app.city.schemas.lane_connection import (
    LaneConnectionCreate,
    LaneConnectionGenerationResult,
    LaneConnectionRead,
)
from app.city.schemas.road import RoadCreate, RoadPropertiesUpdate, RoadRead
from app.city.schemas.spatial import BBox, MapLaneSummary, MapRoad
from app.city.schemas.topology import TopologyUpdate, TopologyWithLaneConnectionsUpdate
from app.city.services.city_mapper import to_city_read, to_intersection_read, to_road_read
from app.city.validators.city_validator import validate_city
from app.city.validators.lane_connection_validator import (
    build_lane_network,
    to_lane_connection_create,
    validate_lane_connections,
    validate_road_direction_changes,
)


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


def get_or_create_demo_city(db: Session) -> CityRead:
    """Return the persisted Demo City, creating its fixture only once.

    The deterministic fixture identity is the lookup key.  In particular,
    this must not call ``create_city`` when the row already exists: startup
    and page loads are reads, not destructive re-seeds.
    """
    existing = get_city(db, DEMO_DISTRICT_CITY_ID)
    if existing is not None and (existing.roads or existing.intersections):
        return existing
    seed = build_demo_district()
    if existing is None:
        return create_city(db, seed)

    # A previous persistence attempt could have created the canonical row
    # before inserting its child entities. Only an entirely empty placeholder
    # may be initialized here; any non-empty city is user/database state and
    # must never be replaced on a read.
    initialized = city_repository.initialize_empty_city(db, DEMO_DISTRICT_CITY_ID, seed)
    return to_city_read(initialized)


def get_or_create_editor_workspace(db: Session) -> CityRead:
    existing = get_city(db, EDITOR_WORKSPACE_CITY_ID)
    if existing is not None:
        return existing
    return create_city(db, build_editor_workspace())


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


def update_road_properties(
    db: Session, city_id: UUID, road_id: UUID, properties: RoadPropertiesUpdate
) -> RoadRead | None:
    if not properties.name.strip():
        raise ValueError("ROAD_NAME_EMPTY")
    city = get_city(db, city_id)
    if city is None:
        return None
    candidate_roads = [
        road.model_copy(
            update={
                "lanes": [
                    lane.model_copy(update={"direction": properties.lane_directions[index]})
                    if index < len(properties.lane_directions)
                    else lane
                    for index, lane in enumerate(road.lanes)
                ]
            }
        )
        if road.id == road_id
        else road
        for road in city.roads
    ]
    candidate = city.model_copy(update={"roads": candidate_roads})
    issues = validate_road_direction_changes(candidate, road_id)
    if issues:
        raise CityValidationError(issues)
    road = city_repository.update_road_properties(db, city_id, road_id, properties)
    return to_road_read(road) if road is not None else None


def create_road(db: Session, city_id: UUID, road: RoadCreate) -> RoadRead | None:
    created = city_repository.create_road(db, city_id, road)
    return to_road_read(created) if created is not None else None


def delete_road(db: Session, city_id: UUID, road_id: UUID) -> bool:
    return city_repository.delete_road(db, city_id, road_id)


def replace_topology(db: Session, city_id: UUID, payload: TopologyUpdate) -> bool:
    return city_repository.replace_topology(db, city_id, payload)


def _topology_candidate(
    city: CityRead,
    city_id: UUID,
    payload: TopologyUpdate,
) -> CityRead:
    geometry_by_road = {road.id: road.geometry for road in payload.roads}
    roads = [
        road.model_copy(update={"geometry": geometry_by_road.get(road.id, road.geometry)})
        for road in city.roads
    ]
    existing_ids = {road.id for road in roads}
    roads.extend(
        RoadRead(
            city_id=city_id,
            **road.model_dump(exclude={"lanes"}),
            lanes=[LaneRead(road_id=road.id, **lane.model_dump()) for lane in road.lanes],
        )
        for road in payload.new_roads
        if road.id not in existing_ids
    )
    intersections = [
        IntersectionRead(city_id=city_id, **intersection.model_dump())
        for intersection in payload.intersections
    ]
    return city.model_copy(update={"roads": roads, "intersections": intersections})


def replace_topology_and_lane_connections(
    db: Session,
    city_id: UUID,
    payload: TopologyWithLaneConnectionsUpdate,
) -> CityRead | None:
    current = get_city(db, city_id)
    if current is None:
        return None
    candidate = _topology_candidate(current, city_id, payload.topology)
    issues = validate_lane_connections(candidate, payload.lane_connections)
    if issues:
        raise CityValidationError(issues)
    updated = city_repository.replace_topology_and_lane_connections(
        db,
        city_id,
        payload.topology,
        payload.lane_connections,
    )
    return to_city_read(updated) if updated is not None else None


def replace_lane_connections(
    db: Session, city_id: UUID, connections: list[LaneConnectionCreate]
) -> list[LaneConnectionRead] | None:
    city = get_city(db, city_id)
    if city is None:
        return None
    issues = validate_lane_connections(city, connections)
    if issues:
        raise CityValidationError(issues)
    updated = city_repository.replace_lane_connections(db, city_id, connections)
    if updated is None:
        return None
    return [
        LaneConnectionRead.model_validate(connection) for connection in updated.lane_connections
    ]


def auto_generate_lane_connections(
    db: Session, city_id: UUID
) -> LaneConnectionGenerationResult | None:
    city = get_city(db, city_id)
    if city is None:
        return None
    generated: list[LaneConnectionCreate] = []
    warnings: set[str] = set()
    network = build_lane_network(city)
    for intersection in city.intersections:
        result = generate_intersection_connections(network, intersection.id)
        generated.extend(to_lane_connection_create(item) for item in result.connections)
        warnings.update(result.warnings)
    persisted = replace_lane_connections(db, city_id, generated)
    assert persisted is not None
    return LaneConnectionGenerationResult(
        connections=persisted,
        warnings=sorted(warnings),
    )


def get_intersection(db: Session, city_id: UUID, intersection_id: UUID) -> IntersectionRead | None:
    intersection = spatial_repository.get_intersection(db, city_id, intersection_id)
    if intersection is None:
        return None
    lights = spatial_repository.find_traffic_lights_by_intersection_ids(db, [intersection_id])
    return to_intersection_read(intersection, lights)
