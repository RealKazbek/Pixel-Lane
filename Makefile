.PHONY: help start stop restart status ps logs build rebuild clean reset \
	frontend-dev frontend-lint frontend-typecheck frontend-build \
	backend-dev backend-lint backend-typecheck backend-test migrate migration \
	simulation-test

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
	@echo "make frontend-dev        - run frontend dev server"
	@echo "make frontend-lint       - lint frontend"
	@echo "make frontend-typecheck  - typecheck frontend"
	@echo "make frontend-build      - build frontend"
	@echo "make backend-dev         - run backend dev server"
	@echo "make backend-lint        - lint + format-check backend"
	@echo "make backend-typecheck   - typecheck backend"
	@echo "make backend-test        - run backend tests"
	@echo "make migrate             - apply backend database migrations"
	@echo "make migration msg=...   - create a new backend migration"
	@echo "make simulation-test     - run simulation package tests"

# --- Project lifecycle (Docker Compose) --------------------------------

start:
	docker compose up -d

stop:
	docker compose down

restart: stop start

status:
	docker compose ps

ps: status

logs:
	docker compose logs -f --tail=100

build:
	docker compose build

rebuild: build restart

# Removes recoverable local artifacts (stopped containers, orphans, dangling
# images). Never touches the named Postgres volume -- use `make reset` for that.
clean:
	docker compose down --remove-orphans
	docker compose rm -f
	docker image prune -f

# DESTRUCTIVE: deletes the Postgres data volume. Never run this as part of
# start/stop/restart/clean.
reset:
	@echo "WARNING: this deletes the Postgres data volume (all local city data)."
	@echo "Press Ctrl+C within 5 seconds to cancel..."
	@sleep 5
	docker compose down -v

# --- App-specific dev commands ------------------------------------------

frontend-dev:
	cd frontend && npm run dev

frontend-lint:
	cd frontend && npm run lint

frontend-typecheck:
	cd frontend && npm run typecheck

frontend-build:
	cd frontend && npm run build

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
