---
name: testing
description: Guidance for choosing and writing tests for a change.
---

# Testing

## Choosing test type

- **Unit**: pure domain/business logic (traffic rules, optimization,
  validators) — should not require UI or simulation runtime.
- **Integration**: interactions between services/adapters (e.g. domain
  logic + simulation adapter).
- **API**: request/response contracts, auth, validation, error responses.
- **Component**: UI component behavior and states.
- **Regression**: added when fixing a bug, to lock in the fix.

## Rules

- Tests must validate actual behavior (real inputs/outputs, real edge
  cases) — not written just to raise coverage numbers.
- Cover the failure/edge paths relevant to the change (invalid input,
  unauthorized access, empty/boundary values), not only the happy path.
- Domain/business logic tests must not require a running frontend or full
  simulation stack, per the architecture boundaries in
  `docs/architecture.md`.
- Tests must reflect the real architecture: do not validate
  PostgreSQL-dependent behavior by substituting SQLite or another
  behaviorally different technology.

## Running

Run the smallest useful validation first (unit tests for the touched
module), then broader validation (full suite, integration, build) if the
change's scope warrants it. Report exactly what was run and its result; if a
test command isn't available/runnable, say so explicitly rather than
assuming it passed.
