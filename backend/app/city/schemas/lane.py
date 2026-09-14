from uuid import UUID

from pydantic import BaseModel, Field

from app.city.domain.enums import LaneDirection, LaneType, MovementType
from app.city.domain.limits import MAX_SPEED_LIMIT_KMH


class LaneCreate(BaseModel):
    """A lane, nested under its parent road in a City payload.

    `id` is assigned by the client (e.g. the future 2D editor) so it can be
    referenced by other entities (traffic lights, rules, parking) within
    the same payload before anything is persisted.
    """

    id: UUID
    index: int = Field(ge=0, le=100)
    direction: LaneDirection
    allowed_movements: list[MovementType] = Field(default_factory=list, max_length=4)
    lane_type: LaneType = LaneType.GENERAL
    speed_limit_kmh: float | None = Field(default=None, gt=0, le=MAX_SPEED_LIMIT_KMH)


class LaneRead(BaseModel):
    id: UUID
    road_id: UUID
    index: int
    direction: LaneDirection
    allowed_movements: list[MovementType]
    lane_type: LaneType
    speed_limit_kmh: float | None

    model_config = {"from_attributes": True}
