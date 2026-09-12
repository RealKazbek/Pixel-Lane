"""Application/service layer for the City aggregate.

Coordinates validation, persistence, and retrieval. Routes call only this
module, never the repository or validator directly, so transaction and
validation behavior stays in one place.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.city.errors import CityValidationError
from app.city.repositories import city_repository
from app.city.schemas.city import CityCreate, CityRead, CitySummary, CityValidationResult
from app.city.services.city_mapper import to_city_read
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
