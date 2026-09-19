# Pixel Lane — Architecture

Pixel Lane is a smart-city / traffic-management platform. This document
describes the intended high-level architecture. Sections describing
components that do not exist yet are marked **(planned)**.

## Goals

Build the system core correctly before adding platform complexity. The
domain/traffic logic must remain independently testable and decoupled from
UI, simulation, and hardware concerns.

## Current implementation status

- `frontend/` — Next.js (App Router, TypeScript strict, Tailwind). The
  localized City Model page is an **editor-first MapLibre workspace**
  (`src/features/city-viewer/`): it starts from a clean local editor
  document containing three production-generated Stage 1 road primitives.
  The current PL-005 checkpoint supports road creation, endpoint/vertex
  editing, curved multi-segment geometry, width and lane configuration,
  derived basic markings, reusable semantic road presets, endpoint/node
  snapping, and semantic centerline segment snapping with automatic road
  splitting backed by explicit City Model `Intersection` identity; the
  separate Road Geometry Lab remains the engineering surface for fixtures.
  PL-005.15–PL-005.18 derived junction geometry is implemented for connected
  T/Y, four-way, and arbitrary-angle nodes with bounded corner radii. No full
  persisted lane/intersection editor exists; lane-to-lane turn geometry is
  intentionally a later stage.
- `backend/` — FastAPI + Pydantic + SQLAlchemy + Alembic, PostgreSQL.
  App wiring (settings, DB session/engine, error handling, a body-size
  safeguard) plus two real domain modules: **City Model v1** (`app/city/`)
  and a thin **Traffic Engine adapter** (`app/traffic/`), both described
  below. No auth yet.
- `simulation/` — a Python package. No SUMO/simulation runtime yet, but it
  now hosts the framework-independent **Traffic Engine v1**
  (`pixel_lane_simulation/traffic/`, described below) as an importable
  library (the backend depends on it as a sibling package).
- `docker-compose.yml` — runs `postgres`, `backend`, `frontend` with
  healthchecks. The backend image is built from the repo root so it can
  install the sibling `simulation` package. `simulation` has no runnable
  server of its own yet, so it is not wired into Compose as a service.

Everything below "High-level components" describes the **target**
architecture these services will grow into — treat it as planned unless
explicitly noted otherwise.

## Subsystems

Compact registry of implemented subsystems -- keep this current as new
subsystems are added (see AGENTS.md § 19). Each links to its detailed
section below.

| Subsystem         | Location                                    | Responsibility                                                                                | Public entry point                                                    | Depends on                                                                            |
| ----------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| City Model v1     | `backend/app/city/`                         | Persisted city/road-network domain model                                                      | `city_service` (validate/create/get/list), REST `/api/v1/cities*`     | PostgreSQL                                                                            |
| Traffic Engine v1 | `simulation/pixel_lane_simulation/traffic/` | Static network/routing/congestion analysis                                                    | `analyze_city()` / `TrafficEngine.analyze()`                          | Nothing in this repo (its own `CityInput` contract only)                              |
| Traffic adapter   | `backend/app/traffic/`                      | Translates City -> Traffic Engine input, serializes result                                    | REST `POST /api/v1/cities/{id}/traffic-analysis`                      | City Model, Traffic Engine                                                            |
| Map/editor v2     | `frontend/src/features/city-viewer/`        | Editor workspace and limited road geometry rendering/editing                                  | `CityViewerApp` component                                             | City Model geometry adapters; persisted API remains available to future editor stages |
| OSM importer      | `backend/app/city/importers/osm/`           | Administrative-boundary import from regional PBF or cached polygon chunks; atomic replacement | Full CLI (`make import-almaty-full`), legacy `import_city_from_osm()` | City Model service; OSMnx/PyOsmium (isolated optional `backend[osm]`)                 |

