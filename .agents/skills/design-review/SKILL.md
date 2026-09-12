---
name: design-review
description: Visual/UX checklist for UI work - responsiveness, accessibility, states, consistency. Pair with frontend-review for code-structure checks.
---

# Design review

Run this for any user-facing visual/UX change.

## Checklist

- **Responsive**: works at mobile, tablet, and desktop widths.
- **Spacing/typography**: consistent with existing scale/tokens, not
  one-off values.
- **Contrast & accessibility**: text meets contrast requirements; keyboard
  navigation works; semantic HTML used (not div-soup for interactive
  elements).
- **Interactive states**: focus, hover, disabled, error, loading, and empty
  states are all designed, not just the default state.
- **Consistency**: matches the existing visual language; reuses existing
  components and design tokens rather than introducing a new pattern.
- **No monolith pages**: layout composed of reusable pieces, not one file
  holding the entire page's markup and logic.

## Output

List any state or breakpoint not yet handled, and any inconsistency with
existing components/tokens.
