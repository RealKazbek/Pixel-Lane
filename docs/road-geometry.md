# Road geometry: research, architecture, and the Road Geometry Lab

This document is the canonical reference for how Pixel Lane turns a
`Road`/`Intersection`/`Lane` graph into rendered road surfaces, and why
that approach was chosen over alternatives. See also
`frontend/src/features/city-viewer/map/geometry/README.md` (module-level
API/invariants) and `docs/city-model.md` (domain model, Demo City,
theming/label history).

## 1. Root cause this replaced

Every `Road` used to be buffered independently into a full-length
rounded "capsule" (`centerline -> @turf/buffer`), and only _then_ unioned
with neighbors sharing an `Intersection`. That works for a clean 2-road
straight continuation, but at any junction where roads meet at an angle,
two independently-buffered capsules crossing at that angle produce a
union whose outer boundary has a sharp cusp/spike exactly where the
capsule edges cross -- a geometric consequence of unioning full-length
capsules, not a `line-join`/`line-cap` setting (those were already
`round`/`round`). Any junction end with no shared `Intersection` also
kept a visible round capsule cap. The domain topology itself
(`Road`/`Intersection` as real graph edges/nodes, never inferred from a
geometric crossing) was never the problem.

## 2. Prior art investigated

| Project                                                  | License    | Model                                                                                                                                                                                                                                                                              | Relevant to Pixel Lane                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [osm2streets](https://github.com/a-b-street/osm2streets) | Apache-2.0 | Roads as thickened line-strings between two intersections, each carrying an ordered left-to-right lane list (type/direction/width). Intersections are polygon areas built from where incident road polygons meet. Ships `osm2streets-js` (WASM) + GeoJSON output for web maps.     | Closest conceptual match to Pixel Lane's own model (Road=edge with ordered lanes, Intersection=node, junction=derived polygon from incident road geometry). Validates the "trim + build a junction surface from incident road boundaries" direction already taken here.                                                                      |
| [drawtonomy](https://github.com/kosuke55/drawtonomy)     | Apache-2.0 | Browser-only (no backend) scene editor; "topology-aware lanes" where lane connections update automatically as the centerline is edited; a lane tool derives both boundaries from one centerline; prebuilt intersection/roundabout templates; exports OpenDRIVE/Lanelet2.           | UX inspiration for a future interactive road-drawing tool (out of scope for this task, see docs/theming.md-style scoping notes below) and confirms the pattern of keeping lane _connections_ as a first-class concept distinct from decorative lane markings.                                                                                |
| [SUMO](https://github.com/eclipse-sumo/sumo) / NetEdit   | EPL-2.0    | Explicit graph: `Node` (junction) / `Edge` (directed road) / `Lane` (ordered, per-edge) / `Connection` (lane-to-lane, per-junction). `netconvert` auto-generates junction shapes and right-of-way logic from this graph; shapes can also be hand-authored via a `shape` attribute. | Validates the `RoadNode`/`RoadEdge`/`Lane`/`LaneConnection`/`Junction` vocabulary this document and the Lab use. Not source-reused (EPL-2.0 is share-alike for modifications to SUMO's own code; Pixel Lane never vendors or links SUMO code, only reuses the _unencumbered, standard graph vocabulary_, which is not itself copyrightable). |

None of these are vendored or code-copied into Pixel Lane. What was
adopted is the _vocabulary and general strategy_ (thickened edges + a
node graph + junction shapes derived from where incident edges meet),
which is standard, published computational-cartography practice, not
one project's proprietary implementation. Pixel Lane's own junction
solver (below) is an original implementation using `@turf/*` primitives,
not a port of osm2streets/SUMO source.

**Why no new heavy dependency.** All three projects' actual polygon/curve
math is implemented in Rust (osm2streets) or C++ (SUMO) with no
lightweight JS/TS geometry library extracted from either. Pixel Lane
already depends on the modular `@turf/*` packages (buffer, union, convex,
line-slice-along, bearing, destination) for exactly this class of
problem -- adding osm2streets-js (a WASM module with its own Rust build
pipeline) or embedding SUMO/netconvert (a C++ desktop tool, not a
library) would be a disproportionate, hard-to-isolate dependency for the
actual gap (junction polygon quality), which `@turf/*` primitives plus a
purpose-built junction solver already close. See AGENTS.md 18's
library-first checklist -- this was evaluated and rejected on "does it
fit the existing architecture" and "resource cost."

## 3. Topology / geometry / rendering separation

```
TOPOLOGY (domain, backend-authoritative)
  Road       ~ RoadEdge   -- centerline + lane list + class + width
  Intersection ~ RoadNode -- position + connected_road_ids/connected_lane_ids
  Lane                     -- index, direction, type, allowed_turns

GEOMETRY (frontend/.../map/geometry/, pure TS, no MapLibre/React)
  roadEnvelope.ts    centerline -> buffered polygon
  junctionSolver.ts  incident roads at a Node -> one unified Junction polygon
  mergeTaper.ts       variable-width envelope for a slip/merge/split approach
  curveSmoothing.ts   per-corner quadratic centerline resampling
  laneConnection.ts   lane-to-lane connector curve through a Junction

RENDERING (frontend/.../map/layers/ + styles/)
  GeoJSON sources -> MapLibre layers (asphalt, casing, lane separators,
  bus/parking badges, labels, ...), theme-token driven (styles/mapTheme.ts)
```

Topology is never invented by the rendering layer: `roadSurfaceGeometry.ts`
and `laneGeometry.ts` only ever merge/trim geometry for roads an
`Intersection` actually lists in `connected_road_ids` -- a geometric
crossing with no shared `Intersection` is never treated as connected
("visual connection implies topological connection," never the reverse;
see `docs/city-model.md` and the regression test of the same name).

## 4. Junction solver algorithm

For a node with 2+ incident roads (generic -- not Demo-City-specific,
works for any count/angle):

1. Build each incident road as an explicit left/right offset corridor with
   flat/butt ends. The corridor includes the shared endpoint; the topology
   node itself is not buffered and has no physical radius.
2. Union the corridors. Internal boundaries disappear while the outer
   boundary remains the boundary of the connected road widths. A straight T
   therefore stays a rectangular through-road with a rectangular side-road
   opening, rather than becoming a central capsule or disk.
3. Keep the configured corner radius in the editor/model contract. The base
   junction is currently intentionally sharp; a future local fillet may be
   applied only to individual adjacent road-edge corners after the
   corridor-defined footprint remains unchanged.

This is the PL-005.15–PL-005.18 geometry milestone. Incident approaches are
sorted by local outward bearing, never by road creation or database order.
The same degree-independent pipeline handles T/Y and four-way nodes as well
as skewed and arbitrary-angle layouts. A junction surface is derived from
the shared topology node, semantic centerlines, and road widths; it is not a
competing persisted source of truth.

Lane-to-lane turn connections and intersection markings remain later work
(PL-005.19+). The standalone road renderer still uses Turf buffering; only
connected junction approaches use the flat-ended corridor builder.

A ~3cm plate dilation before the final union works around a numerical-
robustness limitation of the polygon-clipping library behind
`@turf/union` when two inputs share an exactly-coincident vertex (common
here, since the plate's vertices are derived from the same envelopes
it's unioned with) -- see `junctionSolver.ts`'s `PLATE_DILATION_M`.

## 5. Curve smoothing

The editor keeps the ordered source polyline and derives a render-only
centerline in `curveSmoothing.ts`. Each internal vertex has an independent
`corner_smoothing` value in local editor state: zero preserves the raw corner,
while larger values replace the corner with a safely clamped sampled quadratic
arc. Endpoints remain exact, and two-point roads remain straight. The derived
centerline is used by surface, lane, and label adapters for LOCAL_CARTESIAN
editor/demo geometry only. The backend persists source polyline vertices, but
does not currently persist this editor-only smoothing metadata.

## 6. Lane-to-lane connectors

`geometry/laneConnection.ts` builds an explicit curve from an incoming
lane's endpoint, through the junction, to a chosen outgoing lane's start
point -- a cubic Bezier, tangent-continuous at both ends, distinct from
decorative lane-separator markings. This is what lets a future vehicle
simulation reason `Lane A -> allowed connection -> Lane B` instead of
inferring connectivity from where painted lines happen to end.
Unit-tested on its own (straight-through, 90-degree turn, coincident-
endpoint, determinism) and validated against real Lab junction topology
in `dev/roadLab/__tests__/fixtures.test.ts`. **Not yet rendered as a
visible map layer** -- that (and wiring per-lane allowed-turn connectors
into the production Demo City/Real Almaty rendering, as opposed to the
plain per-lane turn arrows that already exist) is a reasonable following
task, both because it needs its own layer/adapter plumbing and because
the domain model doesn't yet record explicit per-lane allowed target
lanes at a junction (today `Intersection.connected_lane_ids` records
_which_ lanes participate, not
_which lane connects to which_).

## 7. `LOCAL_CARTESIAN`-only gates, and why

Two things stay gated to `LOCAL_CARTESIAN` (curated fixture/demo data),
not real OSM imports: per-lane schematic offsetting (`laneGeometry.ts`,
pre-existing) and centerline curve smoothing (`curveSmoothing.ts`, new).
Real OSM polylines are not curated for either -- sharp angles at
simplification points, very short segments, near-duplicate points --
applying schematic offsetting to them previously produced long spiky
self-intersecting artifacts (see `docs/city-model.md`'s "Two-mode City
Model" section). The junction solver and road-envelope buffering _do_
run on both coordinate systems: buffering/trimming/filleting a single
centerline by a single width has no compounding/self-intersection
failure mode the way stacked per-lane offsets do, so it is safe on real,
uncurated geometry too -- this is what fixes Real Almaty's junction
rendering, not just Demo City's.

## 8. Theming

`map/styles/mapTheme.ts` defines explicit Light/Dark tokens for every map
layer (road asphalt/casing per hierarchy, lane markings, labels+halos,
junction/traffic-light markers, bus/parking colors and badge icons).
Every `map/layers/*.ts` builder takes a `MapThemeColors` argument.
`PixelLaneMap.tsx` resolves the current theme via `next-themes` and calls
`layers/setupLayers.ts`'s `updatePixelLaneTheme()` on a theme change,
which re-paints every layer and re-registers icon badges in place, no
reload. See `docs/theming.md`'s "map / City Model workspace" section for
the full policy (this reversed an earlier "map stays fixed-palette"
decision).

## 9. Performance

Junction solving is O(incident roads at that node) -- unaffected by
overall city size beyond the existing payload-size limits
(`app/city/domain/limits.py`) and viewport-scoped loading (see
`docs/city-model.md`'s bbox section). Geometry is recomputed from the
current `roads`/`intersections` arrays on each `PixelLaneMap` render via
`useMemo`, not per-frame; nothing in `map/geometry/` touches React state
or re-renders independently of a City Model data change. No spatial
indexing was added -- the payload-size caps already bound the roads/
intersections array size a client ever holds.

## 10. Road Geometry Lab

`/dev/road-lab` (`frontend/src/app/dev/road-lab/`,
`frontend/src/features/city-viewer/dev/roadLab/`) renders eleven
deterministic, isolated primitives through the _exact same_ pipeline
Demo City and Real Almaty use -- `fixtures.ts` builds a small in-memory
`City` (never touching the backend/database) and `RoadLabApp.tsx` passes
it straight into the production `PixelLaneMap` component. It is not a
static SVG mockup and not a second rendering engine.

The product City Model page is a separate editor-first surface. It starts
with an in-memory `EditorWorkspace` containing three isolated two-point,
zero-lane roads and no city/imported infrastructure. That initial document is
rendered by the same `PixelLaneMap` and road-surface pipeline as the Lab;
Demo City and Real Almaty remain backend/import fixtures, but are not loaded
by the City Model editor page.

PL-005.05 established the multi-vertex editor foundation. PL-005.06 adds a
selected-road properties panel for street name and physical width. Width uses
the existing `width_m` City Model field and the width-aware geometry pipeline;
lane, speed, parking, bus, and road-type properties remain deferred. The
current local workspace previews property changes locally, while the backend
also exposes a validated properties update path for persisted City Model
flows.

PL-005.07–.09 add the first explicit lane model to the editor contract:
ordered lanes with `FORWARD`/`BACKWARD` direction, a uniform lane-width
invariant (`road width = lane count × lane width`), and derived lane boundary
markings. Lane offsets and markings consume the shared smoothed centerline;
same-direction boundaries are dashed and direction changes use a stronger
solid center separator. Lane-level turn, transit, parking, speed, and
intersection-connection editing remain deferred.

PL-005.10 adds declarative road presets on top of that same contract. The
initial two-way two/four-lane and one-way two/three-lane templates apply lane
width, ordered directions, internal separators, and edge lines to the semantic
Road. They do not create a renderer-only profile or a new road type. Geometry,
identity, name, and smoothing stay unchanged, while the existing centerline,
lane, marking, and surface adapters derive the updated rendered result.

PL-005.11 connects road endpoints through the existing semantic
`Intersection` entity. A snapped pair therefore has both geometrically equal
endpoint coordinates and one shared topological node ID. The node position is
canonical: snapping to an existing node uses that position for every involved
endpoint. Coincident coordinates on roads without a shared `Intersection`
remain disconnected. Only first/last polyline vertices are topology endpoints;
intermediate curve vertices are never promoted to nodes. Detection uses the
nearest eligible endpoint within 18 screen pixels, independent of zoom. Road
surfaces, markings, and the temporary snap ring remain derived from semantic
state and cannot establish connectivity themselves.

PL-005.12 extends that identity across connected road chains: one node may be
referenced by any number of independent Road entities, and moving a shared
endpoint updates every incident road endpoint and the canonical node position.
PL-005.13 adds semantic centerline segment candidates using nearest-point
projection with the same screen-space tolerance. PL-005.14 splits an interior
target segment into two ordered Road entities, preserving road properties and
control-point order; the two pieces and the connecting road share one explicit
Intersection. Rendered surfaces remain derived and do not define topology.

The Stage 1 editor world is an explicit local-cartesian rectangle from
`(-400, -300)` to `(600, 300)`. The three review roads live inside that
stable 1000m × 600m world. Its grid is generated as MapLibre line geometry
from those coordinates, with world-unit intervals adapting at camera zoom
thresholds; it is not a CSS viewport background.

Fixtures (each in its own grid cell, generously spaced):
`01 Straight`, `02 Curve`, `03 T Junction`, `04 Four-Way`,
`05 Y Junction`, `06 Merge`, `07 Split`, `08 Lane Transition`
(4 -> 3 -> 2 lanes across two chained taper nodes), `09 Median` (two
physically-separated one-way carriageways), `10 Turn Pocket`, `11 Minimal
Primitive` (PL-005.01: two points, one straight centerline, one
fixed-width surface, zero lanes -- the smallest road primitive the
pipeline supports).

**Adding a new primitive:** add a `buildTestNN...` function in
`fixtures.ts` following the existing ones' shape (it receives a
`LabCityBuilder` and a grid-cell `Point` origin, and calls
`b.addRoad`/`b.addIntersection` with _local_ coordinates -- the builder
translates them into the cell automatically), then add one entry to
`FIXTURE_BUILDERS`. `dev/roadLab/__tests__/fixtures.test.ts` already
asserts every fixture's geometry stays finite/valid through the real
`roadSurfaceGeometry`/`laneGeometry` adapters, so a new fixture is
automatically covered by that check.

**Scope note (i18n):** `/dev/road-lab` sits outside the localized
`[locale]` route tree (same pattern as `/health`), is not linked from any
product navigation, and is English-only by design -- it is an internal
geometry-verification tool for engineers, not a user-facing product
surface, so AGENTS.md 20's trilingual Definition of Done does not apply
to it (a genuinely user-facing City Model feature, in contrast, still
must be fully localized).

## 11. Demo City

`backend/app/city/examples/demo_district.py` (Python, mirrors the Lab's
generator pattern) already covers the same primitive list end-to-end
using real domain entities (`Road`/`Lane`/`Intersection`/`TrafficLight`/
`ParkingZone`/`BusStop`/`Crosswalk`) rather than the Lab's synthetic
grid -- see `docs/city-model.md`'s Demo City section for the full
fixture-by-fixture mapping. The Lab and Demo City intentionally consume
the _same_ frontend geometry/rendering pipeline; nothing in
`map/geometry/` or `map/layers/` branches on which city is being
rendered.

## 12. Real Almaty

Unaffected structurally: the junction solver and envelope generator
already ran on `WGS84` cities before this task (see 7.); no fictional
topology was added to Almaty, and curve smoothing / lane connectors stay
`LOCAL_CARTESIAN`-only until real OSM geometry is curated enough to
extend them safely (see `docs/city-model.md`'s "Two-mode City Model").
