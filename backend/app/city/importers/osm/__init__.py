"""OpenStreetMap city importer -- an isolated adapter/tooling subsystem.

Public entry point: `import_city_from_osm` (importer.py). Only
`client.py` imports osmnx; see AGENTS.md's dependency-isolation rule and
this directory's place in `docs/architecture.md`.

Fetch -> normalize -> map -> validate -> persist:
    client.py          (osmnx, network I/O)
    normalization.py   (pure: graph -> NormalizedNetwork)
    mapper.py           (pure: NormalizedNetwork -> CityCreate)
    importer.py          (orchestration, uses app.city.services.city_service)
"""

from uuid import NAMESPACE_DNS, uuid5

from app.city.importers.osm.defaults import IMPORT_UUID_NAMESPACE
from app.city.importers.osm.importer import ImportOutcome, ImportRequest, import_city_from_osm

# The Almaty central demo area: a fixed, deterministic identity so
# `make import-almaty` is idempotent regardless of how many times it runs
# (see backend/app/city/importers/osm/README.md).
ALMATY_DEMO_KEY = "almaty-central-demo-v1"
ALMATY_DEMO_CITY_ID = uuid5(uuid5(NAMESPACE_DNS, IMPORT_UUID_NAMESPACE), f"city:{ALMATY_DEMO_KEY}")
ALMATY_DEMO_CITY_NAME = "Almaty, Kazakhstan — Demo Area"
ALMATY_DEMO_DESCRIPTION = (
    "A real road network subset imported from OpenStreetMap (Overpass API), "
    "centered near Abay Avenue / Rozybakiev Street, central Almaty, "
    "Kazakhstan. Demo area only, not the full city. Traffic signal timings "
    "are synthetic placeholders, not real data; no real traffic-demand "
    "data is included."
)
ALMATY_DEMO_CENTER_LAT = 43.238949
ALMATY_DEMO_CENTER_LON = 76.889709
ALMATY_DEMO_RADIUS_M = 850.0

__all__ = [
    "ImportOutcome",
    "ImportRequest",
    "import_city_from_osm",
    "ALMATY_DEMO_KEY",
    "ALMATY_DEMO_CITY_ID",
    "ALMATY_DEMO_CITY_NAME",
    "ALMATY_DEMO_DESCRIPTION",
    "ALMATY_DEMO_CENTER_LAT",
    "ALMATY_DEMO_CENTER_LON",
    "ALMATY_DEMO_RADIUS_M",
]
