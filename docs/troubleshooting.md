# Troubleshooting

- **Stale frontend:** `make start` rebuilds images. Confirm what owns ports 3000/8000 with `lsof` or `docker compose ps`; source edits do not affect an already-baked image.
- **Frontend cannot reach backend:** check `NEXT_PUBLIC_BACKEND_URL`, CORS, backend health, and rebuild because public Next variables are build-time values.
- **Blank map:** confirm city API data, MapLibre worker/static asset, overlay visibility, layer order, and optional basemap configuration. A missing style URL is expected when the basemap is off.
- **Missing labels:** glyph fetching is external MapLibre demo infrastructure; network failures can prevent text rendering.
- **Postgres/container issue:** use `make status` and `make logs`; do not use destructive `make reset` unless intentionally discarding data.
- **Almaty disappeared:** restore/import only intentionally; inspect `TEST_DATABASE_URL` before backend pytest.
- **Build or port failure:** stop conflicting local servers, inspect 3000/8000, then rebuild with `make start`.
