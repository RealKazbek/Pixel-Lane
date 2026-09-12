from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.city.domain.enums import MovementType, VehicleCategory
from app.city.domain.limits import MAX_VEHICLES_PER_HOUR, TIME_INTERVAL_MAX_LENGTH


class TrafficDemandCreate(BaseModel):
    """A manual, approximate traffic-volume entry for future simulation use.

    Demand flows from a source intersection to either a destination
    intersection or a specific movement at the source -- at least one of
    the two must be given.
    """

    id: UUID
    source_intersection_id: UUID
    destination_intersection_id: UUID | None = None
    movement: MovementType | None = None
    vehicles_per_hour: float = Field(gt=0, le=MAX_VEHICLES_PER_HOUR)
    time_interval: str | None = Field(default=None, max_length=TIME_INTERVAL_MAX_LENGTH)
    vehicle_category: VehicleCategory | None = None

    @model_validator(mode="after")
    def _require_destination_or_movement(self) -> "TrafficDemandCreate":
        if self.destination_intersection_id is None and self.movement is None:
            raise ValueError("either destination_intersection_id or movement must be set")
        return self


class TrafficDemandRead(BaseModel):
    id: UUID
    city_id: UUID
    source_intersection_id: UUID
    destination_intersection_id: UUID | None
    movement: MovementType | None
    vehicles_per_hour: float
    time_interval: str | None
    vehicle_category: VehicleCategory | None

    model_config = {"from_attributes": True}
