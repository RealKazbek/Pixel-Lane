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

MapLibre's internal GeoJSON sources, and Terra Draw's internal feature
store used during geometry editing, are **transient UI state only**. Both
are rebuilt from the City Model on every relevant change and are never read
back except at the single, explicit moment a user clicks "Apply" during
editing (see "Editing data flow" below). Nothing in this directory persists
state independently of the backend.

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

Geometry editing follows one direction only:

```
user drags a vertex (Terra Draw, in-memory only)
  -> "Apply" clicked
  -> geometryEditor.apply() reads Terra Draw's current feature
  -> fromLngLat() converts each vertex back to a City Model Point
  -> applyRoadEdit() does a cheap client-side sanity check (>= 2 points)
  -> PATCH /api/v1/cities/{city_id}/roads/{road_id}/geometry
  -> backend validates via the Polyline schema and persists
  -> on success, the city is refetched and the map re-renders from
     the City Model again (Terra Draw's transient state is discarded)
```

If the PATCH fails (network error, backend validation rejection), the
error is surfaced in the toolbar and the City Model is left untouched —
there is no optimistic local mutation of the road's geometry.

## Explicit non-goals for this iteration

No 3D buildings, no satellite imagery, no turn-by-turn navigation UI, no
heatmaps/emergency routing, no full lane/turn editor, no general-purpose
GIS suite, no PostGIS, no vector-tile backend. These may become worth
revisiting later, but weren't required to satisfy the current map/editor
requirements.
