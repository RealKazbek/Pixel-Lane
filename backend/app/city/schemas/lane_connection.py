from uuid import UUID

from pydantic import BaseModel, Field

from app.city.domain.enums import MovementType
from app.city.domain.limits import MAX_LANE_CONNECTIONS_PER_CITY


class LaneConnectionCreate(BaseModel):
    id: UUID
    intersection_id: UUID
    from_road_id: UUID
    from_lane_id: UUID
    to_road_id: UUID
    to_lane_id: UUID
    maneuver: MovementType


class LaneConnectionRead(LaneConnectionCreate):
    city_id: UUID

    model_config = {"from_attributes": True}


class LaneConnectionsUpdate(BaseModel):
    connections: list[LaneConnectionCreate] = Field(
        default_factory=list, max_length=MAX_LANE_CONNECTIONS_PER_CITY
    )


class LaneConnectionGenerationResult(BaseModel):
    connections: list[LaneConnectionRead]
    warnings: list[str] = Field(default_factory=list)
