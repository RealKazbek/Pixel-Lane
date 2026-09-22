# World renderer foundation

## Purpose

This folder is the extension boundary for the 2.5D world renderer. It holds
renderer-independent world concepts and adapters that turn City Model data
into render snapshots.

## Public API

- `core/WorldPosition` is the shared geographic position shape. Elevation is
  explicit, even while the current map renders a flat world.
- `core/WorldRenderer` describes mount/update/unmount ownership for future
  layer renderers.
- `roads/buildRoadWorldData` builds the current road-focused snapshot.

## Dependency direction

City Model data flows into world adapters, then into the MapLibre layer
implementation. Renderers never own authoritative city data and never write
back to the City Model.

Future terrain, buildings, vehicles, and other layers should add concrete
modules here only when they have real behavior; no placeholder modules are
created for planned features.
