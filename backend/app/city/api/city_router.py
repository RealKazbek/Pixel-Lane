from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.city.errors import CityValidationError
from app.city.schemas.city import CityCreate, CityRead, CitySummary, CityValidationResult
from app.city.services import city_service
from app.db.session import get_db

router = APIRouter(prefix="/cities", tags=["city"])


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
