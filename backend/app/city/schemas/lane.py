from uuid import UUID

from pydantic import BaseModel, Field

from app.city.domain.enums import (
    LaneChangePermission,
    LaneDirection,
    LaneType,
    MovementType,
    TurnLaneType,
)
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
    # City Model Part 2A -- normalized OSM `turn:lanes`/`change:lanes`
    # data. `None` = no reliable source data for this lane; see
    # app.city.importers.osm.normalization for how these are derived and
    # never fabricated.
    allowed_turns: list[TurnLaneType] | None = Field(default=None, max_length=8)
    lane_change: LaneChangePermission | None = None


class LaneRead(BaseModel):
    id: UUID
    road_id: UUID
    index: int
    direction: LaneDirection
    allowed_movements: list[MovementType]
    lane_type: LaneType
    speed_limit_kmh: float | None
    allowed_turns: list[TurnLaneType] | None = None
    lane_change: LaneChangePermission | None = None

    model_config = {"from_attributes": True}
