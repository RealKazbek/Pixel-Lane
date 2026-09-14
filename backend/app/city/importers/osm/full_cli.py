"""Explicit full-Almaty replacement command; successful downloads are resumable."""

import argparse
import json
import signal
import time
from datetime import UTC, datetime
from pathlib import Path

from app.city.importers.osm import ALMATY_DEMO_CITY_ID
from app.city.importers.osm.client import fetch_almaty_network
from app.city.importers.osm.mapper import map_network_to_city
from app.city.importers.osm.normalization import extract_network
from app.city.schemas.import_city import CityImport
from app.city.services.city_service import replace_imported_city
from app.db.session import SessionLocal


def _deadline(signum, frame):
    raise TimeoutError("Acquisition time limit reached; rerun to reuse cached chunks.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--boundary-cache", type=Path)
    parser.add_argument("--pbf", type=Path, help="Offline regional .osm.pbf (recommended)")
    parser.add_argument("--provider", choices=["primary", "mirror"], default="primary")
    parser.add_argument(
        "--cache-dir", type=Path, help="Use a new dated cache directory for fresh data"
    )
    parser.add_argument("--acquisition-seconds", type=int, default=1800)
    parser.add_argument(
        "--replace",
        action="store_true",
        required=True,
        help="Replace the canonical Almaty network, including previous edits",
    )
    args = parser.parse_args()
    if args.acquisition_seconds <= 0:
        parser.error("--acquisition-seconds must be positive")
    started = time.monotonic()
    signal.signal(signal.SIGALRM, _deadline)
    signal.alarm(args.acquisition_seconds)
    try:
        graph, boundary = fetch_almaty_network(
            args.boundary_cache, provider=args.provider, cache_dir=args.cache_dir, pbf_file=args.pbf
        )
    finally:
        signal.alarm(0)
    network = extract_network(graph, observed_only=True)
    del graph
    mapping = map_network_to_city(
        network,
        city_id=ALMATY_DEMO_CITY_ID,
        city_name="Алматы",
        description="OpenStreetMap administrative relation 2465058; full drivable network. "
        "Unknown lanes/speeds/timings are not inferred. " + json.dumps(boundary),
        full_import=True,
        # OSMnx/Overpass do not expose a reliable per-query OSM data
        # snapshot timestamp -- only this import run's own wall-clock time
        # is recorded (never fabricated as if it were the source's
        # timestamp). See docs/city-model.md's data-freshness note.
        imported_at=datetime.now(UTC),
        import_query={"provider": args.provider, **boundary},
    )
    del network
    assert isinstance(mapping.city, CityImport)
    with SessionLocal() as db:
        replace_imported_city(db, mapping.city)
    print(
        json.dumps(
            {
                "city_id": str(mapping.city.id),
                "roads": len(mapping.city.roads),
                "intersections": len(mapping.city.intersections),
                "lanes": sum(len(r.lanes) for r in mapping.city.roads),
                "traffic_lights": len(mapping.city.traffic_lights),
                "boundary": boundary,
                "duration_seconds": round(time.monotonic() - started, 2),
                "warnings": len(mapping.warnings),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
