# API

The API base is `/api/v1`; generated OpenAPI at `http://localhost:8000/docs` is the endpoint source of truth.

- `GET /cities` and `GET /cities/{city_id}` list/read the full City Model.
- `GET /cities/{city_id}/roads?bbox=minLon,minLat,maxLon,maxLat` and `GET /cities/{city_id}/intersections?bbox=...` return only geometry intersecting a WGS84 bbox (real PostGIS `ST_Intersects`, see docs/city-model.md) -- the viewport-driven map's data source, additive to the full-city endpoint above.
- `POST /cities/validate` validates a payload without persistence; `POST /cities` validates and creates it.
- `PATCH /cities/{city_id}/roads/{road_id}/geometry` persists a road polyline replacement.
- `POST /cities/{city_id}/traffic-analysis` runs the Traffic Engine adapter.

Pydantic validates request shape at the boundary and City validators enforce references/invariants. The frontend uses these endpoints through `frontend/src/features/city-viewer/api/`.
