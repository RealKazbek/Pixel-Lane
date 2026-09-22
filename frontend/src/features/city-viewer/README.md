# City Model viewer/editor (`frontend/src/features/city-viewer`)

## Purpose

A MapLibre-based rendering and editor surface for the City Model. The current
product page uses a local editor workspace for road geometry MVP flows; the
backend City Model and generic geometry API remain the authoritative
persistence boundary.

## Public API

`components/CityViewerApp.tsx` is the feature entry component. Internal map,
geometry, adapter, and editor modules are feature-scoped.

## Main modules

`types/` mirrors City Model contracts; `api/` owns fetch calls; `map/` contains
MapLibre setup, GeoJSON adapters, pure geometry, layers, styles, and editor
interaction; `world/terrain/` contains provider-neutral elevation contracts
and the isolated MapLibre raster-DEM adapter; `components/` contains the page
shell and toolbar.

## Dependency direction

Components use editor state and map adapters; geometry remains framework-free;
MapLibre consumes derived GeoJSON and never owns City Model data. Domain logic
does not depend on React or Next.js. Terrain is a rendering/world-surface
input: it may provide ground elevation for future world objects, but it never
replaces City Model road geometry or other domain data.

## Important invariants

- City Model/editor state is the source for rendered data; MapLibre sources and
  Terra Draw state are transient rendering/editing infrastructure.
- Source road vertices remain authoritative. Smoothed centerlines, labels,
  insertion controls, and interaction state are derived or editor-only.
- Current road creation and vertex/smoothing changes are local MVP behavior
  unless an explicit persistence flow is invoked.
- Road presets are declarative templates over existing road/lane/marking
  fields. They are applied once, remain manually editable, and never become a
  second road classification or rendering source.
- Endpoint connectivity is explicit: snapped roads share one existing City
  Model `Intersection` identity and its canonical position. Coincident endpoint
  coordinates without that shared node remain disconnected. Screen-space
  candidate detection and snap feedback are derived UI behavior only.
- Lane-to-lane connectivity is semantic City Model data (`LaneConnection`),
  not a painted marking. Connection curves and turn arrows are derived map
  layers and must be regenerated from persisted domain fields.

## Where to add new code

A new rendering concern belongs in the appropriate `map/adapters/`,
`map/geometry/`, `map/layers/`, or `map/styles/` module. Keep editor state in
editor components/state modules and keep domain logic outside React.

## What must not depend on this module

Traffic Engine and City Model domain logic must not import this frontend
feature. The feature consumes API/domain contracts and renders them.

## Lane edit persistence

Road property saves are serialized in the editor. Server-assigned lane UUIDs
are reconciled into the local road and junction topology before maneuver
controls become available. The backend updates incident junction lane
membership in the same transaction as lane configuration. Maneuvers remain
explicit `LaneConnection` records saved through the existing API.

See `frontend/e2e/README.md` for the real-browser regression workflow.
