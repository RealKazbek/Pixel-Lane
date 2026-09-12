# City Model

The City Model is Pixel Lane's authoritative persisted representation of a city. Map data, OSM imports, analysis inputs, and edits all derive from it; neither MapLibre nor Terra Draw stores domain truth.

Core entities are `City`, `Road`, `Lane`, `Intersection`, `TrafficLight` (including groups/phases), `TrafficRule`, `ParkingZone`, and `TrafficDemand`. IDs are client-supplied UUIDs so a complete graph can be validated before persistence. PostgreSQL stores normalized relationships; road polylines are the deliberate JSONB exception.

Coordinates support `WGS84` (`x=longitude`, `y=latitude`) and `LOCAL_CARTESIAN`. A road edit follows MapLibre → temporary Terra Draw feature → PATCH geometry API → Pydantic/business validation → PostgreSQL → city refetch. OSM data is normalized into these entities rather than becoming a separate model.
