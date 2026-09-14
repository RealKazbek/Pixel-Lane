# City Model

The City Model is Pixel Lane's authoritative persisted representation of a city. Map data, OSM imports, analysis inputs, and edits all derive from it; neither MapLibre nor Terra Draw stores domain truth.

Core entities are `City`, `Road`, `Lane`, `Intersection`, `TrafficLight` (including groups/phases), `TrafficRule`, `ParkingZone`, and `TrafficDemand`. IDs are client-supplied UUIDs so a complete graph can be validated before persistence. PostgreSQL stores normalized relationships; road polylines are the deliberate JSONB exception.

Coordinates support `WGS84` (`x=longitude`, `y=latitude`) and `LOCAL_CARTESIAN`. A road edit follows MapLibre → temporary Terra Draw feature → PATCH geometry API → Pydantic/business validation → PostgreSQL → city refetch. OSM data is normalized into these entities rather than becoming a separate model.

**Not yet modeled.** Pedestrian crossings, cameras, sensors, incidents, and emergency-priority devices have no entity yet. They are deliberately deferred rather than half-implemented -- the existing entities (e.g. `ParkingZone`) establish the pattern any of these would follow: one table, an FK to the city (and, where relevant, a road/intersection) with `ON DELETE CASCADE`, a `domain`/`schemas`/`models`/`validators`/`repositories`/`services`/`api` slice, and an Alembic migration. Add each only when a concrete feature needs it, not speculatively.

## Spatial schema (PostGIS)

PostGIS is enabled (migration `9c1a2f7e5b3d`, on top of a `postgis/postgis:16-3.4`
image -- see root `docker-compose.yml`). `roads.geom` (`Geometry(LineString, 4326)`)
and `intersections.geom` (`Geometry(Point, 4326)`) are a WGS84 spatial mirror
of the existing JSONB/`position_x,position_y` columns, each backed by a GiST
index (`ix_roads_geom`, `ix_intersections_geom`). They're populated only for
`WGS84` cities -- `LOCAL_CARTESIAN` coordinates (e.g. the four-way-intersection
example) aren't real geographic positions, so `geom` stays `NULL` for them and
they never appear in a bbox query result. `city_builder.py` populates `geom`
at creation time (`POST /cities`) and `city_repository.update_road_geometry`
keeps it in sync on a geometry edit; existing rows were backfilled by the
same migration from their JSONB/position columns.

**Why now.** The trigger condition from docs/architecture.md's PostGIS section
("a real spatial-query need appears") was met once loading a city larger than
the ~850m demo area required fetching only what's visible in the current map
viewport rather than the whole city in one response.

**Not a replacement (yet).** `roads.geometry` (JSONB) and
`intersections.position_x/position_y` remain the source of truth for ordered
points and non-WGS84 cities. Dropping them in favor of `geom` once every
consumer is confirmed migrated off them is a deliberate future cleanup, not
part of this change.

## Bbox-scoped viewport API

`GET /cities/{id}/roads?bbox=minLon,minLat,maxLon,maxLat` and
`GET /cities/{id}/intersections?bbox=...` return only roads/intersections
intersecting the given WGS84 bbox (`ST_Intersects` against
`ST_MakeEnvelope(...)`, real PostGIS predicates -- never a Python-side
filter over a fully-loaded dataset). `bbox` is validated at the API
boundary (4 finite numbers, valid lon/lat ranges, `min < max`); a
malformed value is a `422`, an unknown city is a `404`, and a bbox with no
matching geometry is a `200` with an empty list. These are additive to
`GET /cities/{id}` (still the full-city payload, unchanged, still used by
traffic analysis and non-map consumers) -- see the frontend's
viewport-loading architecture in
`frontend/src/features/city-viewer/map/README.md`.

The WGS84 map loads `/cities/{id}/metadata` (stored-road extent and count)
and individual `/roads/{road_id}` or `/intersections/{intersection_id}`
details. It never needs the full aggregate. Road bbox queries accept `zoom`
for class filtering; responses exceeding 10,000 features fail explicitly.
See [the import workflow](osm-import.md) and
[measured verification](full-almaty-verification.md).

## Observed geographic data

Roads may have an unknown (`null`) default speed and no known directional
lanes. Empty movement lists and signal phases/groups represent unknown data,
not measured zero capacity or an always-green timing plan. Optional road
`source_id`, `source_road_type`, `one_way` and `source_lane_count` preserve
source observations. A source total lane count does not imply a particular
allocation to each directed road. Migrations `6b14f092a731` and `7d014a16239c`
add these fields without replacing existing geometry or relationship tables.
The speed migration refuses downgrade if unknown speeds exist; resolve them
from real data or restore a pre-import backup instead of fabricating values.

