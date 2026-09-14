from uuid import UUID

from pydantic import BaseModel, Field

from app.city.domain.enums import RoadType
from app.city.domain.geometry import Polyline
from app.city.domain.limits import (
    MAX_LANES_PER_ROAD,
    MAX_SPEED_LIMIT_KMH,
    NAME_MAX_LENGTH,
)
from app.city.schemas.lane import LaneCreate, LaneRead


class RoadCreate(BaseModel):
    id: UUID
    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    road_type: RoadType
    geometry: Polyline
    default_speed_limit_kmh: float | None = Field(default=None, gt=0, le=MAX_SPEED_LIMIT_KMH)
    lanes: list[LaneCreate] = Field(default_factory=list, max_length=MAX_LANES_PER_ROAD)
    source_id: str | None = Field(default=None, max_length=2000)
    source_road_type: str | None = Field(default=None, max_length=200)
    one_way: bool | None = None
    source_lane_count: int | None = Field(default=None, gt=0)


class RoadRead(BaseModel):
    id: UUID
    city_id: UUID
    name: str
    road_type: RoadType
    geometry: Polyline
    default_speed_limit_kmh: float | None
    source_id: str | None = None
    source_road_type: str | None = None
    one_way: bool | None = None
    source_lane_count: int | None = None
    lanes: list[LaneRead]

    model_config = {"from_attributes": True}


class RoadGeometryUpdate(BaseModel):
    """Replaces a road's polyline -- e.g. manually correcting imported OSM
    geometry in the 2D map editor. Nothing else about the road changes."""

    geometry: Polyline
