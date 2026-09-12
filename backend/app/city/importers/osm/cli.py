"""One-shot CLI for importing the Almaty OSM demo city.

Run via `make import-almaty` (see the root Makefile), or directly:

    cd backend && source .venv/bin/activate
    python -m app.city.importers.osm.cli

Not part of the FastAPI app's import graph -- this only runs when
explicitly invoked (see AGENTS.md's dependency-isolation rule).

This inlines the fetch/normalize/map/validate/save pipeline (rather than
calling `importer.import_city_from_osm`) purely to print progress between
steps; `import_city_from_osm` stays the importable, silent library API for
other callers (e.g. tests, a future non-CLI caller).
"""

import sys

from sqlalchemy.exc import OperationalError

from app.city.errors import CityValidationError
from app.city.importers.osm import (
    ALMATY_DEMO_CENTER_LAT,
    ALMATY_DEMO_CENTER_LON,
    ALMATY_DEMO_CITY_ID,
    ALMATY_DEMO_CITY_NAME,
    ALMATY_DEMO_DESCRIPTION,
    ALMATY_DEMO_RADIUS_M,
)
from app.city.importers.osm.client import fetch_drive_network
from app.city.importers.osm.errors import OsmImportError
from app.city.importers.osm.mapper import map_network_to_city
from app.city.importers.osm.normalization import extract_network
from app.city.services import city_service
from app.db.session import SessionLocal

_MAX_WARNINGS_PRINTED = 15


def _print_summary(city, warnings: list[str], *, already_imported: bool) -> None:  # type: ignore[no-untyped-def]
    if already_imported:
        print(f"\nAlmaty demo already imported (city id: {city.id})\n")
    else:
        print("\nImported Almaty demo\n")

    print(f"Intersections: {len(city.intersections)}")
    print(f"Roads: {len(city.roads)}")
    print(f"Lanes: {sum(len(r.lanes) for r in city.roads)}")
    print(f"Traffic lights: {len(city.traffic_lights)}")
    print(f"Speed rules: {len(city.traffic_rules)}")
    print(f"Warnings: {len(warnings)}")
    print(f"City ID: {city.id}")

    if warnings:
        print(f"\nFirst {min(len(warnings), _MAX_WARNINGS_PRINTED)} warning(s):")
        for warning in warnings[:_MAX_WARNINGS_PRINTED]:
            print(f"  - {warning}")
        if len(warnings) > _MAX_WARNINGS_PRINTED:
            print(f"  ... and {len(warnings) - _MAX_WARNINGS_PRINTED} more.")


def main() -> int:
    db = SessionLocal()
    try:
        existing = city_service.get_city(db, ALMATY_DEMO_CITY_ID)
        if existing is not None:
            _print_summary(existing, [], already_imported=True)
            return 0

        print("Fetching OpenStreetMap network for Almaty...")
        graph = fetch_drive_network(
            ALMATY_DEMO_CENTER_LAT, ALMATY_DEMO_CENTER_LON, ALMATY_DEMO_RADIUS_M
        )

        print("Normalizing road topology...")
        network = extract_network(graph)

        print("Mapping intersections...")
        print("Mapping roads and lanes...")
        print("Mapping traffic signals...")
        mapping = map_network_to_city(
            network,
            city_id=ALMATY_DEMO_CITY_ID,
            city_name=ALMATY_DEMO_CITY_NAME,
            description=ALMATY_DEMO_DESCRIPTION,
        )

        print("Validating Pixel Lane City Model...")
        print("Saving city...")
        try:
            city = city_service.create_city(db, mapping.city)
        except CityValidationError as exc:
            print("\nImport failed: the mapped city did not pass validation.", file=sys.stderr)
            for issue in exc.issues[:_MAX_WARNINGS_PRINTED]:
                print(f"  - {issue.path}: {issue.message}", file=sys.stderr)
            return 1

        _print_summary(city, mapping.warnings, already_imported=False)
        return 0

    except OsmImportError as exc:
        print(f"\n{exc}", file=sys.stderr)
        return 1
    except OperationalError:
        print(
            "\nCould not connect to PostgreSQL. Is `make start` running?",
            file=sys.stderr,
        )
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
