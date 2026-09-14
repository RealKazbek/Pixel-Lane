"""Orchestrates the OSM import: fetch -> normalize -> map -> validate ->
persist, using the City Model's own public service layer (never the
repository/validator directly -- see backend/app/city/README.md).
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.city.errors import CityValidationError
from app.city.importers.osm.client import fetch_drive_network
from app.city.importers.osm.errors import OsmMappingValidationError
from app.city.importers.osm.mapper import map_network_to_city
from app.city.importers.osm.normalization import extract_network
from app.city.schemas.city import CityRead
from app.city.services import city_service


@dataclass(frozen=True)
class ImportRequest:
    city_id: UUID
    city_name: str
    description: str | None
    center_lat: float
    center_lon: float
    radius_m: float


@dataclass(frozen=True)
class ImportOutcome:
    city: CityRead
    warnings: tuple[str, ...]
    already_imported: bool


def import_city_from_osm(db: Session, request: ImportRequest) -> ImportOutcome:
    """Idempotent: if `request.city_id` already exists, returns it as-is
    instead of fetching OSM data or inserting anything again."""
    existing = city_service.get_city(db, request.city_id)
    if existing is not None:
        return ImportOutcome(city=existing, warnings=(), already_imported=True)

    graph = fetch_drive_network(request.center_lat, request.center_lon, request.radius_m)
    network = extract_network(graph)
    mapping = map_network_to_city(
        network,
        city_id=request.city_id,
        city_name=request.city_name,
        description=request.description,
        imported_at=datetime.now(UTC),
        import_query={
            "center_lat": request.center_lat,
            "center_lon": request.center_lon,
            "radius_m": request.radius_m,
        },
    )

    try:
        city = city_service.create_city(db, mapping.city)
    except CityValidationError as exc:
        raise OsmMappingValidationError(
            [f"{issue.path}: {issue.message}" for issue in exc.issues]
        ) from exc

    return ImportOutcome(city=city, warnings=tuple(mapping.warnings), already_imported=False)
