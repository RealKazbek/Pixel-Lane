# Roadmap

Every item below is labeled **Implemented**, **In progress**, **Next**,
**Planned**, or **Future**. "Supported"/"works" is never used for a stub or
concept — see the root [README](../README.md) for the current capability
table and [docs/product/vision.md](product/vision.md) for the long-term
direction this roadmap serves.

## Phase 0 — Foundation and restructuring

| Item                                            | Status                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canonical product documentation                 | Implemented (this pass)                                                                                                                                                                                                                                                                                |
| Clear module boundaries (`AGENTS.md` §1, §19)   | Implemented                                                                                                                                                                                                                                                                                            |
| Architecture contracts (`docs/architecture.md`) | Implemented                                                                                                                                                                                                                                                                                            |
| Clean developer onboarding                      | Implemented (`docs/developer-onboarding.md`)                                                                                                                                                                                                                                                           |
| Demo City                                       | Implemented (Demo District, `make seed-demo-city`)                                                                                                                                                                                                                                                     |
| Real Almaty baseline                            | Implemented (full-city import, see `docs/full-almaty-verification.md`)                                                                                                                                                                                                                                 |
| Developer workflow                              | Implemented (`docs/development.md`, Makefile targets)                                                                                                                                                                                                                                                  |
| Tests / CI expectations                         | Implemented — `.github/workflows/ci.yml` runs check-agents, frontend, backend (with an isolated PostgreSQL service container), and simulation checks on every PR against `main` (see `docs/testing.md`); not yet a required status check in branch protection — see the `Developer Platform / CI` epic |

## v0.1 — City Model

| Item                                                                                       | Status                                                                                                                                          |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Road / Lane / Intersection topology                                                        | Implemented (`docs/city-model.md`)                                                                                                              |
| Signals (presence + phases)                                                                | Implemented; real-world signal _timing_ is not imported from OSM (synthetic placeholder phase only)                                             |
| Parking                                                                                    | Implemented (`ParkingZone`)                                                                                                                     |
| Stops                                                                                      | Implemented (`BusStop`)                                                                                                                         |
| Markings (turn arrows, bus/cycle lane rendering)                                           | Implemented for rendering; no dedicated pavement-marking domain entity                                                                          |
| Import pipeline                                                                            | Implemented (OSM import, Demo City generator)                                                                                                   |
| One authoritative City Model shared by rendering, editing, analytics                       | Implemented; **shared by simulation is Planned** — no simulation engine consumes the City Model yet                                             |
| Full lane/intersection structural editor (draw new roads, edit lanes/signals from the map) | Planned — current editor has a local MVP for drawing roads and inserting/moving vertices, but no persisted structural lane/intersection editing |

## v0.2 — Traffic Simulation Core

| Item                                                                            | Status                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static routing, capacity, congestion, and bottleneck analysis                   | Implemented — **Traffic Engine v1** (`simulation/pixel_lane_simulation/traffic/`), a framework-independent static analyzer: deterministic shortest-path routing, flat per-lane capacity, volume/capacity congestion classification. See `docs/traffic-engine.md`. |
| Vehicle-level / timestep simulation                                             | Next — not implemented; Traffic Engine v1 is explicitly static, not a simulation                                                                                                                                                                                  |
| Lane following, intersection movement, signal compliance, queues, lane changing | Next                                                                                                                                                                                                                                                              |
| Configurable traffic demand                                                     | In progress — manually-entered `TrafficDemand` exists in the City Model; no synthetic-demand generation tool yet                                                                                                                                                  |
| Vehicle types                                                                   | Planned                                                                                                                                                                                                                                                           |
| Deterministic simulation, traffic KPIs beyond static congestion metrics         | Planned                                                                                                                                                                                                                                                           |

## v0.3 — Network Adaptive Signals

| Item                                                                                                                                                                                                       | Status                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Multiple connected intersections, downstream-capacity awareness, queue prediction, gridlock prevention, adaptive phase selection, corridor coordination, fixed-timing baseline vs. adaptive A/B comparison | Future — depends on v0.2's simulation core existing first |

**Main proof for this phase:** demonstrate measurable congestion
improvement against fixed signal timing, reproducibly.

## v0.4 — Engineering Scenario Lab

Clone-baseline / edit-infrastructure / Before-after KPI comparison /
bottleneck visualization / saved scenarios / reports / first recommendation
engine — **Future**.

## v0.5 — Emergency Priority

Ambulance/fire/police priority, urgency levels, route-aware signal
priority, multi-intersection green corridor, network recovery — **Future**.

## v0.6 — Dynamic Rules

Reversible lanes, time-dependent bus lanes, parking windows, temporary
closures, turn restrictions, special-event traffic plans — **Future**.

## v1.0 — Government Pilot

Real selected Almaty corridor/district, reliable City Model, traffic
simulation, adaptive control in simulation, engineering scenarios,
emergency priority, live/replayed sensor adapters where available, operator
dashboard, audit logs, roles, manual override, safe deployment — **Future**.

## v1.x — Supervised Live Control

Live traffic state, live signal-controller integration, recommendation
mode, operator approval mode, bounded active control, fallback/rollback,
health monitoring — **Future**. LLMs are never the control decision-maker
for this phase — see `docs/product/vision.md`'s non-goals.

## v2.0 — Public Transport Intelligence / v3.0 — City Vision / v4.0 — Full Transport Digital Twin

Long-term vision, not scoped in detail yet — **Future**. See
[docs/product/vision.md](product/vision.md).

## What "In progress / Next" means concretely today

Isolated test database safety, a MapLibre congestion overlay, map visual
polish, self-hosted glyphs, better lane visualization, and intersection
editing — these are the next increments inside v0.1/v0.2, not new phases.
