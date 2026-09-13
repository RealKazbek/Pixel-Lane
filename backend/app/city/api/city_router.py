from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.city.errors import CityValidationError
from app.city.schemas.city import CityCreate, CityRead, CitySummary, CityValidationResult
from app.city.schemas.intersection import IntersectionRead
from app.city.schemas.road import RoadGeometryUpdate, RoadRead
from app.city.schemas.spatial import BBox
from app.city.services import city_service
from app.db.session import get_db

router = APIRouter(prefix="/cities", tags=["city"])


def _parse_bbox(bbox: str) -> BBox:
    try:
        return BBox.parse_query_param(bbox)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Invalid bbox: {exc}",
        ) from exc


@router.post("/validate", response_model=CityValidationResult)
def validate_city(payload: CityCreate) -> CityValidationResult:
    """Validate a City payload without persisting anything."""
    return city_service.validate_city_payload(payload)


@router.post("", response_model=CityRead, status_code=status.HTTP_201_CREATED)
def create_city(payload: CityCreate, db: Session = Depends(get_db)) -> CityRead:
    """Validate then persist a City payload as a single transaction."""
    try:
        return city_service.create_city(db, payload)
    except CityValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"issues": [issue.model_dump() for issue in exc.issues]},
        ) from exc


@router.get("/{city_id}", response_model=CityRead)
def get_city(city_id: UUID, db: Session = Depends(get_db)) -> CityRead:
    city = city_service.get_city(db, city_id)
    if city is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    return city


@router.get("", response_model=list[CitySummary])
def list_cities(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[CitySummary]:
    return city_service.list_cities(db, limit=limit, offset=offset)


@router.get("/{city_id}/roads", response_model=list[RoadRead])
def get_roads_in_bbox(
    city_id: UUID,
    bbox: str = Query(..., description="minLon,minLat,maxLon,maxLat (WGS84 degrees)"),
    db: Session = Depends(get_db),
) -> list[RoadRead]:
    """Roads intersecting a viewport bbox -- the viewport-driven map's
    data source, in place of `GET /{city_id}` for cities large enough
    that loading everything at once wouldn't scale (see
    docs/city-model.md's viewport-loading architecture). Only returns
    results for WGS84 cities; a LOCAL_CARTESIAN city (no real geographic
    coordinates) always yields an empty list here, not an error."""
    parsed_bbox = _parse_bbox(bbox)
    roads = city_service.find_roads_in_bbox(db, city_id, parsed_bbox)
    if roads is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    return roads


@router.get("/{city_id}/intersections", response_model=list[IntersectionRead])
def get_intersections_in_bbox(
    city_id: UUID,
    bbox: str = Query(..., description="minLon,minLat,maxLon,maxLat (WGS84 degrees)"),
    db: Session = Depends(get_db),
) -> list[IntersectionRead]:
    """Intersections within a viewport bbox -- see `get_roads_in_bbox`."""
    parsed_bbox = _parse_bbox(bbox)
    intersections = city_service.find_intersections_in_bbox(db, city_id, parsed_bbox)
    if intersections is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    return intersections


@router.patch("/{city_id}/roads/{road_id}/geometry", response_model=RoadRead)
def update_road_geometry(
    city_id: UUID, road_id: UUID, payload: RoadGeometryUpdate, db: Session = Depends(get_db)
) -> RoadRead:
    """Replaces one road's polyline -- the persistence step behind the 2D
    map editor's "apply edits" action. Point-count/coordinate-bounds
    validation happens via `Polyline` itself; this never touches lanes,
    intersections, or anything else about the road."""
    road = city_service.update_road_geometry(db, city_id, road_id, payload.geometry)
    if road is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Road not found")
    return road
