# Road/junction geometry

Pure computational geometry for turning a City Model `Road`/`Intersection`
graph into rendering-ready polygons/curves. No MapLibre or React import
belongs in this directory. `map/adapters/roadSurfaceGeometry.ts` and
`map/adapters/laneGeometry.ts` are the production rendering consumers,
and they own translating the City Model into this module's inputs and
its output back into GeoJSON `FeatureCollection`s. The Road Geometry Lab
(`dev/roadLab/`, see docs/road-geometry.md) and this directory's own
tests are also legitimate direct consumers -- the Lab exists specifically
to verify this geometry in isolation, before it's applied through the
production adapters.

## Public API

Import only from `index.ts` (`buildRoadEnvelope`, `solveJunction`,
`buildMergeTaperEnvelope`/`isMergeCandidate`, `smoothCenterline`,
`buildLaneConnectorCurve`, and the shared sizing helpers in
`nodeGeometry.ts`). Everything else here is a private implementation
detail of one of those.

## Main modules

- `nodeGeometry.ts` -- shared sizing/trim/bearing helpers used by both
  `junctionSolver.ts` and `mergeTaper.ts`: node radius, corner radius,
  endpoint matching, centerline trimming, outward tangent bearing.
- `roadEnvelope.ts` -- standalone constant-width road footprint
  (`@turf/buffer`) and explicit flat-ended corridor polygons for junctions.
- `junctionSolver.ts` -- unions explicit road-edge corridors that include
  the shared endpoint. Junctions are therefore rectangular/boundary-defined;
  they are not made from a node buffer, capsule, or central plate.
- `mergeTaper.ts` -- variable-width envelope for a slip-road/merge
  approach, used by `junctionSolver.ts` in place of a constant-width
  envelope when `isMergeCandidate` says a degree-2 node looks like a
  merge (see that file's docstring for the heuristic and its limits).
- `curveSmoothing.ts` -- render-only, independently clamped quadratic corner
  arcs driven by per-vertex smoothing values. Never applied to a source
  polyline with fewer than 3 vertices, so a straight road never gets curved.
- `laneConnection.ts` -- explicit lane-to-lane connector curve through a
  junction (a tangent-continuous cubic Bezier), distinct from decorative
  lane-separator markings -- see docs/road-geometry.md 6 for why this
  matters for future simulation/routing. Not yet wired into a production
  map layer; currently exercised by its own tests and the Lab's fixture
  tests.

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
  the only source of truth for _which_ roads should be merged into one
  junction surface. Nothing in this module infers connectivity from
  geometry -- see `roadSurfaceGeometry.ts`'s docstring.
- Junction geometry deliberately does not use a node radius. `cornerRadiusM`
  remains part of the editor contract, but the rectangular base is rendered
  sharp until a local fillet can be added without changing the corridor
  envelope.

## Where to add new code

A new geometry primitive (e.g. a real tangent-circle fillet instead of
the current Bezier-bulge approximation, or lane-through-junction
clipping) belongs here, not in `adapters/`. A new _rendering_ concern
(paint expressions, zoom gating, icons) belongs in `map/layers/`/
`map/styles/` instead -- see the top-level `map/README.md`.

## What must not depend on this module

`map/layers/` and `map/styles/` (production rendering) must never import
this module's polygon/curve types directly -- they consume the GeoJSON
`map/adapters/` produces. `dev/roadLab/` and this directory's tests are
the deliberate exception (see the top note).
