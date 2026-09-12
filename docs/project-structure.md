# Project structure

| Directory | Responsibility | Must not contain |
| --- | --- | --- |
| `frontend/` | Next.js presentation, API clients, map/editor state | City/traffic domain rules or persistence |
| `backend/` | FastAPI transport, City Model services/repositories, migrations | simulation algorithms or direct UI logic |
| `simulation/` | Framework-independent Traffic Engine | FastAPI, SQLAlchemy, React, or SUMO implementation |
| `docs/` | Current project documentation | generated build output or secrets |
| `.agents/` | task-specific agent skills | application domain code |

Put City Model changes under `backend/app/city/`; Traffic Engine work under `simulation/pixel_lane_simulation/traffic/`; frontend map work under `frontend/src/features/city-viewer/map/`. External systems belong behind adapters, never in domain code.
