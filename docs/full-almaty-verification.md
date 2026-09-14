# Full Almaty takeover and verification

## Inherited state

Takeover branch: `main`, HEAD `7e0443f`, initially matching `origin/main`.
Claude had committed PostGIS migration `1ac1e51`, bbox API `d3cffe3`, spatial
tests `c20089d`, partial viewport loading `e5905b0`, viewport helper tests
`3f82a9a` and architecture notes `7e0443f`. No tracked uncommitted edits or
unrelated developer modifications were found. One untracked 359 KB Nominatim
cache contained city relation 2465058 and region relation 215718; preserved.

PostGIS 3.4.3 and its migration were applied on PostgreSQL 16.4, with one
canonical demo city. Full acquisition/replacement was not implemented.
The importer still had 850 m/500-entity limits and synthetic fallbacks.
The map rendered bbox results but also downloaded the full City for camera
and details. Failed requests poisoned its bbox cache; Cartesian cities had
no spatial results; a background click handler could clear road selection.
Alembic autogeneration did not recognize PostGIS-owned tables/GiST indexes.
Backend tests defaulted to truncating the development database.

## Continued implementation

Retained the existing spatial mirror, schemas, normalization/mapping and
MapLibre architecture. Added trusted import limits, source observations and
unknown-data semantics; PBF streaming and cached polygon acquisition; atomic
replacement of the existing canonical city; metadata/detail APIs; zoom-
filtered viewport loading and native layer hierarchy; isolated test-database
safety; migration metadata consistency. No vector tiles, simulation, drawing,
new services or UI redesign were introduced.

## Runtime status

Full Almaty import executed and verified end-to-end against a real running
PostgreSQL 16 + PostGIS 3.4.3 instance (`docker compose up -d postgres`,
Alembic head `7d014a16239c`):

```
backend/.venv/bin/python -m app.city.importers.osm.full_cli \
  --boundary-cache cache/b6ddf9f6311e31a3d0ff78d33f1bddcf47cd74ff.json \
  --pbf cache/kazakhstan-260913.osm.pbf \
  --replace --acquisition-seconds 1800
```

Measured result (2026-09-14, `duration_seconds: 231.05`):

```json
{"city_id": "73cc2df7-d284-5137-b7b0-85f9658fc955", "roads": 61317,
 "intersections": 27137, "lanes": 17246, "traffic_lights": 747,
 "boundary": {"relation": 2465058, "bounds": [76.7420485, 43.0328438,
 77.1667539, 43.4037657], "pbf_file": "kazakhstan-260913.osm.pbf",
 "source_timestamp": "2026-09-13T20:21:20Z", "selected_ways": 16049,
 "inside_nodes": 1434362}, "warnings": 687}
```

Independently confirmed with `psql`: 61,317 rows in `roads`, 27,137 rows in
`intersections`, 17,246 rows in `lanes`, 747 rows in `traffic_lights`, 0 rows
with a null/invalid/non-4326 `geom`, `ST_Extent(roads.geom)` spanning
`76.7429678,43.0450936` to `77.1659277,43.4012533` (matches the Almaty
administrative relation 2465058 bounds). `GET /api/v1/cities/{id}/roads` and
`/map-roads` return real PostGIS-filtered results (curl-verified): a
mid-size viewport at zoom 16 returns 1,259 roads, the same viewport at
zoom 10-11 collapses to highway/arterial classes only, and a low-zoom
request over the full city extent is correctly rejected as
`VIEWPORT_TOO_LARGE` rather than returning an oversized payload.
