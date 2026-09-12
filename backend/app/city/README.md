# City Model (`backend/app/city`)

## Purpose

The persisted domain model of a city's road network: roads, lanes,
intersections, traffic lights, traffic rules, parking zones, and
manually-entered traffic demand. The source of truth other subsystems
(Traffic Engine, future 2D Editor) read from and write to.

## Public API

- `app.city.services.city_service` — `validate_city_payload`,
  `create_city`, `get_city`, `list_cities`. Callers (routes, other
  services) should go through this, not the repository or validator
  directly.
- REST: `POST /api/v1/cities/validate`, `POST /api/v1/cities`,
  `GET /api/v1/cities/{id}`, `GET /api/v1/cities` (`app/city/api/`).
- `app.city.schemas.city.CityCreate` / `CityRead` — the API contract.

## Main modules

`domain/` (framework-independent enums, geometry, limits) → `schemas/`
(Pydantic API contracts) → `models/` (SQLAlchemy ORM) → `validators/`
(cross-reference/business-rule checks) → `repositories/` (transactional
persistence + ORM graph building) → `services/` (orchestration) →
`api/` (thin FastAPI routes). `examples/` holds reusable demo City
payloads (not application code).

## Dependency direction

`api` → `services` → `validators`/`repositories` → `models`/`schemas` →
`domain`. Routes never touch SQLAlchemy directly.

## Important invariants

- Client-supplied UUIDs on every nested entity (so a payload can reference
  itself before persistence).
- Structural validation is Pydantic's job; cross-reference validation
  (`validators/city_validator.py`) is separate and pure (no DB).
- Creating a City is one transaction — never partially persisted.

## Where to add new code

New City Model entities/fields follow the existing
domain → schemas → models → validators → repositories → services → api
layering. New cross-reference rules go in `validators/city_validator.py`.

## What must not depend on this module

Nothing outside the backend should import from `app.city` directly except
through the documented service functions and REST API. The Traffic Engine
(`simulation/pixel_lane_simulation/traffic/`) must not import `app.city`
at all — see `backend/app/traffic/adapter.py` for the one-way translation.
