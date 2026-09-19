from uuid import UUID

from pydantic import BaseModel, Field

from app.city.domain.enums import IntersectionControlType
from app.city.domain.geometry import Point
from app.city.domain.limits import MAX_LANES_PER_INTERSECTION, MAX_ROADS_PER_INTERSECTION


class IntersectionCreate(BaseModel):
    id: UUID
    position: Point
    connected_road_ids: list[UUID] = Field(min_length=1, max_length=MAX_ROADS_PER_INTERSECTION)
    connected_lane_ids: list[UUID] = Field(
        default_factory=list, max_length=MAX_LANES_PER_INTERSECTION
    )
    control_type: IntersectionControlType
    traffic_light_id: UUID | None = None


class IntersectionRead(BaseModel):
    id: UUID
    city_id: UUID
    position: Point
    connected_road_ids: list[UUID]
    connected_lane_ids: list[UUID]
    control_type: IntersectionControlType
    traffic_light_id: UUID | None

    model_config = {"from_attributes": True}


class IntersectionUpdate(BaseModel):
    position: Point
    connected_road_ids: list[UUID] = Field(min_length=1, max_length=MAX_ROADS_PER_INTERSECTION)
    connected_lane_ids: list[UUID] = Field(
        default_factory=list, max_length=MAX_LANES_PER_INTERSECTION
    )
    control_type: IntersectionControlType
