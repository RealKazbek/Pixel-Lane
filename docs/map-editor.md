# Map and editor

MapLibre is the renderer and interaction layer; Terra Draw is temporary geometry-edit state. The optional basemap is reference infrastructure, while Pixel Lane's overlay is built from City Model GeoJSON sources for roads, intersections, traffic lights, and labels. With basemap disabled, the map uses Pixel Lane-only mode; glyphs currently use MapLibre's demo endpoint.

The toolbar's master "Overlay" toggle shows/hides everything at once (a debugging aid). Independently, the layers group (`MapLayersToggle`, `map/layers/layerIds.ts`'s `LAYER_GROUPS`) lets a user show/hide roads, intersections, and traffic lights individually via `setLayerGroupVisibility` -- a layer is visible only when both the master switch and its own group are on. There is no separate "crossings" toggle yet: pedestrian crossings are not part of the City Model (see docs/city-model.md's "Not yet modeled" note).

Road casing/surface, markings, selection, junctions, signals, and labels have an explicit draw order. Selection uses MapLibre feature-state, not source mutation. Labels choose one longest segment per street name; pass-through topology nodes are shown only at detailed zoom.

```text
City Model/editor state → derived centerline → GeoJSON adapter → MapLibre
```

The current editor MVP keeps road creation, vertex insertion/dragging, and
per-corner smoothing in React state and renders the result through the
production geometry adapters. The generic geometry PATCH API persists source
polyline vertices, but the current editor workspace does not auto-save local
edits and the API has no smoothing-metadata field yet. PL-005.07–.09 add
ordered lane count/direction configuration and basic derived markings: lane
separators can be dashed, solid, or double-solid, while optional edge lines
can be absent, white, or yellow. These are derived from the City Model road
centerline, width, and lane metadata; arbitrary marking polygons are not the
source of truth. PL-005.10 adds four inspector presets (two-way two/four-lane
and one-way two/three-lane). Applying one replaces only width, lane directions,
lane boundaries, and edge markings; identity, name, source geometry, control
points, and smoothing are preserved. Presets are templates, not persistent
road classes: exact semantic matches show the preset name and any manual
override shows Custom. Full persisted turn/intersection/signal editing remains
outside the current checkpoint.

PL-005.11 adds endpoint/node snapping for road creation and endpoint dragging.
Candidates include existing road endpoints and explicit City Model
`Intersection` nodes, selected by nearest distance inside a centralized 18 px
screen-space tolerance. The incremental PL-005.13/PL-005.14 implementation
also projects onto semantic centerline segments and splits a target road when
an interior point is selected; those stages are documented here as implemented
editor behavior, without claiming PL-005.15. A small target ring
and Snap label are shown only while a valid candidate is active. Committing an
endpoint snap creates or reuses one `Intersection`; committing an interior
segment snap creates a node, preserves the target road configuration across
two ordered Road entities, and adds both split pieces plus the moving road to
that node's `connected_road_ids`. Visual overlap does not equal connectivity;
shared node identity defines connectivity. The selected-road inspector exposes
a collapsed Topology section so this identity can be checked during manual
acceptance. See the implementation [map
README](../frontend/src/features/city-viewer/map/README.md).

PL-005.06 adds the first selected-road properties surface: street name and
physical width in meters. Width is already a City Model field with a backend
validation range of 2.5–60 m; the local editor previews changes immediately.
The backend properties PATCH endpoint is available for backend-backed flows,
but the local editor workspace is not persisted automatically yet.
