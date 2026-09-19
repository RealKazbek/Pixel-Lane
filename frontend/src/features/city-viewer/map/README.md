# Pixel Lane 2D map

This directory implements the hybrid 2D map/editor: an optional MapLibre
basemap underneath, with the Pixel Lane City Model rendered as an
authoritative overlay on top. It replaces the earlier Canvas-based
schematic viewer.

## Why MapLibre

MapLibre GL JS is an open-source (BSD-licensed) vector map renderer with no
mandatory account, API key, or provider lock-in. It gives real map
interaction (pan/zoom/click) and GPU-accelerated rendering "for free," so
Pixel Lane doesn't hand-roll projection, hit-testing, or a render loop
(library-first, per `AGENTS.md`). It is used purely as a rendering/
interaction engine here — it does not own any Pixel Lane data.

## City Model is the only source of truth

MapLibre's internal GeoJSON sources, and any Terra Draw feature store used by
the generic persistence adapter, are **transient UI state only**. The current
City Model editor MVP keeps local vertex edits and smoothing values in editor
state and rebuilds rendering from that state; it does not persist those local
changes automatically. Nothing in this directory is an alternate
authoritative domain store.

## Viewport-driven loading

`hooks/useViewportCityData.ts` — not `city.roads`/`city.intersections` —
is what actually feeds the rendered roads/intersections/traffic-light/
label GeoJSON (see `PixelLaneMap.tsx`'s `geoJson` memo). It fetches only
what's in the current map bounds via the backend's bbox-scoped endpoints
(`GET /cities/{id}/roads?bbox=...`, `.../intersections?bbox=...` — see
docs/city-model.md's spatial schema section) instead of the whole city:

- fetches once on initial map `load`, then again on `moveend`/`zoomend`
  (never on every drag/zoom frame) with a 300ms debounce, so a fast pan
  or a burst of zoom clicks produces one coalesced request, not a storm;
- expands the requested bbox by 25% on every side
  (`adapters/viewport.ts`'s `boundsToBufferedBBox`) so a small pan
  doesn't immediately pop roads out at the previous edge;
- skips the refetch entirely when the new buffered bbox is already fully
  contained in the last one actually fetched (`isBBoxContained`) — a
  small pan/zoom-in inside the existing buffer costs nothing;
- cancels the in-flight request (`AbortController`) whenever a newer
  viewport request starts, so a stale response from an old viewport can
  never overwrite a newer one that resolves first.

WGS84 cities load `/metadata` for the camera and count, then bbox features.
`useSelectedCityEntity` loads just the selected road/intersection for the
inspector/editor, retaining it outside the viewport. The in-memory City-
shaped view contains only those details, not the full network. Cartesian
examples retain the small full-city path. Successful bbox cache entries are
keyed by zoom tier; failed requests remain retryable. Saving geometry updates
the city revision and refreshes metadata/details/viewport without a full load.

Below z12 only highway/arterial roads are requested/rendered; z12 adds
collectors, z14 local roads, z15 intersections/signals, z16 local labels.
The backend rejects oversized viewports instead of silently truncating.

Traffic-light point features are derived from the viewport
intersections' `traffic_light_id` field rather than a separate
`traffic_lights` bbox endpoint — a light has no geometry of its own, only
its parent intersection's position, so a fourth endpoint would add
nothing.

Concretely:

- `adapters/cityModelToGeoJson.ts` is the only place that walks
  `City`/`Road`/`Intersection`/`TrafficLight` objects to build map-ready
  GeoJSON. It never mutates the City Model.
- `adapters/coordinates.ts` is the only place City Model `Point`s are
  converted to/from MapLibre's `[lng, lat]` tuples.
- Terra Draw's store (`editor/geometryEditor.ts`) is read exactly once, on
  `apply()`, to extract the edited line's coordinates. It is discarded
  immediately after.

## Basemap is optional and provider-independent

The basemap (background reference tiles/labels) can be:

- fully disabled (`NEXT_PUBLIC_MAP_BASEMAP_ENABLED=false`, the default) —
  Pixel Lane's own overlay renders on an empty style with no external tile
  requests at all;
- pointed at any MapLibre-compatible style URL via
  `NEXT_PUBLIC_MAP_STYLE_URL` (a self-hosted style, or a provider's style
  if the user supplies their own key in that URL — Pixel Lane never
  hardcodes or ships a provider key).

Toggling the basemap at runtime uses `map.setStyle()` + a `style.load`
listener that re-adds Pixel Lane's sources/layers (`layers/setupLayers.ts`)
— the `maplibregl.Map` instance itself is created once and never recreated
(`hooks/useMapLibreMap.ts`), which keeps the toggle cheap and avoids
flicker.

The one narrow exception to "no external dependency required to render
anything" is text labels: MapLibre's symbol layers need a `glyphs` (SDF
font) URL even with the basemap off. The empty style
(`styles/mapStyle.ts`) points this at MapLibre's own project-hosted demo
glyph endpoint — part of the mapping library's own infrastructure, not a
commercial basemap/tile provider. Self-hosting glyphs is a reasonable
future improvement if this becomes a concern.

## Layer stack

Pixel Lane's overlay is four GeoJSON sources (`layers/layerIds.ts`:
`SOURCE_IDS`) — roads, intersections, traffic lights, road labels — each
rebuilt via `adapters/cityModelToGeoJson.ts` and pushed into MapLibre with
`updatePixelLaneData()`. Layers are drawn in a fixed order
(`LAYER_DRAW_ORDER`): road casing → road surface → lane markings →
selection highlight → junctions/signals → detailed topology intersections
(from zoom 17) → traffic lights → labels.

**Road width.** Width and casing width are derived from lane count plus a
per-hierarchy bonus (`styles/roadStyle.ts`), converted from meters to
on-screen pixels with a zoom- and latitude-aware Web Mercator expression
(`layers/roadWidth.ts`). Real-world road widths collapse to sub-pixel size
at city-overview zoom levels, so a per-hierarchy **minimum pixel width**
(`ROAD_MIN_PIXEL_WIDTH`/`ROAD_CASING_MIN_PIXEL_WIDTH`) is applied as a
floor inside the zoom-width expression — without it, every road looks like the
same hairline regardless of class, and the map reads as an abstract graph
rather than a road network. Color is a neutral stone grayscale keyed by
road-type hierarchy — deliberately not the yellow/orange highway styling
used by consumer navigation apps, since this is an analysis/editing tool,
not a navigation product.

**Intersections.** Not every `Intersection` in the City Model is a real
junction — many are topology pass-through nodes (e.g. where a street is
split into segments). `adapters/cityModelToGeoJson.ts`'s `isJunction()`
and the `connected_road_count` feature property let the intersection layer
(`layers/pointLayers.ts`) hide pass-through nodes at normal zoom and only
show real junctions (3+ connected roads) or signalized intersections —
otherwise every topology node painted the same as a real junction visually
dominated the map. All intersections become visible again once zoomed in
far enough to be doing detailed inspection/editing.

**Labels.** One label per _street name_, not one per road segment
(`buildRoadLabelFeatureCollection` picks the longest segment per name) —
OSM-derived roads are frequently split into many short same-named
segments, and labeling every segment clustered so much near-duplicate
text that MapLibre's overlap suppression hid almost all of it. Label
priority (`label_rank`, from `HIERARCHY_LABEL_RANK`) is fed into
`symbol-sort-key` so a higher-class road's name wins when there isn't
room for both.

**Selection** is tracked as MapLibre feature-state
(`setSelectedFeature()` in `layers/setupLayers.ts`), not as a property
baked into the GeoJSON payload — selecting a road/intersection/traffic
light never requires rebuilding or re-sending a source's data, regardless
of city size. Feature-state must be re-applied any time a source is
recreated (e.g. after a basemap `setStyle()` swap), which
`PixelLaneMap.tsx`'s `applyCurrentSelection()` handles. Clicking a
traffic light selects its parent intersection (there's no separate
traffic-light details view yet).

## Editing data flow

The current local editor follows one direction only:

```
editor state changes (geometry, manual road properties, or a road preset)
  -> derived centerline and GeoJSON are rebuilt
  -> MapLibre renders the local City Model view
```

Road presets live in `editor/roadPresets.ts`. They apply the existing width,
ordered lane directions, lane-boundary markings, and edge-marking fields to a
Road, then leave it unlocked for normal manual editing. Exact matching is
deterministic; changing any preset-owned field makes the inspector show
Custom. No preset ID is stored on the Road and no rendered GeoJSON is patched
directly.

Snapping lives in `editor/endpointSnapping.ts`, outside React and MapLibre.
`PixelLaneMap` projects semantic endpoint and centerline-segment targets into
screen space,
selects the nearest valid target inside `ENDPOINT_SNAP_TOLERANCE_PX` (18 px),
and renders a temporary ring/label. On commit, the pure editor transform
creates or reuses the target's City Model `Intersection`, updates
`connected_road_ids`, and canonicalizes both endpoint coordinates to the node
position. Interior snaps split the target Road into two ordered Road entities,
preserving road configuration and curve/control-point order. The selected-road inspector's collapsed Topology section displays
the start/end node IDs for manual verification. Geometry equality alone never
creates a connection, and rendered GeoJSON is never consulted for topology.
An endpoint already on a shared node returns to that
node if released without a replacement snap because explicit detach is not yet
part of the editor UX.

The reusable `geometryEditor`/`applyRoadEdit` adapter still supports explicit
PATCH persistence of source polyline vertices for backend-backed flows. The
current editor page does not invoke that apply step, so local roads and local
smoothing metadata do not survive refresh.

## Explicit non-goals for this iteration

No 3D buildings, no satellite imagery, no turn-by-turn navigation UI, no
heatmaps/emergency routing, no full lane/turn editor, no general-purpose
GIS suite, no vector-tile backend. PostGIS/bbox-scoped queries are now
implemented on the backend (see docs/city-model.md) specifically to
support this viewport-driven loading. Full Almaty ingestion and measured
verification status are documented in `docs/osm-import.md` and
`docs/full-almaty-verification.md`.

The current editor includes the PL-005.12 connected-road-chain,
PL-005.13 semantic centerline snap, and PL-005.14 automatic split increments.
PL-005.15 T-junction geometry and lane-to-lane connections remain out of
scope.
