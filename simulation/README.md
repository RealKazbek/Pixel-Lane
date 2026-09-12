# Pixel Lane — Simulation

Hosts the framework-independent **Traffic Engine**, and will eventually
host SUMO integration and experimentation space for traffic-optimization
algorithms.

## Purpose

- `pixel_lane_simulation.traffic` — Traffic Engine v1: a static
  network-graph / routing / capacity / congestion analysis engine (no
  FastAPI/SQLAlchemy/Pydantic/Next.js dependency). See
  `docs/architecture.md` § "Traffic Engine v1" for the full design,
  assumptions, and limitations.
- A future SUMO integration adapter (SUMO specifics stay isolated here,
  never leaking into the backend or frontend).
- Future traffic-optimization algorithm experimentation.

## Status

- **Implemented**: Traffic Engine v1 -- network graph construction,
  shortest-path routing, static flow assignment, capacity/congestion
  metrics, bottleneck detection. See `pixel_lane_simulation/traffic/`.
- **Not implemented yet**: SUMO integration, vehicle-level/timestep
  simulation, adaptive signal control, traffic optimization.

## Structure

```
simulation/
  pixel_lane_simulation/
    __init__.py
    health.py               # placeholder module status check
    traffic/
      config.py             # centralized, documented engine assumptions
      errors.py             # domain errors (fail clearly on bad topology)
      models/                # CityInput/TrafficAnalysisResult contracts
      graph/                 # network graph + builder + distance calc
      capacity/              # baseline per-lane capacity model
      routing/                # shortest-path routing
      flow/                   # static demand -> flow assignment
      metrics/                # congestion classification
      analysis/               # bottleneck detection + analyze_city() entry point
  tests/
    test_health.py
    traffic/                 # unit tests for every module above
  pyproject.toml
```

## Local development

```bash
cd simulation
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

## Public API

```python
from pixel_lane_simulation.traffic.analysis.engine import analyze_city
from pixel_lane_simulation.traffic.models.inputs import CityInput

result = analyze_city(city_input)  # CityInput -> TrafficAnalysisResult
```

The backend never imports this package's internals directly except through
`backend/app/traffic/adapter.py`, which is the only place allowed to depend
on both the backend's City schemas and this engine.
