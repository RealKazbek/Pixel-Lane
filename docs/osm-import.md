# Full Almaty import

The full importer uses OpenStreetMap administrative **relation 2465058**
(Almaty city, not Almaty Region/relation 215718). Boundary source:
[OpenStreetMap](https://www.openstreetmap.org/relation/2465058), resolved
through Nominatim by relation ID. The inherited Nominatim cache contains
both results; `--boundary-cache` selects and validates the exact city ID.
Its polygon bounds are longitude **76.7420485–77.1667539**, latitude
**43.0328438–43.4037657**. This is an administrative boundary, not a radius.

## Workflow

Install `backend[osm]` in the backend virtual environment, start PostgreSQL,
and apply Alembic migrations using a DATABASE_URL for the intended database.
No importer runs automatically during service startup.

```sh
make start-db
make migrate
make import-almaty-full
```

The Make target explicitly passes `--replace`. Direct CLI equivalent:

```sh
cd backend
DATABASE_URL=postgresql+psycopg://pixel_lane:change-me@localhost:5432/pixel_lane \
  .venv/bin/python -m app.city.importers.osm.full_cli --replace
```

Use your actual local credentials via environment configuration; examples
use placeholders. The inherited boundary can be reused without geocoding:

```sh
make import-almaty-full ARGS='--provider mirror --boundary-cache cache/b6ddf9f6311e31a3d0ff78d33f1bddcf47cd74ff.json'
```

## Acquisition and normalization

`client.py` delegates polygon subdivision and graph assembly to the existing
optional [OSMnx library](https://osmnx.readthedocs.io/en/stable/user-reference.html).
`max_query_area_size=25_000_000` m² produces 67 sequential queries for this
boundary, including OSMnx's topology buffer. This does **not** issue a single
full-city request. Successfully downloaded responses are cached on disk;
connection failures get three attempts and the CLI has a 1,800-second
acquisition deadline (`--acquisition-seconds`). HTTP 429/504 retries use
OSMnx's provider backoff. Restarting reuses successful cached chunks.

`--provider primary` uses overpass-api.de; `--provider mirror` uses
overpass.private.coffee. The mirror advertises no slot scheduling, so its
OSMnx slot-status polling is disabled; requests remain sequential. A provider
switch uses a separate set of URL-keyed cache entries.

After joining chunks, nodes outside the exact administrative polygon are
removed. Disconnected drivable components are retained. Simplification
preserves traffic-control nodes and changes in source way, name, class,
lane, speed, or direction attributes. This is a drivable topology network:
pedestrian ways, service roads and private access excluded by OSMnx's `drive`
filter are not represented. Boundary-crossing ways are truncated by topology
nodes, not geometrically clipped to invented boundary intersections.

`normalization.py` converts the graph to plain data, `mapper.py` creates
City Model entities, the service validates references, and the repository
persists them. OSMnx is not imported by the backend HTTP runtime, domain,
Traffic Engine, or frontend. The trusted `CityImport` contract allows up to
200,000 roads/intersections; public HTTP CityCreate limits remain 500.
The graph and normalized data are released before database persistence.

## Replacement and fresh updates

The full importer uses the **same canonical city UUID** as the old demo:
`73cc2df7-d284-5137-b7b0-85f9658fc955`. Thus demo and full datasets cannot
coexist as overlapping product cities under these commands. The repository
builds the new aggregate before taking a per-city PostgreSQL advisory lock,
then deletes/reinserts within one transaction using FK cascades. Validation,
insertion or spatial-check failures roll back to the previous city. Concurrent
imports of that identity serialize. Readers see committed data, never an
intermediate half-city. Deterministic entity UUIDs make repeated imports
stable; no duplicate roads accumulate. Replacement also removes local edits,
traffic demands and other descendants of this imported city: back up first.

Normal reruns reproduce cached data. For an actual source update use a new
dated cache directory, and reuse it for retries of that update:

```sh
make import-almaty-full ARGS='--cache-dir .osmnx_cache/2026-09-15 --provider mirror'
```

Do not delete a useful previous snapshot to force freshness. OSM HTTP caches
are acquisition artifacts, not product persistence. They, the inherited
`backend/cache/` boundary, backups and logs are ignored and must not be
committed. A local pre-replacement dump was preserved at
`backend/cache/pre-full-almaty.sql`; restore it only intentionally, with the
services stopped and a suitable empty restore target.

## Real data and unknowns

Roads retain geometry, source way identifiers, available name, source highway
class, domain road class, one-way status and numeric speed limits. Two-way
streets remain two directed Roads, preserving the previous importer's model.
Explicit directional lane counts create lanes. A tagged total count is
preserved separately as `source_lane_count`; it is not split by guessing.
Unknown speed is null, unknown directional lanes/movements are empty, and
real signal presence has empty phases/groups until a real plan is supplied.
No synthetic timing, traffic demand, crossing entity, parking or measured
lane width is introduced by the full importer. Unnamed roads receive a
technical reference name, suppressed by the label adapter. Zero-length
geometry is rejected during normalization. The Traffic Engine adapter maps
unknown speed to its existing analysis fallback indicator; it never writes
an assumed speed back to the City Model. Lane-based capacity analysis is
incomplete when directional lane information is absent.

The legacy `make import-almaty` remains an explicitly demo-only, create-if-
missing command with its old documented fallbacks. It cannot downgrade an
existing canonical full city.

## PostGIS and Apple Silicon

Alembic enables PostGIS, backfills `roads.geom` (LineString, SRID 4326) and
`intersections.geom` (Point, SRID 4326), and owns their GiST indexes. JSONB
road points and Cartesian positions remain the existing write representation.
The import verifies valid spatial road geometry before commit. Geometry edits
maintain the spatial mirror. Alembic autogeneration excludes extension-owned
`spatial_ref_sys` and recognizes the explicit GiST indexes.

Compose retains `postgis/postgis:16-3.4`, explicitly `linux/amd64` on Apple
Silicon. Runtime inspected: PostgreSQL 16.4, PostGIS 3.4.3. Both upstream
16-3.4 and 16-3.5 manifests inspected lacked an ARM64 runtime image.
[The alternative inspected](https://github.com/ImreSamu/docker-postgis)
labels its ARM64 support experimental. Keeping the existing compatible
database volume under emulation avoids an unvalidated database-image change.
Native ARM64 migration remains a separate, measured infrastructure task;
emulation has a performance cost. The backend itself builds for ARM64.

## Map delivery

- `GET /api/v1/cities/{id}/metadata`: small metadata, road count and actual
  stored-road extent for initial camera and Fit to view; no nested network.
- `GET .../roads?bbox=west,south,east,north&zoom=N`: PostGIS intersects query;
  highway/arterial below z12, adds collectors at z12, all classes at z14.
- `GET .../intersections?bbox=...`: fetched from z15; includes signal IDs.
- `GET .../roads/{road_id}` and `.../intersections/{intersection_id}`:
  city-scoped selection/editor details, independent of panning.

Bbox responses are capped at 10,000 features; exceeding the cap returns
`422 VIEWPORT_TOO_LARGE`, never a silently truncated network. The browser
debounces movement for 300ms, adds a 25% edge buffer, cancels stale requests,
and only caches successful responses at the same zoom tier. MapLibre sources
update in place, with native road/point/label layers. Labels start at z13,
local labels at z16, intersections/signals at z15. Cartesian example cities
retain their small full-city loading path. The full-city API remains for
explicit legacy/analysis consumers; the WGS84 map never calls it.

## Verification status

See `docs/full-almaty-verification.md` for the takeover audit, measured runtime
results, checks and remaining limitations. Do not infer an executed full-city
import merely from the presence of the CLI.
