# Map and editor

MapLibre is the renderer and interaction layer; Terra Draw is temporary geometry-edit state. The optional basemap is reference infrastructure, while Pixel Lane's overlay is built from City Model GeoJSON sources for roads, intersections, traffic lights, and labels. With basemap disabled, the map uses Pixel Lane-only mode; glyphs currently use MapLibre's demo endpoint.

The toolbar's master "Overlay" toggle shows/hides everything at once (a debugging aid). Independently, the layers group (`MapLayersToggle`, `map/layers/layerIds.ts`'s `LAYER_GROUPS`) lets a user show/hide roads, intersections, and traffic lights individually via `setLayerGroupVisibility` -- a layer is visible only when both the master switch and its own group are on. There is no separate "crossings" toggle yet: pedestrian crossings are not part of the City Model (see docs/city-model.md's "Not yet modeled" note).

Road casing/surface, markings, selection, junctions, signals, and labels have an explicit draw order. Selection uses MapLibre feature-state, not source mutation. Labels choose one longest segment per street name; pass-through topology nodes are shown only at detailed zoom.

```text
City Model/editor state → derived centerline → GeoJSON adapter → MapLibre
```

The current editor MVP keeps local vertex insertion, dragging, and per-corner
smoothing in React state and renders the result through the production
geometry adapters. The generic geometry PATCH API persists source polyline
vertices, but the current editor workspace does not auto-save local edits and
the API has no smoothing-metadata field yet. No lane, intersection, signal,
or congestion-overlay editor exists. See the implementation [map README](../frontend/src/features/city-viewer/map/README.md).

PL-005.06 adds the first selected-road properties surface: street name and
physical width in meters. Width is already a City Model field with a backend
validation range of 2.5–60 m; the local editor previews changes immediately.
The backend properties PATCH endpoint is available for backend-backed flows,
but the local editor workspace is not persisted automatically yet.
