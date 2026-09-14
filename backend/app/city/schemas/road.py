from uuid import UUID

from pydantic import BaseModel, Field

from app.city.domain.enums import (
    CyclewayType,
    LaneCountQuality,
    MedianType,
    ParkingLaneOrientation,
    RoadType,
)
from app.city.domain.geometry import Polyline
from app.city.domain.limits import (
    MAX_LANES_PER_ROAD,
    MAX_SPEED_LIMIT_KMH,
    NAME_MAX_LENGTH,
)
from app.city.schemas.lane import LaneCreate, LaneRead


class RoadCreate(BaseModel):
    id: UUID
    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    road_type: RoadType
    geometry: Polyline
    default_speed_limit_kmh: float | None = Field(default=None, gt=0, le=MAX_SPEED_LIMIT_KMH)
    lanes: list[LaneCreate] = Field(default_factory=list, max_length=MAX_LANES_PER_ROAD)
    source_id: str | None = Field(default=None, max_length=2000)
    source_road_type: str | None = Field(default=None, max_length=200)
    one_way: bool | None = None
    source_lane_count: int | None = Field(default=None, gt=0)
    width_m: float | None = Field(default=None, gt=0)
    is_width_estimated: bool = True
    carriageway_count: int = Field(default=1, ge=1, le=2)
    median: MedianType = MedianType.NONE
    level: int = Field(default=0, ge=-4, le=4)
    is_bridge: bool = False
    is_tunnel: bool = False
    forward_lane_count: int | None = Field(default=None, gt=0)
    backward_lane_count: int | None = Field(default=None, gt=0)
    both_ways_lane_count: int | None = Field(default=None, gt=0)
    lane_count_quality: LaneCountQuality = LaneCountQuality.FALLBACK
    parking_left: ParkingLaneOrientation = ParkingLaneOrientation.UNKNOWN
    parking_right: ParkingLaneOrientation = ParkingLaneOrientation.UNKNOWN
    cycleway_left: CyclewayType = CyclewayType.UNKNOWN
    cycleway_right: CyclewayType = CyclewayType.UNKNOWN


class RoadRead(BaseModel):
    id: UUID
    city_id: UUID
    name: str
    road_type: RoadType
    geometry: Polyline
    default_speed_limit_kmh: float | None
    source_id: str | None = None
    source_road_type: str | None = None
    one_way: bool | None = None
    source_lane_count: int | None = None
    width_m: float | None = None
    is_width_estimated: bool = True
    carriageway_count: int = 1
    median: MedianType = MedianType.NONE
    level: int = 0
    is_bridge: bool = False
    is_tunnel: bool = False
    forward_lane_count: int | None = None
    backward_lane_count: int | None = None
    both_ways_lane_count: int | None = None
    lane_count_quality: LaneCountQuality = LaneCountQuality.FALLBACK
    parking_left: ParkingLaneOrientation = ParkingLaneOrientation.UNKNOWN
    parking_right: ParkingLaneOrientation = ParkingLaneOrientation.UNKNOWN
    cycleway_left: CyclewayType = CyclewayType.UNKNOWN
    cycleway_right: CyclewayType = CyclewayType.UNKNOWN
    lanes: list[LaneRead]

    model_config = {"from_attributes": True}


class RoadGeometryUpdate(BaseModel):
    """Replaces a road's polyline -- e.g. manually correcting imported OSM
    geometry in the 2D map editor. Nothing else about the road changes."""

    geometry: Polyline
