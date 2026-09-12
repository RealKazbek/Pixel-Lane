# Pixel Lane — Simulation

Foundation for the future traffic simulation service.

## Purpose

This module will eventually host:

- the traffic engine's simulation runtime
- a SUMO integration adapter (SUMO specifics stay isolated here, never
  leaking into the backend or frontend — see `docs/architecture.md`)
- experimentation space for traffic-optimization algorithms

None of that is implemented yet. This directory currently only provides a
minimal, testable package skeleton so the module can be built out later
without restructuring.

## Status

- No traffic algorithms implemented.
- No SUMO integration installed or wired up yet.
- Only a package structure and a placeholder health check exist.

## Structure

```
simulation/
  pixel_lane_simulation/
    __init__.py
    health.py       # placeholder check, no simulation logic
  tests/
    test_health.py
  pyproject.toml
```

## Local development

```bash
cd simulation
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest
```