**Planned** (not implemented, see their sections under "High-level
components" below): 2D Editor, SUMO adapter, external hardware
integration, Auth/Users.

**Dependency flow** (implemented parts only):

```
Frontend (MapLibre map/editor)
    | HTTP
Backend API (FastAPI routes)
    |
Application services (city_service, traffic service/adapter)
    |
City Model domain/repositories  ---->  Traffic Engine (own CityInput contract)
    |
PostgreSQL (via repositories)
```

The Traffic Engine has no arrow pointing back at the backend, FastAPI,
SQLAlchemy, or PostgreSQL -- it must stay that way (see AGENTS.md's
dependency-direction rule).

## City Model v1 (implemented)

**Purpose.** The City Model is the central, persisted representation of a
city's road network: roads, lanes, intersections, traffic lights, traffic
rules, parking, and manually-entered traffic demand. It is what the future
2D editor writes to and what the future traffic engine/simulation reads
from — see the data-flow diagram below. v1 covers only the core entities
needed to describe a useful network; it does not model live traffic,
routing, optimization, auth, or ownership yet.

**Entities.** `City`, `Road`, `Lane`, `Intersection`, `TrafficLight`
(`SignalGroup`, `Phase`), `TrafficRule`, `ParkingZone`, `TrafficDemand`, plus
shared `Point`/`Polyline` geometry value objects and a `CoordinateSystem`
(`LOCAL_CARTESIAN` or `WGS84`) per city. All persistent entities use
client-supplied UUIDs (the future 2D editor assigns IDs while designing, so
entities can reference each other within one payload before anything is
persisted).

**Layering** (`backend/app/city/`):

```
city/
  domain/        enums, geometry, payload-size limits -- no FastAPI/SQLAlchemy
  schemas/       Pydantic API contracts (Create/Read per entity)
  models/        SQLAlchemy ORM models (persistence only)
  validators/    cross-reference/business-rule validation (pure Python)
  repositories/  session/transaction/query access + ORM graph building
  services/      orchestrates validation -> persistence -> retrieval
  api/           thin FastAPI routes
  examples/      the four-way-intersection example payload (see below)
```

Routes never touch SQLAlchemy directly; they call `services/city_service.py`,
which calls `validators/` then `repositories/`. API schemas and ORM models
are separate types on purpose (never expose ORM rows as API responses) --
`services/city_mapper.py` is the explicit, boring translation between them.

**Persistence design.** One table per entity, normalized and queryable
(retrieving a single road, lane, or intersection doesn't require loading a
whole city). Many-to-many links (intersection<->road, intersection<->lane,
signal-group<->lane, phase<->signal-group) are real association tables, not
arrays of IDs. All FKs use `ON DELETE CASCADE` so deleting a city cleanly
removes everything under it. `Lane.allowed_movements` uses a PostgreSQL
`ARRAY` (a small, bounded, scalar list -- a normal Postgres type, not a JSON
escape hatch). `Road.geometry` is the one deliberate `JSONB` exception: an
ordered list of points has no query benefit from normalization at this
stage and would just add join bookkeeping; this is documented here per the
"JSONB only when genuinely flexible" policy in `AGENTS.md` and should be
revisited if/when PostGIS geometry columns are introduced. `TrafficRule`'s
`target_type`/`target_id` is a polymorphic reference (a rule can target a
road, lane, intersection, or movement) -- a single FK can't span multiple
target tables, so that reference is validated at the application layer
(`validators/city_validator.py`) instead of the database.

**Why PostgreSQL.** Per `AGENTS.md`, PostgreSQL is Pixel Lane's authoritative
database. City Model v1 uses it directly (real FKs, constraints, a
PostgreSQL `ARRAY` column, `JSONB` where justified) rather than a
lowest-common-denominator schema, and tests run against real PostgreSQL
rather than a substitute.

**Validation design.** Two layers: Pydantic enforces structure (types,
ranges, required fields, list-length caps) at parse time; a separate pure
function (`validate_city`) enforces cross-references and business rules
(ID uniqueness across the whole payload, every foreign reference, duplicate
lane indices, duplicate movements, valid rule targets, etc.) and returns a
list of machine-readable `{code, message, path}` issues. `POST
/api/v1/cities/validate` runs this without persisting; `POST
/api/v1/cities` runs it before persisting, inside the same transaction
scope, so a half-invalid city is never partially written.

**Payload safety.** Every nested list has an explicit max length (roads per
city, lanes per road, phases per light, etc. -- see
`app/city/domain/limits.py`), and a small middleware rejects oversized
request bodies outright. This is a bound, not a quota system.

**PostGIS (implemented, additive).** The trigger condition ("a real
spatial-query need appears") was met once a bbox-scoped viewport API
became necessary to scale past a small demo area (see
docs/city-model.md's spatial schema section). PostGIS was added exactly
as planned above -- additively, not as a rewrite: `roads.geometry`
(JSONB) and `intersections.position_x/position_y` remain the source of
truth for ordered points and non-WGS84 (`LOCAL_CARTESIAN`) cities;
`roads.geom`/`intersections.geom` are a WGS84 (SRID 4326) spatial mirror,
populated only for WGS84 cities, used only by the bbox query endpoints
(`GET /cities/{id}/roads?bbox=...`, `GET /cities/{id}/intersections?bbox=...`).
Dropping the JSONB/position columns in favor of the spatial ones is a
separate future cleanup, not done yet. Still not introduced: vector
tiles. Full Almaty ingestion now has a regional PBF path and cached polygon
queries (see docs/osm-import.md); measured execution status is recorded in
docs/full-almaty-verification.md. Public create-payload limits stay small;
trusted imports use a separately bounded `CityImport` contract.

WGS84 map loading uses metadata (road count and stored-road extent), zoom-
filtered bbox queries, and individual selected-entity endpoints. Cartesian
examples retain full loading. Import replacement is serialized per city and
commits atomically. Unknown source speed/lane/timing data remain null/empty;
source observations have optional generic road fields, without OSM objects
leaking into the API or Traffic Engine.

**Planned: SUMO boundary.** City Model v1 has no simulation code. When the
simulation adapter is built (see `simulation/`), it will read the City
Model through the API/service layer above -- SUMO-specific network formats
are translated inside that adapter, never inside `app/city/`.

**Example fixture.** `backend/app/city/examples/four_way_intersection.json`
(loaded via `app.city.examples.load_four_way_intersection()`) is a compact,
realistic four-way signalized intersection: 4 roads, 12 lanes (through/
right, a dedicated left-turn lane, and a return lane per road), one traffic
light with 2 phases, a speed-limit rule and a turn-restriction rule, one
parking zone, and two traffic-demand entries. It is meant to be reused by
tests, the future 2D editor, and simulation development -- not a
throwaway test-only fixture.

## Traffic Engine v1 (implemented, no SUMO yet)

**Purpose.** A framework-independent traffic-analysis engine that sits on
top of the City Model: it builds a network graph, assigns manually-entered
`TrafficDemand` onto shortest routes, and reports congestion/bottleneck
metrics. It answers "how would this network cope with this demand?" as a
static analytical estimate -- it does not simulate vehicles, signals, or
time.

```
City Model
    |
Network Graph          (app/city -> pixel_lane_simulation.traffic.graph)
    |
Capacity Model          (traffic.capacity)
    |
Traffic Demand Assignment  (traffic.routing + traffic.flow)
    |
Flow Estimation
    |
Congestion Metrics      (traffic.metrics)
    |
Bottleneck Detection    (traffic.analysis)
```

**Where it lives.** `simulation/pixel_lane_simulation/traffic/` -- a pure
Python package with no FastAPI/SQLAlchemy/Pydantic/Next.js dependency. It
defines its own minimal input contract
(`traffic/models/inputs.py`: `CityInput`, `RoadInput`, `LaneInput`,
`IntersectionInput`, `TrafficDemandInput`) instead of importing the
backend's Pydantic City schemas, and its own result contract
(`traffic/models/result.py`, plain dataclasses). Dependency direction is
one-way:

```
backend/app/traffic (adapter + API)
    -> pixel_lane_simulation.traffic (engine)
        -> its own CityInput/TrafficAnalysisResult contract
```

The engine never imports anything from `backend/app/*`; `backend/app/traffic/`
is the only place allowed to depend on both sides (`app/traffic/adapter.py`
converts a persisted `CityRead` into `CityInput`).

**Network graph.** Node = intersection, edge = a directed road/lane
connection. The City Model does not record which end of a road touches
which intersection, only that an intersection's `connected_road_ids`
includes it -- so the builder (`traffic/graph/builder.py`) resolves each
road's two endpoints by matching its polyline's first/last point to the
closest connected intersections. A road referenced by 0 or 1 intersections
produces a warning and no edge (unusable for routing, e.g. the four-way
example fixture's dead-end roads); a road referenced by more than 2 raises
`InvalidNetworkTopologyError` -- the engine fails clearly on network data
it cannot resolve rather than guessing. Multiple lanes travelling the same
direction on the same road aggregate into one directed edge.

**Capacity.** One flat, documented baseline: `1800 vehicles/hour/lane`
(`pixel_lane_simulation.traffic.config.DEFAULT_CAPACITY_PER_LANE_VPH`), a
common rough per-lane baseline, not calibrated to any real city and not
varying by lane/road type or signal control yet. Road capacity sums its
lanes' capacity (both directions).

**Routing.** One deterministic strategy for v1: Dijkstra's shortest path by
free-flow travel time (`traffic/routing/router.py`) -- not a raw-distance
shortest path, and not equilibrium/multi-path/stochastic routing. Edge
length uses Euclidean distance for `LOCAL_CARTESIAN` cities (coordinate
units assumed to be meters) and haversine distance for `WGS84` cities
(`Point.x`=longitude, `Point.y`=latitude). Free-flow travel time uses the
road's speed limit, or a configurable default if none is set.

**Flow assignment.** Static, all-or-nothing: each `TrafficDemand` with both
a source and destination intersection is routed once and its full volume
is loaded onto every edge on that route (`traffic/flow/assignment.py`). No
per-vehicle or timestep simulation. A demand with only a `movement` (no
destination -- the shape used when a city has just one intersection, like
the four-way example fixture) is not routable in v1 and is reported as a
warning, not silently dropped.

**Congestion metrics & bottlenecks.** Volume/capacity ratio classified as
`FREE_FLOW` (<0.50), `MODERATE` (0.50-0.80), `HEAVY` (0.80-1.00), or
`SATURATED` (>1.00) -- thresholds centralized in `TrafficEngineConfig`.
`HEAVY`/`SATURATED` roads, lanes, or intersections are reported as
bottlenecks (`medium`/`high` severity) by
`traffic/analysis/bottlenecks.py` -- an explicitly-labeled baseline
threshold heuristic, not a validated traffic-engineering bottleneck model
(no queueing, no signal timing, no turning-movement conflicts).

**Endpoint.** `POST /api/v1/cities/{city_id}/traffic-analysis` -- loads the
City from PostgreSQL, converts it, runs the engine, returns the result. No
analysis is persisted (no `analysis_runs`/`traffic_metrics_history` table);
it is computed on demand each call.

**Known v1 limitations** (all deliberate, to be revisited alongside SUMO):

- Static traffic assignment only -- no dynamic equilibrium, no rerouting
  as congestion changes.
- No vehicle-level or timestep simulation.
- No traffic-light timing simulation or adaptive signal control.
- No SUMO integration yet.
- No real-time traffic data.
- Flat, uncalibrated capacity assumption (no per-lane-type/road-type/
  signal-control variation).
- Intersection congestion is a rough inbound-volume heuristic, not a real
  capacity/turning-movement model.

## Frontend 2D Map/Editor v2 (implemented)

**Purpose.** A hybrid 2D map view of a persisted City Model and its
Traffic Analysis results, built on MapLibre GL JS, with an optional
reference basemap underneath and Pixel Lane's own road network rendered
as an authoritative overlay on top. It replaces the earlier Canvas-based
read-only viewer (v1) and adds a first geometry-editing capability (moving
a road's existing vertices).

```
Frontend 2D Map/Editor
      |
City Model API      (GET /api/v1/cities, GET /api/v1/cities/{id},
      |               PATCH /api/v1/cities/{id}/roads/{id}/geometry)
Traffic Analysis API (POST /api/v1/cities/{id}/traffic-analysis)
```

**Why MapLibre.** MapLibre GL JS is open-source (BSD), requires no account
or API key, and gives real map interaction (pan/zoom/click) and
GPU-accelerated rendering without hand-rolling projection, hit-testing, or
a render loop (library-first, per `AGENTS.md`). It is used purely as a
rendering/interaction engine -- it owns no Pixel Lane data.

**City Model remains the only source of truth.** MapLibre's GeoJSON
sources and Terra Draw's in-memory feature store (used only during
geometry editing) are transient UI state, rebuilt from the City Model on
every relevant change. Terra Draw's store is read exactly once, at the
moment a user clicks "Apply," to extract edited coordinates -- it is never
otherwise treated as authoritative. See
`frontend/src/features/city-viewer/map/README.md` for the full
subsystem breakdown (layer stack, coordinate handling, editing data flow).

**Where it lives.** `frontend/src/features/city-viewer/`:

```
city-viewer/
  types/         TypeScript mirrors of the City/TrafficAnalysis API contracts
  api/           getCities()/getCity()/runTrafficAnalysis()/updateRoadGeometry()
  lib/           pure functions not specific to the map (analysis lookup)
  hooks/         data fetching (with silent refresh after an edit), city list
  map/           MapLibre map, City Model <-> GeoJSON adapters, styling,
                 layer setup, and the geometry editor (see map/README.md)
  components/
    sidebar/     city list, bottleneck list
    details/     per-entity-type details panels (Road/Intersection)
```

**Basemap: optional and provider-independent.** Controlled by
`NEXT_PUBLIC_MAP_BASEMAP_ENABLED` (default `false`) and
`NEXT_PUBLIC_MAP_STYLE_URL` (any MapLibre-compatible style URL). With the
basemap off, Pixel Lane's overlay renders on an empty style and makes no
external tile requests. Toggling at runtime uses `map.setStyle()` +
re-adding Pixel Lane's sources/layers on `style.load` -- the underlying
`maplibregl.Map` instance is created once and never recreated. No provider
API key is ever hardcoded or shipped by Pixel Lane.

**Road styling.** Road width and casing width are derived from lane count,
converted from meters to on-screen pixels via a zoom- and latitude-aware
Web Mercator expression (so roads scale realistically with zoom). Color is
a neutral slate/zinc grayscale keyed by road-type hierarchy -- deliberately
not the yellow/orange highway styling of consumer navigation apps, since
this is an analysis/editing tool, not a navigation product.

**Coordinate handling.** WGS84 cities pass `Point.x/y` (lon/lat) straight
through to MapLibre. LOCAL_CARTESIAN cities (no real-world reference) are
anchored at an arbitrary (0, 0) via an inverse-equirectangular projection
purely so they have _some_ valid position to render at -- this placement
is explicitly not geographically meaningful.

**Geometry editing (foundation).** The current local editor can select and
drag existing vertices, insert vertices before/between/after segments, and
derive independently smoothed corners through MapLibre-backed interaction.
The reusable Terra Draw adapter and `PATCH /api/v1/cities/{id}/roads/{id}/geometry`
support explicit source-polyline persistence, but the local editor MVP does
not auto-save. PL-005.01–PL-005.11 extend this foundation with road creation,
width configuration, ordered lane count/direction editing, configurable basic
lane/edge markings, road presets, and endpoint snapping. Presets are
declarative templates that write those existing semantic fields; they are not
road entity types and do not remain attached to a road. Snapping reuses the
City Model `Intersection` as the canonical topological node: connected roads
are listed in one `connected_road_ids` set and their snapped endpoints use the
node's canonical position. Equal endpoint coordinates without that shared
identity do not establish connectivity. Candidate detection is derived in
screen space and never inferred from rendered road surfaces or GeoJSON. The
City Model source road, lane, and intersection metadata remain authoritative;
centerlines, surfaces, lane boundaries, markings, and snap indicators are
derived render views. This remains intentionally narrow: there is no detach
interaction, T-junction surface geometry, lane-to-lane connections, or full
persisted turn/intersection editor.

**Selection & bottlenecks.** Clicking a road/intersection/traffic light on
the map shows its details in a bottom panel (a traffic light selects its
parent intersection -- there's no separate traffic-light details view
yet); clicking a bottleneck in the sidebar selects the corresponding
road/intersection (lane-level bottlenecks aren't separately selectable on
the map yet). Selection state lives in MapLibre feature-state, not in the
GeoJSON payload, so selecting something never requires rebuilding a
source's data.

**Visual quality pass (v2.1).** A first version of this map rendered
every road at its literal real-world width and every City Model
intersection as an equally-weighted node, which made the map read as an
abstract graph rather than a road network once the true-to-scale widths
collapsed to sub-pixel size at normal zoom. Fixed with: per-hierarchy
minimum pixel widths as a floor over the real-width calculation
(`ROAD_MIN_PIXEL_WIDTH`), a hierarchy-based width bonus so classes differ
even at the same lane count, filtering the intersection layer down to real
junctions (3+ connected roads) or signalized nodes at normal zoom instead
of drawing every topology node, one label per street name instead of one
per road segment (many same-named OSM segments were clustering labels
into unreadable overlap), and a muted stone-toned canvas background for
basemap-off ("Pixel Lane-only") mode instead of a stark blank/void
background. See `frontend/src/features/city-viewer/map/README.md` for
the full rationale and the exact thresholds.

**Known v2 limitations:**

- No congestion-level color overlay on the new map yet (v1's congestion
  coloring was not carried over in this pass -- see "Next steps" below).
- No 3D buildings, satellite imagery, turn-by-turn navigation UI,
  heatmaps, or emergency routing (explicitly out of scope for this pass).
- Editing is limited to moving/adding/removing a road's existing vertices
  -- no drawing new roads, splitting/merging roads, or editing
  intersections/lanes/signals from the map yet.
- No traffic-light phase animation -- a signalized intersection just shows
  a static marker indicating a light is present.
- Glyphs (map text labels) are served from MapLibre's own demo font
  endpoint even with the basemap off; self-hosting is a reasonable future
  improvement.
- Road/casing/hierarchy width numbers are calibrated for visual legibility,
  not measured from real Almaty pavement widths.

## Almaty OpenStreetMap import

Full-city workflow: `make import-almaty-full`, using OSM administrative
relation 2465058 and either a streamed regional PBF extract or cached queries
subdivided to at most 25 km². The same canonical UUID replaces the old demo
transactionally. Read [the workflow](osm-import.md) for exact commands,
unknown-data semantics, boundary provenance and update/backup behavior, and
[verification results](full-almaty-verification.md) for measured completion.

The following describes the retained **legacy demo command only**:

**Source: OpenStreetMap** (fetched via the Overpass API through the
[OSMnx](https://osmnx.readthedocs.io/) library). This is a real road
network, not a hand-built or fictional city.

```bash
make start
make import-almaty
```

then open `http://localhost:3000`, pick the imported city, and view the
real central-Almaty road network.

**Demo area, not the whole city.** Center point ≈ (43.238949, 76.889709)
(near Abay Avenue / Rozybakiev Street, central Almaty), radius 850 m
(≈1.7 km bounding-box side). This size was chosen to comfortably fit under
the City Model's existing payload-safety limits
(`MAX_ROADS_PER_CITY`/`MAX_INTERSECTIONS_PER_CITY` = 500 each, see
`app/city/domain/limits.py`) without raising them just for a bigger demo,
while still importing a dense, realistic network (roughly 180
intersections, 400+ roads, dozens of signalized intersections).

**What is and isn't real:**

- Road geometry, names, one-way/lane counts, and speed limits: real OSM
  data, mapped through documented fallbacks when a tag is missing (see
  `backend/app/city/importers/osm/defaults.py`).
- Traffic signal _presence_ (`highway=traffic_signals`): real. Traffic
  signal _timing_: **not real** -- a synthetic single "always green" phase
  placeholder, since OSM has no timing data. Clearly labeled as such in
  the imported data and in `mapper.py`.
- Traffic demand/volume: **not imported at all** -- OpenStreetMap has no
  real traffic-volume data. Running Traffic Analysis on this city produces
  network metrics with no routed demand until `TrafficDemand` entries are
  added some other way (e.g. manually, or a future synthetic-demand tool).
- Parking: not imported in this version.

**Idempotent.** `make import-almaty` uses a fixed, deterministic city id;
re-running it after the city already exists reports it instead of creating
a duplicate. See `backend/app/city/importers/osm/README.md`.

Still outside this import task: live traffic, building footprints, public
transport, SUMO, automatic periodic synchronization and vector tiles.

## High-level components (planned)

```
┌─────────────┐      ┌───────────────────┐      ┌──────────────────┐
│  2D Editor   │ ---> │    City Model      │ <--- │  Auth / Users     │
│ (UI layer)   │      │ (domain, stable)   │      │ (isolated)        │
└─────────────┘      └─────────┬─────────┘      └──────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │  Traffic Domain Logic  │
                    │  (optimization, rules) │
                    └───────────┬───────────┘
                                │
                 ┌──────────────┴──────────────┐
                 │      Simulation Adapter       │
                 │  (service/adapter boundary)   │
                 └──────────────┬──────────────┘
                                │
                    ┌────────────┴────────────┐
                    │   SUMO integration        │
                    │   (isolated, no leakage)  │
                    └────────────────────────┘

        ┌──────────────────────────┐
        │ External hardware layer   │  (planned, isolated adapter)
        └──────────────────────────┘
```

### City Model (implemented -- v1)

The stable domain representation of the city: roads, lanes, intersections,
signals, and related entities. This is the source of truth that other
components read/write against. It must not depend on the UI or on any
specific simulation backend. See "City Model v1 (implemented)" above for
the current entities, persistence design, and API.

### 2D Editor **(foundation implemented -- geometry editing only)**

A UI layer that edits and generates City Model data. It contains
presentation/interaction logic only — it does not own traffic domain rules.
The 2D Map/Editor (see "Frontend 2D Map/Editor v2" above) covers
visualization plus a first editing capability: moving/adding/removing a
road's existing vertices. Drawing new roads, editing intersections/lanes/
signals, and other structural edits are still planned.

### Traffic domain logic (implemented -- v1 analysis engine, optimization still planned)

The v1 Traffic Engine (network graph, routing, static flow assignment,
congestion/bottleneck analysis) is implemented and independently testable
without a running frontend or SUMO -- see "Traffic Engine v1" above.
Traffic _optimization_ (signal timing, route optimization) is not
implemented yet.

### Simulation adapter/service boundary **(planned -- SUMO specifically)**

The v1 Traffic Engine is its own static analysis, not a SUMO adapter.
When SUMO is integrated, it will sit behind its own adapter/service layer;
SUMO-specific concepts must not leak into the City Model or the v1 engine's
domain logic -- if SUMO were added or replaced, only that adapter should
change.

### External hardware integration **(planned)**

Any integration with physical/external hardware (sensors, signal
controllers, etc.) is isolated behind its own boundary, not scattered
through domain code.

### Auth / Users **(planned)**

Authentication and user/session management. Must not become coupled to the
core traffic engine — the traffic domain should function and be testable
without any auth dependency.

### Future module boundaries (not implemented, named for planning only)

These do not exist in the codebase today. They are named here so future
work has an agreed home instead of landing ad hoc — see
`docs/product/vision.md` and `docs/roadmap.md` for what phase introduces
each one. Do not add a package/module for any of these before its roadmap
phase actually starts.

- **Simulation Engine** (v0.2+) — vehicle-level/timestep simulation,
  distinct from the already-implemented static Traffic Engine v1. Likely
  home: `simulation/pixel_lane_simulation/` alongside the existing
  `traffic/` package, or a new sibling package if the two need materially
  different lifecycles.
- **Control Engine** (v0.3+) — adaptive signal-phase selection, corridor
  coordination, downstream-capacity-aware control logic. Must sit behind
  the same adapter/service boundary discipline as the SUMO integration
  (AGENTS.md §1): control logic must be independently testable without a
  live network or hardware.
- **Forecasting / Optimization** (v0.2–v0.4) — demand prediction and
  scenario/recommendation optimization. Must not become the same module as
  Control Engine — forecasting produces inputs a human or the Control
  Engine consumes, it does not itself decide.
- **Emergency Module** (v0.5) — emergency-vehicle priority and
  multi-intersection green-corridor logic. Depends on Control Engine
  existing first.
- **Transit Module** (v2.0, future) — public transport intelligence. Not
  scoped in detail; do not build ahead of need.
- **Vision Module** (v3.0, future) — city camera/vision intelligence. Not
  scoped in detail; do not build ahead of need.

Per `AGENTS.md`'s AI-usage principle, none of these modules may use an LLM
as the safety-critical decision-maker — deterministic algorithms,
simulation, optimization, constraints, human override, and audit logs are
the required approach for anything control- or safety-relevant.

## Architectural boundaries (hard rules)

- Core traffic logic must not depend directly on the UI.
- The City Model is the stable domain representation.
- The 2D editor edits/generates City Model data; it does not contain domain
  logic.
- Simulation sits behind an adapter/service boundary.
- SUMO integration must not leak throughout the codebase.
- External hardware integration is isolated.
- Traffic optimization logic is independently testable.
- Authentication is not coupled to the core traffic engine.
- Business/domain logic is testable without running the frontend.

## Suggested structure (feature/domain-based)

Apply where it fits the actual code — do not force it everywhere:

```
traffic/
  domain/       # entities, rules, pure logic
  services/     # orchestration, use-cases
  validators/   # input/domain validation
  adapters/     # simulation, hardware, external systems
  tests/
```

## Updating this document

When a planned component is actually implemented, update its section to
remove the "(planned)" marker and describe the real implementation, and add
it to the "Subsystems" registry and dependency-flow diagram above. Do not
let this document drift from the code — treat outdated architecture docs as
a bug (see AGENTS.md's completion checklist).
