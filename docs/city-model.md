# City Model

The City Model is Pixel Lane's authoritative persisted representation of a city. Map data, OSM imports, analysis inputs, and edits all derive from it; neither MapLibre nor Terra Draw stores domain truth.

Core entities are `City`, `Road`, `Lane`, `Intersection`, `TrafficLight` (including groups/phases), `TrafficRule`, `ParkingZone`, and `TrafficDemand`. IDs are client-supplied UUIDs so a complete graph can be validated before persistence. PostgreSQL stores normalized relationships; road polylines are the deliberate JSONB exception.

Coordinates support `WGS84` (`x=longitude`, `y=latitude`) and `LOCAL_CARTESIAN`. A road edit follows MapLibre → temporary Terra Draw feature → PATCH geometry API → Pydantic/business validation → PostgreSQL → city refetch. OSM data is normalized into these entities rather than becoming a separate model.

**Not yet modeled.** Pedestrian crossings, cameras, sensors, incidents, and emergency-priority devices have no entity yet. They are deliberately deferred rather than half-implemented -- the existing entities (e.g. `ParkingZone`) establish the pattern any of these would follow: one table, an FK to the city (and, where relevant, a road/intersection) with `ON DELETE CASCADE`, a `domain`/`schemas`/`models`/`validators`/`repositories`/`services`/`api` slice, and an Alembic migration. Add each only when a concrete feature needs it, not speculatively.

**PostGIS.** Still not introduced -- see docs/architecture.md's "Planned: PostGIS" section for the current trigger condition (a real spatial-query need, e.g. bounding-box-filtered API queries or multi-city scale). The current single bounded Almaty demo area has no such need yet; `Point`/`Polyline` were kept generic specifically so this migration stays additive when it does.
