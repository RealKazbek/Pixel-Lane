# Pixel Lane — Architecture

Pixel Lane is a smart-city / traffic-management platform. This document
describes the intended high-level architecture. Sections describing
components that do not exist yet are marked **(planned)**.

## Goals

Build the system core correctly before adding platform complexity. The
domain/traffic logic must remain independently testable and decoupled from
UI, simulation, and hardware concerns.

## Current implementation status

- `frontend/` — Next.js (App Router, TypeScript strict, Tailwind). Only a
  layout, a home page, and a `/health` status page exist. No auth, no 2D
  editor, no domain logic.
- `backend/` — FastAPI + Pydantic + SQLAlchemy + Alembic, PostgreSQL.
  App wiring (settings, DB session/engine, error handling, a body-size
  safeguard) plus a real domain module: **City Model v1** (`app/city/`,
  described below). No auth yet.
- `simulation/` — a Python package skeleton with a placeholder status
  check. No simulation, optimization, or SUMO code.
- `docker-compose.yml` — runs `postgres`, `backend`, `frontend` with
  healthchecks. `simulation` has no runnable service yet, so it is not
  wired into Compose.

Everything below "High-level components" describes the **target**
architecture these services will grow into — treat it as planned unless
explicitly noted otherwise.

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

**Planned: PostGIS.** Not added in v1. `Point`/`Polyline` and the
`LOCAL_CARTESIAN`/`WGS84` coordinate-system concept are deliberately
generic (not pixel-bound) so a later migration to PostGIS geometry columns
(for spatial queries -- "roads near this region") is additive rather than a
rewrite. Add it only when a real spatial-query need appears.

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

## High-level components (planned)

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

### 2D Editor **(planned)**

A UI layer that edits and generates City Model data. It contains
presentation/interaction logic only — it does not own traffic domain rules.

### Traffic domain logic **(planned)**

Optimization and traffic-rule logic, independently testable without a
running frontend or simulation engine.

### Simulation adapter/service boundary **(planned)**

Simulation (including SUMO) is accessed only through an adapter/service
layer. SUMO-specific concepts must not leak into the City Model or domain
logic — if SUMO were replaced, only the adapter should change.

### External hardware integration **(planned)**

Any integration with physical/external hardware (sensors, signal
controllers, etc.) is isolated behind its own boundary, not scattered
through domain code.

### Auth / Users **(planned)**

Authentication and user/session management. Must not become coupled to the
core traffic engine — the traffic domain should function and be testable
without any auth dependency.

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
remove the "(planned)" marker and describe the real implementation. Do not
let this document drift from the code — treat outdated architecture docs as
a bug.
