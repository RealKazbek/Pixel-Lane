---
name: performance-review
description: Checklist for hot paths - simulation loops, rendering, large data processing.
---

# Performance review

Run this for changes to simulation loops, rendering code, or large data
processing (e.g. City Model operations over many entities).

## Checklist

- No obviously quadratic or worse algorithms on data that scales with city
  size (roads, lanes, vehicles).
- No redundant recomputation inside a render/simulation tick that could be
  cached or memoized.
- No N+1 queries or repeated I/O inside a loop.
- Large payloads are paginated/streamed rather than loaded wholesale, where
  applicable.
- Any added dependency or computation on a hot path is justified — prefer
  simple over clever, but don't ignore a known-bad pattern for simplicity's
  sake.

## Output

Note any hot path touched, its complexity characteristics, and any
optimization considered but deliberately not applied (with reason).
