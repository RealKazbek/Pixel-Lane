---
name: frontend-review
description: Checklist for UI/component changes - structure, state handling, reuse. Pair with design-review for visual/UX checks.
---

# Frontend review

Run this for UI/component changes.

## Checklist

- Component has one clear responsibility; no giant page component holding
  all logic and markup.
- Business/domain logic lives outside the component (hooks/services), not
  inlined in the UI layer.
- Reused an existing project component/pattern instead of inventing a new
  one, where one already solves the problem.
- States handled: loading, empty, error, disabled — not just the happy
  path.
- No duplicate logic copy-pasted across components.
- Props/state kept minimal and clearly named.
- For anything visual/UX-facing, also run `design-review`.

## Output

Note any component split recommended, any duplicated logic found, and
whether existing components were reused.
