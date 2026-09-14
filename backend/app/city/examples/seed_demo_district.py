"""One-shot CLI to seed the Demo District into the database.

Run via `make seed-demo-city` (see the root Makefile), or directly:

    cd backend && source .venv/bin/activate
    python -m app.city.examples.seed_demo_district

Idempotent, mirroring `app.city.importers.osm.cli`'s pattern: the Demo
District has a fixed deterministic id (`DEMO_DISTRICT_CITY_ID`), so if it
already exists this reports it and exits without inserting anything again.
Not part of the FastAPI app's import graph -- only runs when explicitly
invoked.
"""

import sys

from app.city.errors import CityValidationError
from app.city.examples.demo_district import DEMO_DISTRICT_CITY_ID, build_demo_district
from app.city.services import city_service
from app.db.session import SessionLocal


def main() -> int:
    db = SessionLocal()
    try:
        existing = city_service.get_city(db, DEMO_DISTRICT_CITY_ID)
        if existing is not None:
            print(f"Demo District already seeded (city id: {existing.id})")
            return 0

        city = build_demo_district()
        try:
            created = city_service.create_city(db, city)
        except CityValidationError as exc:
            print("Demo District failed validation:")
            for issue in exc.issues:
                print(f"  - {issue.path}: {issue.message}")
            return 1

        print(f"Seeded Demo District (city id: {created.id})")
        print(f"Roads: {len(created.roads)}")
        print(f"Lanes: {sum(len(r.lanes) for r in created.roads)}")
        print(f"Intersections: {len(created.intersections)}")
        print(f"Traffic lights: {len(created.traffic_lights)}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
