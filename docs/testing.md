# Testing and safety

Frontend: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (or Make equivalents). Backend: `make backend-lint`, `make backend-typecheck`, and `make backend-test`; simulation: `make simulation-test`.

## Critical database warning

Do **not** run backend pytest against the shared development database. `backend/tests/conftest.py` defaults `TEST_DATABASE_URL` to the development database and truncates `cities` after tests. Set and verify an isolated PostgreSQL `TEST_DATABASE_URL` first. Never use tests to wipe or alter the Almaty demo city.
