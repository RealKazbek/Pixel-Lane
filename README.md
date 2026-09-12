# Pixel Lane

Pixel Lane is a smart-city / traffic-management platform: a City Model,
2D editor, simulation/optimization engine, and supporting services for
designing and analyzing traffic systems.

## Status

**Early-stage.** The backend has a real domain foundation: **City Model
v1** (roads, lanes, intersections, traffic lights, traffic rules, parking,
traffic demand -- persisted in PostgreSQL via `/api/v1/cities*`) and
**Traffic Engine v1** (a framework-independent static network/routing/
congestion analysis engine in `simulation/`, exposed via `POST
/api/v1/cities/{id}/traffic-analysis`). The frontend now has a **2D
Viewer v1**: open `http://localhost:3000`, pick a city, see its road
network (roads/lanes/intersections/traffic lights/parking) on a Canvas,
run Traffic Analysis, and see congestion/bottlenecks -- read-only, no
editing yet. Authentication, the 2D *editor*, computer vision, SUMO
integration, vehicle-level simulation, and traffic optimization are not
implemented yet. See [`docs/architecture.md`](docs/architecture.md) for
what's implemented vs. planned.

## Project structure

```
pixel-lane/
  frontend/     Next.js + TypeScript + Tailwind app (App Router)
  backend/      FastAPI + SQLAlchemy + Alembic + PostgreSQL API
  simulation/   Python package foundation for the future traffic/SUMO engine
  docs/         Architecture and AI-development documentation
  docker-compose.yml
  .env.example
  AGENTS.md     Shared development policy (Claude Code + Codex)
  CLAUDE.md     Claude Code entry point
  .agents/      Local skills used by AI agents
```

## Local setup

Prerequisites: Node.js 22+, Python 3.11+, Docker (optional but recommended
for Postgres).

```bash
cp .env.example .env
# edit .env with local values (never commit it)
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head             # requires PostgreSQL running (see Docker below)
uvicorn app.main:app --reload    # http://localhost:8000
```

City Model endpoints: `POST /api/v1/cities/validate`, `POST /api/v1/cities`,
`GET /api/v1/cities/{id}`, `GET /api/v1/cities`, plus Traffic Engine's
`POST /api/v1/cities/{id}/traffic-analysis`. Two demo payloads live under
`backend/app/city/examples/`: `four_way_intersection.json` (a realistic
signalized intersection, but with movement-only demand -- no routable
traffic) and `two_intersection_corridor.json` (a minimal high-demand
corridor that *does* produce routed congestion/bottlenecks, useful for
exercising the 2D Viewer's Traffic Analysis view). POST either to
`/api/v1/cities` to try them. Database-backed tests (`pytest`) run against
real PostgreSQL and are skipped with a clear reason if it isn't reachable
-- they never fall back to SQLite.

### Simulation (foundation only)

```bash
cd simulation
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

## Development commands

A root `Makefile` wraps the common commands (`make help` for the full list):

| Command                    | Purpose                              |
|-----------------------------|---------------------------------------|
| `make start` / `make stop`  | Start/stop the stack in the background (keeps the Postgres volume) |
| `make restart`              | Stop then start the stack             |
| `make status` / `make ps`   | Show container status                 |
| `make logs`                 | Follow logs for all services          |
| `make build` / `make rebuild` | Build images / rebuild + restart    |
| `make clean`                | Remove stopped containers/orphans/dangling images (keeps data) |
| `make reset`                | **Destructive** — deletes the Postgres data volume |
| `make frontend-dev`         | Frontend dev server                   |
| `make frontend-lint`        | ESLint                                |
| `make frontend-typecheck`   | `tsc --noEmit`                        |
| `make frontend-build`       | Production build                      |
| `make frontend-test`        | Vitest unit tests                     |
| `make backend-dev`          | Backend dev server (`uvicorn --reload`)|
| `make backend-lint`         | `ruff check` + `ruff format --check`  |
| `make backend-typecheck`    | `mypy`                                |
| `make backend-test`         | `pytest`                              |
| `make migrate`              | Apply Alembic migrations              |
| `make migration msg="..."`  | Create a new Alembic migration        |
| `make simulation-test`      | Run simulation package tests          |

Frontend also exposes `npm run format` / `npm run format:check` (Prettier)
and `npm run test` (Vitest -- unit tests for the city-viewer's pure
geometry/lane-offset/analysis utilities). Backend also exposes
`ruff format` directly.

## Environment

Root `.env.example` documents the variables used by `docker-compose.yml`.
Each service also has its own `.env.example` (`frontend/.env.example`,
`backend/.env.example`) for running it outside Docker. Never commit a real
`.env` file — `.gitignore` excludes them in every service.

## Docker

```bash
cp .env.example .env
make start   # or: docker compose up -d
```

This starts PostgreSQL, the backend API (`:8000`), and the frontend
(`:3000`), with healthchecks gating startup order. The simulation service
has no runnable server yet, so it is not included in Compose — see
`simulation/README.md`.

Use `make status` / `make logs` to check on it, `make restart` after
rebuilding config, and `make stop` when done — see `make help` for the
full lifecycle command list (`start`, `stop`, `restart`, `status`, `ps`,
`logs`, `build`, `rebuild`, `clean`, and the destructive `reset`).

## What is intentionally NOT implemented yet

- Traffic-signal/route optimization, live/real-time traffic
- Vehicle-level or timestep simulation (Traffic Engine v1 is static analysis)
- Authentication and authorization (no users/ownership on the City Model
  yet)
- The 2D editor
- Computer vision
- SUMO integration
- PostGIS / spatial queries
- Production-hardened Docker/CORS/security configuration beyond safe
  development defaults

See [`AGENTS.md`](AGENTS.md) for the development policy and
[`docs/architecture.md`](docs/architecture.md) for the target architecture.