## Detailed road geometry (City Model Part 1)

`Road` carries physical carriageway attributes beyond a bare centerline +
lane count, added by migration `a1c3d9f7e421`:

- `width_m` / `is_width_estimated` -- physical width in meters. An explicit
  source value (e.g. OSM `width=*`) when known; otherwise a centrally
  computed fallback (`app.city.domain.road_geometry.estimate_width_m`),
  which is the *only* place fallback width rules live (fallback hierarchy:
  motorway > trunk > primary > secondary > tertiary > residential > service
  > unclassified). `is_width_estimated=True` marks a guess, never presented
  as measured fact.
- `carriageway_count` and `median` (`NONE`/`PAINTED`/`PHYSICAL`/`UNKNOWN`)
  -- `carriageway_count` is currently always `1`: each Road already
  corresponds to exactly one traced physical way/geometry, so a single
  Road is never marked as "2 carriageways" (see `mapper._carriageway_and_median`
  and the Part 1 carriageway-inference audit below). Direction
  (`oneway`) and lane count are **never** treated as evidence of a second
  carriageway or a median -- a two-way edge is one undivided shared
  surface (`median=NONE`); a one-way edge's median is `UNKNOWN` (a plain
  one-way local street has no median either, so direction alone proves
  nothing). A genuinely divided arterial is represented in OSM (and
  therefore here) as two separate ways, each its own Road with
  `carriageway_count=1` -- correctly two Roads, never one Road claiming
  to be two. Detecting and linking that pair as a divided arterial is not
  implemented yet; it requires real evidence (e.g. parsing OSM
  dual-carriageway/relation tags), not a direction/lane-count heuristic.
- `level` -- vertical level relative to ground (0 = ground, positive =
  overpass/bridge, negative = underpass/tunnel), from OSM `layer=*` (or
  inferred `+1`/`-1` for untagged bridges/tunnels).
- `is_bridge` / `is_tunnel` -- preserved from OSM `bridge=*`/`tunnel=*`.

All of these are optional/defaulted (`width_m` nullable, others default to
the "nothing special" case) so roads imported before this migration keep
loading unchanged. This model deliberately stays at road/carriageway
granularity -- individual lane geometry, turn lanes, and full intersection
topology are later City Model roadmap parts (2 onward). Two roads that
cross in plan view at different `level`s are never assumed to be an
intersection: this architecture only ever creates `Intersection`s from real
OSM graph nodes (see `mapper.map_network_to_city`), never from geometric
line crossings.

`CityImport` is a separate trusted offline contract with larger aggregate
limits; public `CityCreate` limits and HTTP request-size protection remain.
`city_service.replace_imported_city` validates before atomic replacement,
with per-city advisory locking in the repository. Simulation remains behind
the existing backend adapter.

## Lane data parsing (City Model Part 2A)

Added by migration `f3b7c1d92a58`, on top of Part 1. This is normalized
lane *metadata* only -- no lane geometry, no lane rendering, no
intersection lane connectivity (later roadmap parts).

- `Road.forward_lane_count` / `backward_lane_count` / `both_ways_lane_count`
  -- raw OSM `lanes:forward` / `lanes:backward` / `lanes:both_ways` tag
  values for the *original* (possibly two-way) way this Road was derived
  from, kept regardless of which direction this particular Road
  represents (see `mapper._map_edge`). `NULL` means the tag was absent --
  **never** an inferred/split value.
- `Road.lane_count_quality` (`SOURCE`/`INFERRED`/`FALLBACK`/`UNKNOWN`,
  `LaneCountQuality`) -- confidence of this Road's own generated lane
  count (`len(lanes)`, i.e. how many `Lane` rows exist for it):
  `SOURCE` when an explicit per-direction tag matched this Road's own
  direction; `INFERRED` when `oneway=yes` let a generic `lanes=*` total
  safely apply to the single direction; `FALLBACK` when nothing usable
  existed, including an ambiguous two-way `lanes=*` total with no
  directional breakdown -- **a two-way `lanes=4` is never split into
  2+2**, it falls back to `DEFAULT_LANE_COUNT` instead, explicitly marked
  as a guess. `UNKNOWN` is reserved for the observation-only full-import
  mode, which never synthesizes a fallback (returns `count=0`).
