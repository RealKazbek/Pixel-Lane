"""The Traffic Engine's own City Model input contract.

This is a deliberately independent, minimal mirror of the concepts in
`backend/app/city` -- not an import of it. The Traffic Engine must not
depend on the backend (FastAPI/SQLAlchemy/Pydantic); the backend adapter
(`backend/app/traffic/adapter.py`) is responsible for translating a
persisted City into these plain dataclasses before calling the engine.

Only the fields the engine actually uses are included (e.g. no traffic
lights/parking yet -- v1 doesn't model signal timing or parking).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal
from uuid import UUID

CoordinateSystem = Literal["LOCAL_CARTESIAN", "WGS84"]
LaneDirection = Literal["FORWARD", "BACKWARD"]


@dataclass(frozen=True)
class PointInput:
    x: float
    y: float


@dataclass(frozen=True)
class LaneInput:
    id: UUID
    index: int
    direction: LaneDirection
    speed_limit_kmh: float | None = None


@dataclass(frozen=True)
class RoadInput:
    id: UUID
    name: str
    geometry_points: tuple[PointInput, ...]
    default_speed_limit_kmh: float
    lanes: tuple[LaneInput, ...]


@dataclass(frozen=True)
class IntersectionInput:
    id: UUID
    position: PointInput
    connected_road_ids: tuple[UUID, ...]


@dataclass(frozen=True)
class TrafficDemandInput:
    id: UUID
    source_intersection_id: UUID
    destination_intersection_id: UUID | None
    vehicles_per_hour: float


@dataclass(frozen=True)
class CityInput:
    id: UUID
    name: str
    coordinate_system: CoordinateSystem
    roads: tuple[RoadInput, ...] = field(default_factory=tuple)
    intersections: tuple[IntersectionInput, ...] = field(default_factory=tuple)
    traffic_demands: tuple[TrafficDemandInput, ...] = field(default_factory=tuple)
