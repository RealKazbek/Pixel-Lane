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
    default_speed_limit_kmh: float = Field(gt=0, le=MAX_SPEED_LIMIT_KMH)
    lanes: list[LaneCreate] = Field(min_length=1, max_length=MAX_LANES_PER_ROAD)


class RoadRead(BaseModel):
    id: UUID
    city_id: UUID
    name: str
    road_type: RoadType
    geometry: Polyline
    default_speed_limit_kmh: float
    lanes: list[LaneRead]

    model_config = {"from_attributes": True}
