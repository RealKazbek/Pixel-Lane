# Traffic Engine (`pixel_lane_simulation.traffic`)

## Purpose

A framework-independent static traffic-analysis engine: builds a network
graph from a city, assigns manually-entered demand onto shortest routes,
and reports capacity/congestion/bottleneck metrics. See
`docs/architecture.md` § "Traffic Engine v1" for the full pipeline and its
documented v1 limitations (static assignment, no SUMO, no signal timing).

## Public API

```python
from pixel_lane_simulation.traffic.analysis.engine import analyze_city

result = analyze_city(city_input)  # CityInput -> TrafficAnalysisResult
```

`TrafficEngine(config).analyze(city)` if a non-default `TrafficEngineConfig`
is needed across multiple calls.

## Main modules

`models/` (its own `CityInput`/`TrafficAnalysisResult` contracts) →
`graph/` (network graph + builder + distance calc) → `capacity/` (baseline
capacity model) → `routing/` (shortest-path) → `flow/` (static demand
assignment) → `metrics/` (congestion classification) → `analysis/`
(bottleneck detection + the `analyze_city`/`TrafficEngine` entry point).
`config.py` centralizes every tunable assumption; `errors.py` holds domain
errors raised on inconsistent network data.

## Dependency direction

`analysis` → `flow`/`metrics` → `routing`/`capacity` → `graph` → `models`.
Nothing in this package imports anything outside it.

## Important invariants

- No FastAPI/SQLAlchemy/Pydantic/React/Canvas/PostgreSQL/SUMO dependency,
  ever. This package must stay importable and testable standalone.
- Fails clearly (`InvalidNetworkTopologyError`, `UnknownReferenceError`) on
  network data it cannot resolve, rather than silently ignoring it.

## Where to add new code

New analysis steps get their own module under the matching directory
(e.g. a new metric under `metrics/`) and are wired into
`analysis/engine.py`'s pipeline — don't grow `engine.py` itself into a
god-module.

## What must not depend on this module

Nothing — this is a leaf dependency other subsystems consume. It must
never import from `backend/app/*`; `backend/app/traffic/adapter.py` is the
only place allowed to depend on both this package and the backend's City
schemas.
