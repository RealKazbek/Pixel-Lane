# Pixel Lane

Pixel Lane is an early-stage smart-city and urban traffic-management platform for modelling road networks, inspecting infrastructure, and running static traffic analysis. Its persistent City Model, map/editor workflow, and simulation-ready boundaries support future municipal traffic-engineering work without claiming live control features today.

**Primary goal.** Reduce urban congestion and the amount of time people lose in traffic, by giving city administrations a shared, authoritative model of the road network to observe, simulate, and (eventually, under human supervision) control.

**Primary customer.** Government / city administration (initial focus: Almaty). See [docs/product/vision.md](docs/product/vision.md) for the full customer/user breakdown.

**Current priority.** Phase 0 foundation and v0.1 City Model (see Status below and [docs/roadmap.md](docs/roadmap.md)). The project's first major proof milestone is later, at v0.3: demonstrate, on a reproducible multi-intersection scenario, that coordinated adaptive signal control measurably reduces congestion relative to fixed timing.

**Long-term direction.** Pixel Lane's target is a transport digital-twin platform for government/city administration: model a real network, simulate proposed changes before building them, and compare measured Before/After outcomes, working toward network-wide adaptive signal control and (eventually, under human supervision) live control. See [docs/product/vision.md](docs/product/vision.md) for the full vision and non-goals, and [docs/roadmap.md](docs/roadmap.md) for what's implemented today versus planned. Nothing in this section describes a current capability — see the status table below for that.

## Status

| Capability | Status |
| --- | --- |
| City Model v1 / PostgreSQL | Implemented |
| Traffic Engine v1 static analysis | Implemented |
| Almaty OSM import | Implemented |
| MapLibre map and limited road geometry editing | Implemented |
| Map congestion overlay | Pending |
| SUMO, adaptive signals, advanced editing | Planned |

## What it does today

- Stores cities, roads, lanes, intersections, traffic lights, rules, parking, and demand in PostgreSQL.
- Runs framework-independent static routing, capacity, congestion, and bottleneck analysis.
- Imports a bounded real OpenStreetMap road-network sample for central Almaty.
- Renders the City Model in MapLibre; Terra Draw temporarily edits an existing road polyline before the backend persists it.

## Architecture

```mermaid
flowchart TD
  F[Next.js map/editor] -->|HTTP| A[FastAPI API]
  A --> S[Application services]
  S --> C[City Model]
  C --> P[(PostgreSQL)]
  S --> T[Traffic adapter] --> E[Traffic Engine v1]
  O[OSM importer] --> C
```

The City Model is authoritative. MapLibre GeoJSON, basemaps, and Terra Draw state are presentation/editing infrastructure only. See [architecture](docs/architecture.md).

## Quick start

Prerequisites: Docker Desktop, Make, Node.js 22+, and Python 3.11+ for local service work.

```bash
cp .env.example .env
# Set local development values; never commit .env.
make start
```

Open `http://localhost:3000`; API docs are at `http://localhost:8000/docs`. `make start` uses `docker compose up -d --build`, so it refreshes baked source rather than silently serving a stale image. Use `make status`, `make logs`, `make stop`, and `make help` for the lifecycle; `make reset` is destructive.

## Almaty demo

Install the isolated OSM extra in `backend/.venv`, then run `make start` and `make import-almaty`. The deterministic import is idempotent. OSM provides network attributes and signal presence, not demand volumes or signal timing. See [OSM import](docs/osm-import.md).

## Roadmap summary

Pixel Lane is currently in **Phase 0 / v0.1 (City Model)**: the persisted
City Model, Demo City, Real Almaty import, and map/editor above are
implemented; **v0.2 (Traffic Simulation Core)** — vehicle-level simulation
on top of today's static Traffic Engine — is next. Network-wide adaptive
signal control (v0.3), scenario comparison (v0.4), emergency priority
(v0.5), dynamic rules (v0.6), and a government pilot (v1.0) are later,
unimplemented phases. See [docs/roadmap.md](docs/roadmap.md) for the full,
per-item Implemented/In progress/Next/Planned/Future breakdown.

## Development and documentation

**New developer or AI agent?** Start at
[docs/developer-onboarding.md](docs/developer-onboarding.md) — a single,
ordered path through setup, task-picking, workflow, AI use, and Definition
of Done. Everything below is reachable from there too.

- [Documentation index](docs/README.md)
- [Product vision](docs/product/vision.md)
- [Roadmap](docs/roadmap.md)
- [Development guide](docs/development.md)
- [Project management](docs/development/project-management.md) — task lifecycle, branch naming, Notion ↔ GitHub split
- [Configuration](docs/configuration.md)
- [Testing](docs/testing.md)
- [Contributing](CONTRIBUTING.md)

**Team workspace.** Task tracking, ownership, epics, and product decisions
are managed in Notion — [Pixel Lane — Project Guide](https://app.notion.com/p/3dc56325f84081c79e59ece0a7be12d4)
→ Development Workspace. This repository is canonical for code,
architecture, contracts, and implementation history; see
[docs/development/project-management.md](docs/development/project-management.md)
for the full split.

`AGENTS.md` is the authoritative project policy for contributors and AI agents. The project currently has no license file; do not assume reuse rights until one is added.
