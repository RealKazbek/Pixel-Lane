.PHONY: help up down frontend-dev frontend-lint frontend-typecheck frontend-build \
	backend-dev backend-lint backend-typecheck backend-test migrate migration \
	simulation-test

help:
	@echo "make up                  - start frontend, backend, postgres via Docker Compose"
	@echo "make down                - stop Docker Compose services"
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

up:
	docker compose up --build

down:
	docker compose down

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
