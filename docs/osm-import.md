# OSM import

`make import-almaty` runs the optional OSMnx importer for a bounded central-Almaty demo area (about 850 m radius near Abay Avenue/Rozybakiev Street). It fetches OSM through Overpass, normalizes the graph, maps it into City Model schemas, validates it, and persists through the City service.

Road geometry, names, one-way/lane attributes, speed limits, and signal presence come from OSM with documented fallbacks. IDs are deterministic UUID5 values and the fixed demo city ID makes the import idempotent. Signal timing is a synthetic placeholder; demand and parking are not imported. The importer is isolated in `backend/app/city/importers/osm/` and its `backend[osm]` dependency is optional.
