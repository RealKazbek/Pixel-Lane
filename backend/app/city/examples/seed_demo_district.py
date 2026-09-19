"""One-shot CLI to create the empty canonical Demo City.

Run via `make seed-demo-city` (see the root Makefile), or directly:

    cd backend && source .venv/bin/activate
    python -m app.city.examples.seed_demo_district

Idempotent: if the canonical Demo City already exists, this reports it and
exits without inserting or overwriting any roads.
Not part of the FastAPI app's import graph -- only runs when explicitly
invoked.
"""

import sys

from app.city.domain.enums import CoordinateSystem
from app.city.examples.demo_city import (
    DEMO_CITY_DESCRIPTION,
    DEMO_CITY_ID,
    DEMO_CITY_NAME,
)
from app.city.schemas.city import CityCreate
from app.city.services import city_service
from app.db.session import SessionLocal


def main() -> int:
    db = SessionLocal()
    try:
        existing = city_service.get_city(db, DEMO_CITY_ID)
        if existing is not None:
            print(f"Demo City already exists (city id: {existing.id})")
            return 0

        created = city_service.create_city(
            db,
            CityCreate(
                id=DEMO_CITY_ID,
                name=DEMO_CITY_NAME,
                description=DEMO_CITY_DESCRIPTION,
                coordinate_system=CoordinateSystem.LOCAL_CARTESIAN,
            ),
        )
        print(f"Created empty Demo City (city id: {created.id})")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
