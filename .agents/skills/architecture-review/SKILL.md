---
name: architecture-review
description: Checklist for changes that touch module boundaries or domain structure (City Model, traffic domain, simulation adapter, auth, hardware integration).
---

# Architecture review

Run this when a change crosses or could weaken a Pixel Lane boundary (see
`docs/architecture.md`).

## Checklist

- Does core traffic/domain logic stay free of UI dependencies?
- Does the change keep the City Model as the stable domain representation
  (not bypassed by ad-hoc data shapes)?
- Does the 2D editor stay limited to editing/generating City Model data,
  without absorbing domain rules?
- Is simulation access still routed through the adapter/service boundary?
- Does SUMO-specific terminology/code stay inside the SUMO adapter, not
  leak into domain or UI code?
- Is external hardware integration still isolated behind its own boundary?
- Is traffic optimization logic still testable without a UI or simulation
  runtime?
- Does auth stay decoupled from the core traffic engine?
- Is business/domain logic testable without running the frontend?
- Does the new/changed code fit an existing domain folder, or does it
  justify a new one (`domain/`, `services/`, `validators/`, `adapters/`)?

## Output

Note any boundary crossed and whether it's justified or should be
refactored. Update `docs/architecture.md` if a planned component becomes
real, or if a new boundary is introduced.
