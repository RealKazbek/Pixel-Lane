# Configuration

Never publish `.env`; use the tracked examples only.

| Variable | Scope | Default/example | Purpose |
| --- | --- | --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Compose/backend | `pixel_lane` / placeholder | PostgreSQL connection settings |
| `DATABASE_URL` | Compose/backend | PostgreSQL URL | Backend database connection |
| `BACKEND_ENVIRONMENT`, `BACKEND_DEBUG` | Compose | development / true | Backend runtime settings |
| `BACKEND_CORS_ALLOW_ORIGINS` / `CORS_ALLOW_ORIGINS` | Compose/backend | localhost frontend | Allowed browser origins |
| `APP_NAME`, `ENVIRONMENT`, `DEBUG` | backend local | examples in `backend/.env.example` | Backend local settings |
| `NEXT_PUBLIC_BACKEND_URL` | frontend | `http://localhost:8000` | Browser API base URL |
| `NEXT_PUBLIC_MAP_BASEMAP_ENABLED` | frontend | `false` | Enables optional reference basemap |
| `NEXT_PUBLIC_MAP_STYLE_URL` | frontend | empty | Optional MapLibre-compatible style URL |

`NEXT_PUBLIC_*` values are exposed to browser code and normally inlined during Next.js build. Rebuild the frontend image after changing them. Do not put provider keys in tracked configuration.
