# City Model

The City Model is Pixel Lane's authoritative persisted representation of a city. Map data, OSM imports, analysis inputs, and edits all derive from it; neither MapLibre nor Terra Draw stores domain truth.

Core entities are `City`, `Road`, `Lane`, `Intersection`, `TrafficLight` (including groups/phases), `TrafficRule`, `ParkingZone`, and `TrafficDemand`. IDs are client-supplied UUIDs so a complete graph can be validated before persistence. PostgreSQL stores normalized relationships; road polylines are the deliberate JSONB exception.

Coordinates support `WGS84` (`x=longitude`, `y=latitude`) and `LOCAL_CARTESIAN`. A road edit follows MapLibre → temporary Terra Draw feature → PATCH geometry API → Pydantic/business validation → PostgreSQL → city refetch. OSM data is normalized into these entities rather than becoming a separate model.

**Not yet modeled.** Pedestrian crossings, cameras, sensors, incidents, and emergency-priority devices have no entity yet. They are deliberately deferred rather than half-implemented -- the existing entities (e.g. `ParkingZone`) establish the pattern any of these would follow: one table, an FK to the city (and, where relevant, a road/intersection) with `ON DELETE CASCADE`, a `domain`/`schemas`/`models`/`validators`/`repositories`/`services`/`api` slice, and an Alembic migration. Add each only when a concrete feature needs it, not speculatively.

## Spatial schema (PostGIS)

PostGIS is enabled (migration `9c1a2f7e5b3d`, on top of a `postgis/postgis:16-3.4`
image -- see root `docker-compose.yml`). `roads.geom` (`Geometry(LineString, 4326)`)
and `intersections.geom` (`Geometry(Point, 4326)`) are a WGS84 spatial mirror
of the existing JSONB/`position_x,position_y` columns, each backed by a GiST
index (`ix_roads_geom`, `ix_intersections_geom`). They're populated only for
`WGS84` cities -- `LOCAL_CARTESIAN` coordinates (e.g. the four-way-intersection
example) aren't real geographic positions, so `geom` stays `NULL` for them and
they never appear in a bbox query result. `city_builder.py` populates `geom`
at creation time (`POST /cities`) and `city_repository.update_road_geometry`
keeps it in sync on a geometry edit; existing rows were backfilled by the
same migration from their JSONB/position columns.

**Why now.** The trigger condition from docs/architecture.md's PostGIS section
("a real spatial-query need appears") was met once loading a city larger than
the ~850m demo area required fetching only what's visible in the current map
viewport rather than the whole city in one response.

**Not a replacement (yet).** `roads.geometry` (JSONB) and
`intersections.position_x/position_y` remain the source of truth for ordered
points and non-WGS84 cities. Dropping them in favor of `geom` once every
consumer is confirmed migrated off them is a deliberate future cleanup, not
part of this change.

## Bbox-scoped viewport API

`GET /cities/{id}/roads?bbox=minLon,minLat,maxLon,maxLat` and
`GET /cities/{id}/intersections?bbox=...` return only roads/intersections
intersecting the given WGS84 bbox (`ST_Intersects` against
`ST_MakeEnvelope(...)`, real PostGIS predicates -- never a Python-side
filter over a fully-loaded dataset). `bbox` is validated at the API
boundary (4 finite numbers, valid lon/lat ranges, `min < max`); a
malformed value is a `422`, an unknown city is a `404`, and a bbox with no
matching geometry is a `200` with an empty list. These are additive to
`GET /cities/{id}` (still the full-city payload, unchanged, still used by
traffic analysis and non-map consumers) -- see the frontend's
viewport-loading architecture in
`frontend/src/features/city-viewer/map/README.md`.

The WGS84 map loads `/cities/{id}/metadata` (stored-road extent and count)
and individual `/roads/{road_id}` or `/intersections/{intersection_id}`
details. It never needs the full aggregate. Road bbox queries accept `zoom`
for class filtering; responses exceeding 10,000 features fail explicitly.
See [the import workflow](osm-import.md) and
[measured verification](full-almaty-verification.md).

## Observed geographic data

Roads may have an unknown (`null`) default speed and no known directional
lanes. Empty movement lists and signal phases/groups represent unknown data,
not measured zero capacity or an always-green timing plan. Optional road
`source_id`, `source_road_type`, `one_way` and `source_lane_count` preserve
source observations. A source total lane count does not imply a particular
allocation to each directed road. Migrations `6b14f092a731` and `7d014a16239c`
add these fields without replacing existing geometry or relationship tables.
The speed migration refuses downgrade if unknown speeds exist; resolve them
from real data or restore a pre-import backup instead of fabricating values.

`CityImport` is a separate trusted offline contract with larger aggregate
limits; public `CityCreate` limits and HTTP request-size protection remain.
`city_service.replace_imported_city` validates before atomic replacement,
with per-city advisory locking in the repository. Simulation remains behind
the existing backend adapter.
