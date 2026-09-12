# Pixel Lane

Pixel Lane is a smart-city / traffic-management platform: a City Model,
2D editor, simulation/optimization engine, and supporting services for
designing and analyzing traffic systems.

## Status

**Early-stage.** The backend now has a real domain foundation, **City
Model v1** (roads, lanes, intersections, traffic lights, traffic rules,
parking, traffic demand -- persisted in PostgreSQL via
`/api/v1/cities*`, see `docs/architecture.md`). Authentication, the 2D
editor, computer vision, SUMO integration, and traffic
optimization/simulation are not implemented yet. See
[`docs/architecture.md`](docs/architecture.md) for what's implemented vs.
planned.

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
`GET /api/v1/cities/{id}`, `GET /api/v1/cities`. A ready-to-use example
payload lives at `backend/app/city/examples/four_way_intersection.json`.
Database-backed tests (`pytest`) run against real PostgreSQL and are
skipped with a clear reason if it isn't reachable -- they never fall back
to SQLite.

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
| `make up` / `make down`     | Start/stop everything via Docker      |
| `make frontend-dev`         | Frontend dev server                   |
| `make frontend-lint`        | ESLint                                |
| `make frontend-typecheck`   | `tsc --noEmit`                        |
| `make frontend-build`       | Production build                      |
| `make backend-dev`          | Backend dev server (`uvicorn --reload`)|
| `make backend-lint`         | `ruff check` + `ruff format --check`  |
| `make backend-typecheck`    | `mypy`                                |
| `make backend-test`         | `pytest`                              |
| `make migrate`              | Apply Alembic migrations              |
| `make migration msg="..."`  | Create a new Alembic migration        |
| `make simulation-test`      | Run simulation package tests          |

Frontend also exposes `npm run format` / `npm run format:check` (Prettier).
Backend also exposes `ruff format` directly.

## Environment

Root `.env.example` documents the variables used by `docker-compose.yml`.
Each service also has its own `.env.example` (`frontend/.env.example`,
`backend/.env.example`) for running it outside Docker. Never commit a real
`.env` file — `.gitignore` excludes them in every service.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

This starts PostgreSQL, the backend API (`:8000`), and the frontend
(`:3000`), with healthchecks gating startup order. The simulation service
has no runnable server yet, so it is not included in Compose — see
`simulation/README.md`.

## What is intentionally NOT implemented yet

- Traffic optimization, routing, or live simulation
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
