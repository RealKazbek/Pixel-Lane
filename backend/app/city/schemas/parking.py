from uuid import UUID

from pydantic import BaseModel, Field

from app.city.domain.enums import ParkingSide
from app.city.domain.limits import MAX_PARKING_CAPACITY


class ParkingZoneCreate(BaseModel):
    id: UUID
    road_id: UUID
    lane_id: UUID | None = None
    allowed: bool
    side: ParkingSide | None = None
    capacity: int | None = Field(default=None, gt=0, le=MAX_PARKING_CAPACITY)


class ParkingZoneRead(BaseModel):
    id: UUID
    city_id: UUID
    road_id: UUID
    lane_id: UUID | None
    allowed: bool
    side: ParkingSide | None
    capacity: int | None

    model_config = {"from_attributes": True}
