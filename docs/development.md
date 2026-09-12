# Development guide

## Setup and Docker

Install Docker Desktop, Make, Node.js 22+, and Python 3.11+. Copy `.env.example` to `.env`; never replace or commit it. Run `make start` to build and start PostgreSQL, backend (`:8000`), and frontend (`:3000`). It deliberately uses `docker compose up -d --build`: images bake source, and this prevents the historical stale-image problem.

Use `make status`, `make logs`, `make stop`, `make start-db`, `make start-backend`, and `make resources`. `make reset` deletes the database volume.

## Local services

`make frontend-dev` runs Next locally. For backend work, create `backend/.venv`, install `-e ".[dev]"`, run `make start-db`, `make migrate`, then `make backend-dev`. Create migrations with `make migration msg="description"`.

## Checks

Use `make frontend-lint`, `make frontend-typecheck`, `make frontend-test`, `make frontend-build`, `make backend-lint`, `make backend-typecheck`, and `make simulation-test`. Read [testing](testing.md) before backend pytest.

## OSM demo

Install `backend[osm]` in the backend virtualenv, run `make start`, then `make import-almaty`.
