# Testing and safety

Frontend: `npm run lint`, `npm run typecheck`, `npm run check:i18n`,
`npm test`, `npm run build` (or the `make frontend-*` equivalents). Backend:
`make backend-lint`, `make backend-typecheck`, `make backend-test`.
Simulation: `make simulation-lint`, `make simulation-typecheck`,
`make simulation-test`. Repository/agent-instruction integrity:
`make check-agents`.

## Critical database warning

Do **not** run backend pytest against the shared development database.
`backend/tests/conftest.py` requires `TEST_DATABASE_URL` to be set
explicitly to an isolated PostgreSQL database whose name ends in `_test`
(it refuses to start otherwise, and never falls back to the shared
development database or to SQLite) — set and verify that variable before
running `pytest` locally. Tests that need PostgreSQL are skipped, not
faked, if it isn't reachable. Never use tests to wipe or alter the Almaty
demo city.

## Continuous Integration

Every Pull Request against `main` (and every push to `main`, for
post-merge verification) runs
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — a GitHub
Actions workflow with four independent jobs:

| Job (check name) | What it runs | Needs a database? |
| --- | --- | --- |
| **Agent & Repository Policy Checks** | `node scripts/check-agents.mjs` | No |
| **Frontend** | `npm ci`, lint, typecheck, `check:i18n`, unit tests (`vitest`), production build | No |
| **Backend** | `ruff check`/`ruff format --check`, `mypy`, `alembic upgrade head`, `pytest` | Yes — see below |
| **Simulation** | `ruff check`/`ruff format --check`, `mypy`, `pytest` | No |

**Backend database strategy.** The Backend job provisions its own isolated
PostgreSQL **service container** for the lifetime of that job only
(`postgis/postgis:16-3.4`, matching `docker-compose.yml`'s PostGIS
requirement — plain `postgres:16` lacks the extension the City Model
migrations need). Its database is named `pixel_lane_test` (satisfying
`conftest.py`'s `_test`-suffix requirement) with CI-only, non-secret
credentials defined directly in the workflow — never the shared
development database, never a real credential, and never SQLite as a
substitute for PostgreSQL-dependent behavior (AGENTS.md § 5, § 6, § 8).
The job runs `alembic upgrade head` against that database before `pytest`,
the same way you would locally.

**Reproducing CI locally.** Every job maps directly to `make` targets you
already have:

```
make check-agents

make frontend-lint frontend-typecheck frontend-check-i18n frontend-test frontend-build

make start-db                      # or any reachable PostgreSQL matching the
                                    # image/credentials above
export TEST_DATABASE_URL=postgresql+psycopg://<user>:<pass>@localhost:5432/<name>_test
DATABASE_URL="$TEST_DATABASE_URL" make migrate
make backend-lint backend-typecheck backend-test

make simulation-lint simulation-typecheck simulation-test
```

**Branch protection.** `main`'s branch-protection ruleset currently does
**not** require these checks to pass before merge — see
[docs/developer-onboarding.md](developer-onboarding.md) §8. Making them
required status checks is intentionally deferred until the workflow has
run stably on real PRs for a while; until then, treat a CI failure as a
strong signal to fix, not yet a hard merge gate. See the `Developer
Platform / CI` epic in the Notion Development Workspace for that
follow-up.

**What CI does not do.** No deployment, no Redis/Kafka/other
infrastructure, no OSM import (`osm` is an isolated optional dependency
group — see `backend/app/city/importers/osm/README.md` — not part of the
default `dev` install CI uses). Kept deliberately small per AGENTS.md § 5's
"scalability by design, not over-engineering."
