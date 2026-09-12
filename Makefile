.PHONY: help check-env start stop restart status ps logs build rebuild clean reset \
	start-db stop-db start-backend resources \
	frontend-dev frontend-lint frontend-typecheck frontend-build frontend-test \
	backend-dev backend-lint backend-typecheck backend-test migrate migration \
	simulation-test import-almaty

help:
	@echo "Pixel Lane development commands"
	@echo ""
	@echo "make start      Start the development stack (docker compose up -d)"
	@echo "make stop       Stop the stack (keeps the Postgres volume)"
	@echo "make restart    Restart the stack (stop + start)"
	@echo "make status     Show service status (docker compose ps)"
	@echo "make ps         Alias for 'make status'"
	@echo "make logs       Follow logs for all services (Ctrl+C to exit)"
	@echo "make build      Build project Docker images"
	@echo "make rebuild    Rebuild images and restart the stack"
	@echo "make clean      Remove stopped containers/orphans and dangling images"
	@echo "make reset      DESTRUCTIVE: stop the stack and delete the Postgres volume"
	@echo "make help       Show this help"
	@echo ""
	@echo "Lightweight subsets (use the smallest one your task needs):"
	@echo "make start-db       Start only PostgreSQL (e.g. for a migration)"
	@echo "make stop-db        Stop only PostgreSQL"
	@echo "make start-backend  Start only PostgreSQL + backend (no frontend)"
	@echo "make frontend-dev   Run the frontend alone, no Docker at all"
	@echo "make resources      Show CPU/memory usage of running containers"
	@echo ""
	@echo "make frontend-dev        - run frontend dev server"
	@echo "make frontend-lint       - lint frontend"
	@echo "make frontend-typecheck  - typecheck frontend"
	@echo "make frontend-build      - build frontend"
	@echo "make frontend-test       - run frontend unit tests"
	@echo "make backend-dev         - run backend dev server"
	@echo "make backend-lint        - lint + format-check backend"
	@echo "make backend-typecheck   - typecheck backend"
	@echo "make backend-test        - run backend tests"
	@echo "make migrate             - apply backend database migrations"
	@echo "make migration msg=...   - create a new backend migration"
	@echo "make simulation-test     - run simulation package tests"
	@echo "make import-almaty       - import the Almaty, Kazakhstan OSM demo city"
	@echo "                           (one-time: pip install -e '.[osm]' in backend/.venv first)"

# --- Project lifecycle (Docker Compose) --------------------------------

# docker-compose.yml requires POSTGRES_PASSWORD etc. from .env -- fail with
# a clear message instead of letting `docker compose` error out obscurely.
# Never auto-create, overwrite, or delete .env here: it is persistent local
# developer configuration, not a temporary file -- only the developer
# creates or resets it.
check-env:
	@if [ ! -f .env ]; then \
		echo "Missing .env file."; \
		echo ""; \
		echo "Create it with:"; \
		echo "  cp .env.example .env"; \
		exit 1; \
	fi

start: check-env
	# --build so a stale, already-built image is never silently served
	# after a code change -- normal Docker layer caching keeps this cheap
	# when nothing actually changed (see AGENTS.md's resource-efficiency
	# rules: this is a correctness fix, not a `--no-cache` rebuild).
	docker compose up -d --build

stop: check-env
	docker compose down

restart: stop start

status: check-env
	docker compose ps

ps: status

logs: check-env
	docker compose logs -f --tail=100

build: check-env
	docker compose build

rebuild: build restart

# Removes recoverable local artifacts (stopped containers, orphans, dangling
# images). Never touches the named Postgres volume -- use `make reset` for that.
clean: check-env
	docker compose down --remove-orphans
	docker compose rm -f
	docker image prune -f

# DESTRUCTIVE: deletes the Postgres data volume. Never run this as part of
# start/stop/restart/clean. Never deletes .env -- data and local
# configuration are different things.
reset: check-env
	@echo "WARNING: this deletes the Postgres data volume (all local city data)."
	@echo "Press Ctrl+C within 5 seconds to cancel..."
	@sleep 5
	docker compose down -v

# --- Lightweight subsets (8 GB RAM dev machine: use the smallest one a
# task actually needs, instead of always running the full stack) --------

start-db: check-env
	docker compose up -d postgres

stop-db: check-env
	docker compose stop postgres

# Backend work needs Postgres but not the frontend container; for
# frontend-only work, prefer `make frontend-dev` (no Docker at all).
start-backend: check-env
	docker compose up -d postgres backend

# Quick view of what's actually using CPU/RAM right now.
resources:
	@if ! docker info >/dev/null 2>&1; then \
		echo "Docker is not running."; \
		exit 1; \
	fi
	docker stats --no-stream

# --- App-specific dev commands ------------------------------------------

frontend-dev:
	cd frontend && npm run dev

frontend-lint:
	cd frontend && npm run lint

frontend-typecheck:
	cd frontend && npm run typecheck

frontend-build:
	cd frontend && npm run build

frontend-test:
	cd frontend && npm run test

backend-dev:
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload

backend-lint:
	cd backend && . .venv/bin/activate && ruff check . && ruff format --check .

backend-typecheck:
	cd backend && . .venv/bin/activate && mypy app

backend-test:
	cd backend && . .venv/bin/activate && pytest

migrate:
	cd backend && . .venv/bin/activate && alembic upgrade head

migration:
	cd backend && . .venv/bin/activate && alembic revision --autogenerate -m "$(msg)"

simulation-test:
	cd simulation && . .venv/bin/activate && pytest

# One-shot import of the Almaty, Kazakhstan OSM demo city (see
# docs/architecture.md's "Almaty OpenStreetMap demo" section). Idempotent:
# re-running it after the city already exists just reports it, no
# duplicate is created. Requires `pip install -e '.[osm]'` in
# backend/.venv (a separate, optional dependency group -- see
# backend/app/city/importers/osm/README.md).
import-almaty: check-env start-db
	cd backend && . .venv/bin/activate && \
	DATABASE_URL=$${DATABASE_URL:-postgresql+psycopg://pixel_lane:change-me@localhost:5432/pixel_lane} \
	python -m app.city.importers.osm.cli
