# Product vision

This document is the long-term product direction for Pixel Lane. It
describes where the product is going, not what exists today — see the root
[README](../../README.md) for current status and [docs/roadmap.md](../roadmap.md)
for the version-by-version plan. Do not read this document as a claim about
current capability.

## What Pixel Lane is becoming

Pixel Lane is an intelligent urban traffic-management and transport
digital-twin platform, primarily for government / city administration.

**Primary goal.** Reduce urban congestion and the amount of time people
lose in traffic.

**Core principle.** Optimize a connected road network, not each
intersection independently. A signal-timing or infrastructure decision at
one intersection should be evaluated by its effect on the corridor/network,
not in isolation.

## North Star

A city administration can model its real road network, simulate the effect
of a proposed change (a new signal plan, a lane reconfiguration, a closure)
before building it, and compare measured Before/After outcomes — with the
same City Model and the same Traffic Engine used for both simulation and
(eventually) supervised real-world adaptive control.

## Operating loop

```
Observe -> Understand -> Predict -> Simulate -> Decide -> Control -> Measure -> Learn
```

- **Observe** — ingest real network structure (OSM import today; future
  sensor/camera feeds).
- **Understand** — represent it faithfully in the City Model; compute
  current-state metrics (Traffic Engine).
- **Predict** — forecast demand and downstream effects (not implemented
  yet).
- **Simulate** — run scenarios against a simulation engine before touching
  the real network (not implemented yet — v0.2+).
- **Decide** — recommend or select an intervention (signal plan,
  infrastructure change, priority rule).
- **Control** — apply the decision, in simulation first, later in
  supervised live deployments (v0.3+, v1.x for live control).
- **Measure** — compute KPIs on the outcome.
- **Learn** — feed measured outcomes back into better predictions and
  recommendations.

Pixel Lane implements the early stages of this loop today (Observe,
Understand via City Model + Traffic Engine v1's static analysis); later
stages are the subject of the version roadmap.

## Problem

Urban road networks are usually managed intersection-by-intersection, with
signal timing and infrastructure decisions made from local judgment rather
than network-wide simulation. Changes are expensive and slow to reverse if
wrong, and there is rarely a rigorous, reproducible Before/After comparison
to justify them.

## Customers and users

- **Primary customer:** city / municipal transport administration (initial
  focus: Almaty).
- **Primary users:** traffic engineers and planners evaluating
  infrastructure or signal-timing changes; eventually, traffic-control-room
  operators supervising live recommendations.
- **Secondary audiences this documentation is also written for:** developers
  onboarding onto the codebase, university/academic reviewers, and
  potential government or research partners evaluating the project.

## Major use cases (target state, not all implemented)

1. Import or model a real road network as an authoritative City Model.
2. Run static or simulated traffic analysis against that network.
3. Clone a baseline scenario, edit infrastructure or signal logic, and
   compare simulated Before/After KPIs.
4. Evaluate network-wide adaptive signal control against a fixed-timing
   baseline, with downstream-capacity awareness and gridlock prevention.
5. Give an emergency vehicle a priority corridor across multiple
   intersections, with automatic recovery afterward.
6. Apply dynamic, time- or event-dependent traffic rules (reversible lanes,
   bus lanes, event plans).
7. (Later) Operate under supervised live control with operator approval,
   audit logs, and rollback.

## Scope

**Build now** (see [docs/roadmap.md](../roadmap.md) for the current phase):
City Model, topology, Demo City, Real Almaty baseline, 2D/2.5D renderer,
simulation core, scenarios, KPIs, clean API boundaries, tests, developer
workflow.

**Do not build now** (explicitly out of scope until a much later phase, if
ever): city-wide autonomous live traffic control, production automated
traffic-law enforcement, full bus fleet optimization, metro operations, a
consumer mobile app, a photorealistic city, advanced crash physics, highly
detailed pedestrian simulation, nationwide deployment, unrestricted AI
control, speculative integrations for data sources that are not actually
available.

## Non-goals (permanent, not just "not yet")

- **LLMs are never the safety-critical traffic-control brain.** Signal
  control, priority decisions, and any safety-relevant logic must be
  deterministic algorithms, simulation, optimization, and constraint-based
  logic, with human override and audit logs — never an LLM making the
  control decision itself. See `AGENTS.md`'s AI-usage principles.
- **No fabricated data presented as real.** Measured, estimated, predicted,
  and simulated values must always be distinguishable in the UI and API —
  never blended together as if all equally certain.

## Long-term vision

Full transport digital twin: live traffic state, live signal-controller
integration under human supervision, public transport intelligence, and
city-scale vision/camera intelligence — see [docs/roadmap.md](../roadmap.md)
for how this breaks into versions, and `AGENTS.md` §1 and §5 for the
architectural principles (City Model as source of truth, adapters for every
external system) that keep this reachable without a rewrite.
