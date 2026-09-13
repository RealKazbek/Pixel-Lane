# OSM import

`make import-almaty` runs the optional OSMnx importer for a bounded central-Almaty demo area (about 850 m radius near Abay Avenue/Rozybakiev Street). It fetches OSM through Overpass, normalizes the graph, maps it into City Model schemas, validates it, and persists through the City service.

Road geometry, names, one-way/lane attributes, speed limits, and signal presence come from OSM with documented fallbacks. IDs are deterministic UUID5 values and the fixed demo city ID makes the import idempotent. Signal timing is a synthetic placeholder; demand and parking are not imported. The importer is isolated in `backend/app/city/importers/osm/` and its `backend[osm]` dependency is optional.

**This is a manual, one-time step, not part of normal startup.** `make start`/`make start-backend`/`docker compose up` never run it automatically — a fresh database has a schema but zero cities until `make import-almaty` is run once against it. If the City Model page loads (toolbar and UI visible) but the map appears empty, this is the first thing to check: query `select count(*) from cities;` / `select count(*) from roads;`, or just re-run `make import-almaty` (it's idempotent, safe to re-run). Also requires outbound network access to Overpass; without it, the import fails loudly rather than silently leaving an empty city.
