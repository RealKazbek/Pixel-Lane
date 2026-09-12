# API

The API base is `/api/v1`; generated OpenAPI at `http://localhost:8000/docs` is the endpoint source of truth.

- `GET /cities` and `GET /cities/{city_id}` list/read City Model data.
- `POST /cities/validate` validates a payload without persistence; `POST /cities` validates and creates it.
- `PATCH /cities/{city_id}/roads/{road_id}/geometry` persists a road polyline replacement.
- `POST /cities/{city_id}/traffic-analysis` runs the Traffic Engine adapter.

Pydantic validates request shape at the boundary and City validators enforce references/invariants. The frontend uses these endpoints through `frontend/src/features/city-viewer/api/`.