- `Lane.allowed_turns` -- normalized `turn:lanes=*` tokens
  (`TurnLaneType`: `LEFT`/`SLIGHT_LEFT`/`THROUGH`/`SLIGHT_RIGHT`/`RIGHT`/
  `REVERSE`/`MERGE_TO_LEFT`/`MERGE_TO_RIGHT`/`NONE`), one group per lane,
  supporting multiple turns per lane (`through;right`). `NULL` = no
  reliable data for the whole road (tag absent, or discarded because its
  lane-group count didn't match the resolved lane count); an empty group
  (`[]`) = the tag was present and trustworthy but asserted nothing for
  that specific lane (OSM's empty-segment convention, e.g.
  `"through||right"`) -- these are deliberately distinct.
- `Lane.lane_change` -- normalized `change:lanes=*` value
  (`LaneChangePermission`: `YES`/`NO`/`NOT_LEFT`/`NOT_RIGHT`/`ONLY_LEFT`/
  `ONLY_RIGHT`), `NULL` when not provided or unreliable, same
  mismatch-discard rule as `allowed_turns`.

**Lane ordering.** Lane `index` is now a documented convention (it had
none before Part 2A): index `0` is the **leftmost lane in this Road's own
direction of travel**, ascending to the right -- this matches OSM's own
`turn:lanes`/`change:lanes` left-to-right convention, so token position
maps directly onto `index` with no reversal.

**Direction selection.** An unsuffixed `turn:lanes`/`change:lanes` tag is
only ever applied when the way is `oneway=yes` (the single direction is
unambiguous). On a two-way way, only the `:forward`/`:backward`-suffixed
tag matching this edge's actual direction (via OSMnx's `reversed` flag) is
trusted; an unsuffixed tag on a two-way way is ambiguous and is never
applied to either direction (see `normalization._select_directional_tag`).

**Malformed data.** If a per-lane tag's pipe-separated group count doesn't
match the lane count actually resolved for this Road, the whole tag is
discarded (with a warning) rather than misapplied to the wrong lane
indices; unsupported tokens are skipped individually with a warning. The
importer never crashes on malformed lane tags.

