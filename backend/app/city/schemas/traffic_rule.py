from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.city.domain.enums import MovementType, TrafficRuleTargetType, TrafficRuleType
from app.city.domain.limits import MAX_SPEED_LIMIT_KMH


class TrafficRuleCreate(BaseModel):
    """A single traffic rule targeting a road, lane, intersection, or
    movement.

    One common shape is used for every rule type rather than a dedicated
    structure per rule, since the extra fields needed (`movement`,
    `speed_limit_kmh`) are only meaningful for specific combinations.
    """

    id: UUID
    rule_type: TrafficRuleType
    target_type: TrafficRuleTargetType
    target_id: UUID
    movement: MovementType | None = None
    speed_limit_kmh: float | None = Field(default=None, gt=0, le=MAX_SPEED_LIMIT_KMH)

    @model_validator(mode="after")
    def _check_type_specific_fields(self) -> "TrafficRuleCreate":
        if self.target_type == TrafficRuleTargetType.MOVEMENT and self.movement is None:
            raise ValueError("movement is required when target_type is MOVEMENT")
        if self.rule_type == TrafficRuleType.SPEED_LIMIT and self.speed_limit_kmh is None:
            raise ValueError("speed_limit_kmh is required when rule_type is SPEED_LIMIT")
        if self.rule_type == TrafficRuleType.TURN_RESTRICTION and self.movement is None:
            raise ValueError("movement is required when rule_type is TURN_RESTRICTION")
        return self


class TrafficRuleRead(BaseModel):
    id: UUID
    city_id: UUID
    rule_type: TrafficRuleType
    target_type: TrafficRuleTargetType
    target_id: UUID
    movement: MovementType | None
    speed_limit_kmh: float | None

    model_config = {"from_attributes": True}
