# Traffic Engine v1

The Traffic Engine in `simulation/pixel_lane_simulation/traffic/` is a pure Python, framework-independent static analysis engine. The backend adapter converts City Model reads into its own input contracts; the engine never imports FastAPI, SQLAlchemy, or frontend code.

It builds a directed network, routes supplied demand with deterministic shortest free-flow-time paths, applies a documented flat lane-capacity baseline, and returns flow, congestion, warnings, and bottlenecks. It is not live traffic, vehicle simulation, signal-timing simulation, adaptive control, or SUMO. The MapLibre congestion overlay remains pending.
