from uuid import UUID

from pydantic import BaseModel, Field


class CrosswalkCreate(BaseModel):
    id: UUID
    road_id: UUID
    position_ratio: float = Field(ge=0.0, le=1.0)


class CrosswalkRead(BaseModel):
    id: UUID
    city_id: UUID
    road_id: UUID
    position_ratio: float

    model_config = {"from_attributes": True}
