# Road/junction geometry

Pure computational geometry for turning a City Model `Road`/`Intersection`
graph into rendering-ready polygons. No MapLibre or React import belongs
in this directory -- `map/adapters/roadSurfaceGeometry.ts` and
`map/adapters/laneGeometry.ts` are the only consumers, and they own
translating the City Model into this module's inputs and its output back
into GeoJSON `FeatureCollection`s.

## Public API

Import only from `index.ts` (`buildRoadEnvelope`, `solveJunction`,
`buildMergeTaperEnvelope`/`isMergeCandidate`, `smoothCenterline`, and the
shared sizing helpers in `nodeGeometry.ts`). Everything else here is a
private implementation detail of one of those.

## Main modules

- `nodeGeometry.ts` -- shared sizing/trim/bearing helpers used by both
  `junctionSolver.ts` and `mergeTaper.ts`: node radius, corner radius,
  endpoint matching, centerline trimming, outward tangent bearing.
- `roadEnvelope.ts` -- constant-width road footprint (`@turf/buffer`).
- `junctionSolver.ts` -- the actual junction-quality fix: trims incident
  roads back from a node, builds a convex-hull "plate" from their
  edge points, rounds the plate's inter-road corners into curb-return
  fillets, and unions everything into one seamless junction surface. See
  its docstring for the full algorithm and why a naive
  buffer-then-union of full-length roads produces miter spikes.
- `mergeTaper.ts` -- variable-width envelope for a slip-road/merge
  approach, used by `junctionSolver.ts` in place of a constant-width
  envelope when `isMergeCandidate` says a degree-2 node looks like a
  merge (see that file's docstring for the heuristic and its limits).
- `curveSmoothing.ts` -- Catmull-Rom centerline resampling. Never applied
  to a source polyline with fewer than 3 vertices, so a straight road
  never gets curved.

## Important invariants

- Every builder returns `null`/an empty result on degenerate input
  (fewer than 2 points, non-positive width, a failed buffer/union) --
  never `NaN`/`Infinity` coordinates and never a thrown exception that
  would break the whole map render for one bad road.
- `solveJunction` never assumes a particular junction shape (2-road
  continuation, T, X, Y, acute, asymmetric width) -- one algorithm
  degrades gracefully for all of them; see its own regression tests
  (`../__tests__/junctionSolver.test.ts`) for one fixture per case.
- `Intersection.connected_road_ids` (the City Model's real topology) is
  the only source of truth for *which* roads should be merged into one
  junction surface. Nothing in this module infers connectivity from
  geometry -- see `roadSurfaceGeometry.ts`'s docstring.
- `PLATE_DILATION_M` in `junctionSolver.ts` (a ~3cm outward nudge before
  the final union) works around a numerical-robustness limitation of the
  polygon-clipping library behind `@turf/union` when two input polygons
  share an exactly-coincident vertex (common here, since the plate's own
  vertices are derived from the road envelopes it's about to be unioned
  with) -- not a visual design choice.

## Where to add new code

A new geometry primitive (e.g. a real tangent-circle fillet instead of
the current Bezier-bulge approximation, or lane-through-junction
clipping) belongs here, not in `adapters/`. A new *rendering* concern
(paint expressions, zoom gating, icons) belongs in `map/layers/`/
`map/styles/` instead -- see the top-level `map/README.md`.

## What must not depend on this module

Nothing outside `map/adapters/` should import from here directly --
`map/layers/` and `map/styles/` consume the GeoJSON `adapters/` produces,
never this module's polygon types.
