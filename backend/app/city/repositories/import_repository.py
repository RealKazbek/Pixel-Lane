"""Atomic replacement of an imported aggregate, serialized by city identity."""

from sqlalchemy import delete, text
from sqlalchemy.orm import Session

from app.city.models.city import City
from app.city.repositories.city_builder import build_city
from app.city.schemas.import_city import CityImport


def replace_city(db: Session, payload: CityImport) -> None:
    # Build before taking a lock or touching the existing city. FK cascades
    # and inserts occur in one transaction; readers see old or new data.
    replacement = build_city(payload)
    try:
        db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": payload.id.int % (2**63)})
        db.execute(delete(City).where(City.id == payload.id))
        db.add(replacement)
        db.flush()
        invalid = db.execute(
            text("""
            SELECT count(*) FROM roads WHERE city_id = :city_id
            AND (geom IS NULL OR NOT ST_IsValid(geom) OR ST_SRID(geom) <> 4326)
        """),
            {"city_id": payload.id},
        ).scalar_one()
        if invalid:
            raise ValueError("Imported roads contain invalid spatial geometry")
        db.commit()
    except Exception:
        db.rollback()
        raise
