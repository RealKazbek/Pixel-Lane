# Pixel Lane — Architecture

Pixel Lane is a smart-city / traffic-management platform. This document
describes the intended high-level architecture. Sections describing
components that do not exist yet are marked **(planned)**.

## Goals

Build the system core correctly before adding platform complexity. The
domain/traffic logic must remain independently testable and decoupled from
UI, simulation, and hardware concerns.

## Current implementation status

The repository currently has a minimal three-service skeleton and nothing
else — no domain/traffic logic exists yet.

- `frontend/` — Next.js (App Router, TypeScript strict, Tailwind). Only a
  layout, a home page, and a `/health` status page exist. No auth, no 2D
  editor, no domain logic.
- `backend/` — FastAPI + Pydantic + SQLAlchemy + Alembic. Only app wiring
  exists: settings, DB session/engine, a versioned `/api/v1/health`
  endpoint, a generic error handler, and an empty Alembic setup (no models,
  no migrations). No domain models, no auth.
- `simulation/` — a Python package skeleton with a placeholder status
  check. No simulation, optimization, or SUMO code.
- `docker-compose.yml` — runs `postgres`, `backend`, `frontend` with
  healthchecks. `simulation` has no runnable service yet, so it is not
  wired into Compose.

Everything below this section describes the **target** architecture these
services will grow into — treat it as planned unless explicitly noted
otherwise above.

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

### City Model **(planned)**

The stable domain representation of the city: roads, lanes, intersections,
signals, and related entities. This is the source of truth that other
components read/write against. It must not depend on the UI or on any
specific simulation backend.

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
