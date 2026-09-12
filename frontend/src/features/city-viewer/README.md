# City Viewer (`frontend/src/features/city-viewer`)

## Purpose

A read-only 2D Canvas visualization of a persisted City Model and its
Traffic Analysis results. See `docs/architecture.md` § "Frontend 2D Viewer
v1" for the full design and its limitations (read-only, no GIS basemap,
WGS84 rendering is an approximate projection).

## Public API

`components/CityViewerApp.tsx` — the feature's entry component, rendered
by `src/app/page.tsx`. Nothing else in this feature is meant to be
imported from outside it.

## Main modules

`types/` (mirrors the backend's City/TrafficAnalysis API contracts) →
`api/` (the only `fetch()` calls: `getCities`/`getCity`/
`runTrafficAnalysis`) → `lib/` (pure functions: geometry/viewport
transform, WGS84 projection, lane-offset approximation, congestion colors,
analysis lookup, hit-testing — no React, no Canvas) → `state/` (layer
visibility, selection types) → `hooks/` (data fetching, pan/zoom viewport,
resize, dark-mode) → `components/canvas` (pure `draw-*.ts` functions plus
a thin React wrapper), `components/sidebar`, `components/details`.

## Dependency direction

`components` → `hooks` → `lib`/`api`/`state` → `types`. Drawing logic
(`components/canvas/draw-*.ts`, `renderer.ts`) takes a plain scene object
and a `CanvasRenderingContext2D` — no React state inside it.

## Important invariants

- No animation loop: the canvas redraws only when city/analysis/viewport/
  layers/selection/size actually change.
- No Canvas/mapping library dependency (Three.js, Konva, PixiJS, Leaflet,
  Mapbox, deck.gl) — plain Canvas 2D is enough for v1 and keeps runtime
  cost low (see AGENTS.md's resource-efficiency rules).

## Where to add new code

A new entity type to visualize gets its own `draw-*.ts` in
`components/canvas/`, wired into `renderer.ts`'s draw order, plus a details
component under `components/details/` if it's selectable.

## What must not depend on this module

Nothing outside `frontend/src/app/page.tsx` should import from this
feature. This feature must not contain City Model or Traffic Engine domain
logic — it only calls the REST API and renders what comes back.
