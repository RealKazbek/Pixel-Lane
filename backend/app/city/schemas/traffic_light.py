from uuid import UUID

from pydantic import BaseModel, Field

from app.city.domain.limits import (
    MAX_LANES_PER_SIGNAL_GROUP,
    MAX_PHASE_DURATION_SECONDS,
    MAX_PHASES_PER_TRAFFIC_LIGHT,
    MAX_SIGNAL_GROUPS_PER_TRAFFIC_LIGHT,
    NAME_MAX_LENGTH,
)


class SignalGroupCreate(BaseModel):
    """A group of lanes that always shows the same signal state together."""

    id: UUID
    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    controlled_lane_ids: list[UUID] = Field(min_length=1, max_length=MAX_LANES_PER_SIGNAL_GROUP)


class PhaseCreate(BaseModel):
    """A fixed-timing phase: which signal groups get green, and for how long.

    Adaptive timing is not implemented yet -- `duration_seconds` is a fixed
    plan value, but the shape (ordered phases referencing signal groups)
    is what an adaptive controller would also need to drive.
    """

    id: UUID
    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    duration_seconds: int = Field(gt=0, le=MAX_PHASE_DURATION_SECONDS)
    green_signal_group_ids: list[UUID] = Field(
        min_length=1, max_length=MAX_SIGNAL_GROUPS_PER_TRAFFIC_LIGHT
    )


class TrafficLightCreate(BaseModel):
    id: UUID
    intersection_id: UUID
    signal_groups: list[SignalGroupCreate] = Field(
        min_length=1, max_length=MAX_SIGNAL_GROUPS_PER_TRAFFIC_LIGHT
    )
    phases: list[PhaseCreate] = Field(min_length=1, max_length=MAX_PHASES_PER_TRAFFIC_LIGHT)


class SignalGroupRead(BaseModel):
    id: UUID
    name: str
    controlled_lane_ids: list[UUID]

    model_config = {"from_attributes": True}


class PhaseRead(BaseModel):
    id: UUID
    name: str
    duration_seconds: int
    green_signal_group_ids: list[UUID]

    model_config = {"from_attributes": True}


class TrafficLightRead(BaseModel):
    id: UUID
    city_id: UUID
    intersection_id: UUID
    signal_groups: list[SignalGroupRead]
    phases: list[PhaseRead]

    model_config = {"from_attributes": True}