**Not implemented in Part 2A** (deferred, not silently dropped): OSM
`width:lanes` (per-lane width) and `placement`/`placement:forward`/
`placement:backward` (lane-offset-within-carriageway) are recognized as
relevant future tags but are not parsed -- both only become useful once
lane *geometry* exists (a later roadmap part), and parsing them now
without a geometric consumer would risk stale/unused data drifting from
the source. Detecting and linking paired divided-arterial carriageways
(see Part 1's `carriageway_count`) also remains unimplemented; it needs
real evidence (e.g. OSM relation tags), not a heuristic.

## Road + Lane Representation V1

Added by migration `7a1e4c9f0b3d`, on top of Part 2A. This is the first
pass that actually *renders* lane-level detail on the map, derived
client-side from Part 1/2A's already-normalized data -- no new backend
geometry is stored. Still explicitly not implemented: individual lane
entities in the domain model beyond what Part 2A already added, full
lane-to-lane intersection topology, lane editing, signal phases,
simulation, 2.5D/3D.

**New source fields.**

- `Road.parking_left` / `parking_right` (`ParkingLaneOrientation`:
  `NONE`/`PARALLEL`/`DIAGONAL`/`PERPENDICULAR`/`MARKED`/`UNKNOWN`) --
  from OSM `parking:lane:left`/`:right`/`:both` (the direct-orientation
  convention only; the separate `:orientation`-suffix convention is not
  parsed). `UNKNOWN` (not `NONE`) is the default: an absent tag says
  nothing about whether parking exists in reality.
- `Road.cycleway_left` / `cycleway_right` (`CyclewayType`:
  `NONE`/`LANE`/`TRACK`/`SHARED_LANE`/`UNKNOWN`) -- from OSM `cycleway`
  (applied to both sides when no more specific per-side tag exists) and
  `cycleway:left`/`:right`.
- `Lane.lane_type` can now be `BUS`, sourced *only* from OSM
  `bus:lanes`/`psv:lanes` (same per-lane pipe/direction convention and
  mismatch-discard safety as `turn:lanes` -- see
  `normalization.parse_bus_lanes`). Lane position, road class, and every
  other heuristic are never used to infer a bus lane.
- `City.import_source` / `imported_at` / `import_query` -- data
  provenance: `import_source` is a fixed descriptive string
  (`"OpenStreetMap (via Overpass API / OSMnx)"`), `imported_at` is this
  import run's own wall-clock time, and `import_query` records the
  fetch parameters (bbox/relation/provider, or center/radius for the
  small demo import). **OSMnx/Overpass do not expose a reliable
  per-query OSM data snapshot timestamp** -- `imported_at` is the import
  run's time, never fabricated as if it were the source data's own
  timestamp. All three are `NULL` for cities imported before this
  migration and for non-import city creation.

**Viewport API.** `GET /cities/{id}/map-roads` (`MapRoad`) now also
returns `forward_lane_count`/`backward_lane_count`/`both_ways_lane_count`/
`lane_count_quality`/`parking_left`/`parking_right`/`cycleway_left`/
`cycleway_right`, plus a `lanes: MapLaneSummary[]` array (`index`,
`lane_type`, `allowed_turns`, `lane_change` -- deliberately smaller than
the full `LaneRead`) via a `json_agg` over the `lanes` table in
`spatial_repository.find_map_roads`. This is the only way the map's
lane-level rendering gets per-lane data without a second request per
road; `json_agg` does not itself guarantee row order, so
`city_service._parse_lane_details` re-sorts by the embedded `index`.

**Client-side lane geometry (`frontend/.../map/adapters/laneGeometry.ts`).**
Lane surfaces, boundaries, turn arrows, and parking/cycleway markings are
all derived on the client from a Road's centerline + real-world width
using `@turf/line-offset`/`@turf/along`/`@turf/bearing` -- schematic, not
measured: lanes are assumed evenly spaced across the road's known/
estimated total width, since there is no per-lane position source data.
This must never be presented as authoritative lane placement.

- Lane index 0 offsets furthest **left** (turf's positive-offset
  convention), matching Part 2A's `turn:lanes` left-to-right convention.
- A turn arrow is drawn per lane only when `Lane.allowed_turns` is a
  non-empty array (an explicit `NONE`-only token draws nothing either --
  it asserts "no turn indicated", not "draw a marker here").
- A bus lane is colored and labeled only when `Lane.lane_type === "BUS"`.
- Parking/cycleway markings are schematic lines offset just outside the
  driving lanes, drawn only when the corresponding field is a concrete
  value (`NONE`/`UNKNOWN` draw nothing).
- Every internal lane boundary renders identically (a plain dashed
  separator): Pixel Lane has no OSM-backed evidence of individual
  lane-marking style (solid/double-solid/dashed), so that distinction is
  never fabricated -- only the two outer road edges get the (different,
  solid) "edge" treatment.
- Lane-count changes along a road's length already fall out of the
  existing OSM import topology for free: `lanes`/`lanes:forward`/etc. are
  already in `client.py`'s `edge_attrs_differ` list, so OSMnx never
  merges two segments whose lane count differs into one edge -- a
  physical lane add/drop already produces two sequential Roads with
  different lane counts, no additional merge/diverge geometry code
  needed for the basic case. Smoothly tapered merge/diverge visuals and
  intersection-approach lane clipping are not implemented (see
  "Known limitations" below): lanes currently render along a Road's full
  polyline, stopping wherever the Road itself stops.

**Zoom behavior.** Roads render as a single surface + coarse "multi-lane"
dashed hint (unchanged from Part 1) below zoom 17. At zoom >= 17
(`LANE_DETAIL_MIN_ZOOM`), per-lane surfaces/boundaries/bus-lane color and
parking/cycleway lines appear; text labels (bus "A", parking "P", turn
arrows) wait until zoom >= 17.5 (`LANE_LABEL_MIN_ZOOM`) to avoid
cluttering a busy intersection the moment lane detail appears.

**Known limitations.** No smoothed merge/diverge taper geometry; no
intersection-approach lane clipping (lanes run the Road's full length);
no stop lines or crosswalk markings (would need real stop-line/crossing
source geometry, which OSM does not reliably provide at node granularity
for this network, and a derived placement was judged more likely to
mislead than help at this pass); `width:lanes` and `parking:lane:*
:orientation` tag conventions are not parsed. This pass was not visually
validated against 2GIS in a browser (no browser tool was available in
that session) -- it was validated via unit tests (offset direction/sign,
arrow-glyph composition, MapLibre style-spec validation of every new
layer) and by inspecting real Almaty viewport API responses directly.
