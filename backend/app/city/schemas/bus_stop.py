from uuid import UUID

from pydantic import BaseModel, Field

from app.city.domain.limits import NAME_MAX_LENGTH


class BusStopCreate(BaseModel):
    id: UUID
    road_id: UUID
    position_x: float
    position_y: float
    name: str | None = Field(default=None, max_length=NAME_MAX_LENGTH)


class BusStopRead(BaseModel):
    id: UUID
    city_id: UUID
    road_id: UUID
    position_x: float
    position_y: float
    name: str | None

    model_config = {"from_attributes": True}
