# OSM Importer (`backend/app/city/importers/osm`)

## Purpose

Imports a real road network from OpenStreetMap into the City Model. Ships
one demo workflow today: `make import-almaty` (a bounded, central-Almaty
demo area — see `docs/architecture.md` § "Almaty OpenStreetMap demo").

## Public API

- `import_city_from_osm(db, ImportRequest(...))` (`importer.py`) — fetch,
  normalize, map, validate, and persist in one call. Idempotent: if
  `ImportRequest.city_id` already exists, returns it unchanged instead of
  re-fetching/re-inserting.
- CLI: `python -m app.city.importers.osm.cli` (wired to `make
  import-almaty`) — same pipeline with step-by-step progress output.

## Main modules

`client.py` (osmnx fetch; the **only** module allowed to import osmnx) →
`normalization.py` (pure: graph → `NormalizedNetwork`, no osmnx import) →
`mapper.py` (pure: `NormalizedNetwork` → `CityCreate`, no osmnx/networkx
import) → `importer.py` (orchestration, via `app.city.services.city_service`
— never the repository/validator directly) → `cli.py` (one-shot terminal
entry point). `defaults.py` centralizes every fallback assumption;
`errors.py` holds this package's domain errors.

## Dependency direction

`cli` → `importer` → `client`/`mapper` → `normalization`. `mapper.py` and
`normalization.py` depend only on the City Model schemas/domain and the
standard library — never on osmnx or networkx.

## Important invariants

- **osmnx is an isolated, optional dependency** (`backend[osm]` extra).
  The core backend runtime, City Model, Traffic Engine, and frontend must
  never import osmnx or this package.
- **Deterministic ids**: every imported entity's UUID is a UUID5 derived
  from its OSM node/way/key identity, so re-running an import is
  idempotent and ids are stable for future diff/update logic. Never
  `uuid4()` for OSM-derived entities.
- **One Road per directed OSM edge.** OSMnx already simplifies the graph
  to topology nodes; every graph node becomes one Intersection and every
  directed edge becomes one Road with lanes only in that edge's own
  direction (see `mapper.py`'s module docstring for why this avoids
  pairing up bidirectional edges without losing information).
- **No real traffic data is invented.** No `TrafficDemand` is imported.
  Signal phases are an explicit, documented synthetic single-phase
  placeholder — OSM does not provide real signal timing.
- Unit tests (`tests/city/importers/`) never hit the network; only
  `client.py`'s actual OSM fetch is untested by automation (manual test
  only).

## Where to add new code

A new OSM tag to map (e.g. turn restrictions) gets a parser function in
`normalization.py` and a mapping rule in `mapper.py` — keep them as
separate, individually testable pure functions rather than growing either
module's main function.

## What must not depend on this module

Nothing outside `backend/app/city/importers/osm` and its CLI entry point.
City Model, Traffic Engine, and frontend code must have zero references to
OSM-specific concepts.
