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
interaction; `components/` contains the page shell and toolbar.

## Dependency direction

Components use editor state and map adapters; geometry remains framework-free;
MapLibre consumes derived GeoJSON and never owns City Model data. Domain logic
does not depend on React or Next.js.

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

## Where to add new code

A new rendering concern belongs in the appropriate `map/adapters/`,
`map/geometry/`, `map/layers/`, or `map/styles/` module. Keep editor state in
editor components/state modules and keep domain logic outside React.

## What must not depend on this module

Traffic Engine and City Model domain logic must not import this frontend
feature. The feature consumes API/domain contracts and renders them.
