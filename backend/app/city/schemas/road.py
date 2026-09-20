from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.city.domain.enums import (
    CyclewayType,
    LaneBoundaryMarking,
    LaneCountQuality,
    LaneDirection,
    MedianType,
    MovementType,
    ParkingLaneOrientation,
    RoadEdgeMarking,
    RoadType,
)
from app.city.domain.geometry import Polyline
from app.city.domain.limits import (
    MAX_LANES_PER_ROAD,
    MAX_SPEED_LIMIT_KMH,
    NAME_MAX_LENGTH,
)
from app.city.domain.road_geometry import (
    MAX_LANE_WIDTH_M,
    MAX_ROAD_WIDTH_M,
    MIN_LANE_WIDTH_M,
    MIN_ROAD_WIDTH_M,
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
    width_m: float | None = Field(default=None, ge=MIN_ROAD_WIDTH_M, le=MAX_ROAD_WIDTH_M)
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
    left_edge_marking: RoadEdgeMarking = RoadEdgeMarking.SOLID_YELLOW
    right_edge_marking: RoadEdgeMarking = RoadEdgeMarking.SOLID_YELLOW
    lane_boundary_markings: list[LaneBoundaryMarking] | None = None

    @model_validator(mode="after")
    def validate_boundary_markings(self) -> "RoadCreate":
        if self.lane_boundary_markings is not None and len(self.lane_boundary_markings) != max(
            0, len(self.lanes) - 1
        ):
            raise ValueError("lane_boundary_markings must match lane count - 1")
        return self


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
    left_edge_marking: RoadEdgeMarking = RoadEdgeMarking.SOLID_YELLOW
    right_edge_marking: RoadEdgeMarking = RoadEdgeMarking.SOLID_YELLOW
    lane_boundary_markings: list[LaneBoundaryMarking] | None = None

    model_config = {"from_attributes": True}


class RoadGeometryUpdate(BaseModel):
    """Replaces a road's polyline -- e.g. manually correcting imported OSM
    geometry in the 2D map editor. Nothing else about the road changes."""

    geometry: Polyline


class RoadPropertiesUpdate(BaseModel):
    """Updates a road's name and uniform lane configuration atomically."""

    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    width_m: float = Field(ge=MIN_ROAD_WIDTH_M, le=MAX_ROAD_WIDTH_M)
    lane_count: int = Field(ge=1, le=12)
    lane_width_m: float = Field(ge=MIN_LANE_WIDTH_M, le=MAX_LANE_WIDTH_M)
    lane_directions: list[LaneDirection] = Field(min_length=1, max_length=12)
    lane_allowed_movements: list[list[MovementType]] | None = Field(default=None, max_length=12)
    left_edge_marking: RoadEdgeMarking = RoadEdgeMarking.SOLID_YELLOW
    right_edge_marking: RoadEdgeMarking = RoadEdgeMarking.SOLID_YELLOW
    lane_boundary_markings: list[LaneBoundaryMarking] = Field(default_factory=list, max_length=11)

    @model_validator(mode="after")
    def validate_lane_configuration(self) -> "RoadPropertiesUpdate":
        if len(self.lane_directions) != self.lane_count:
            raise ValueError("lane_directions must match lane_count")
        if self.lane_allowed_movements is not None:
            if len(self.lane_allowed_movements) != self.lane_count:
                raise ValueError("lane_allowed_movements must match lane_count")
            if any(len(movements) > 4 for movements in self.lane_allowed_movements):
                raise ValueError("lane_allowed_movements contains too many movements")
        expected = self.lane_count * self.lane_width_m
        if abs(self.width_m - expected) > 0.001:
            raise ValueError("width_m must equal lane_count * lane_width_m")
        if len(self.lane_boundary_markings) not in (0, self.lane_count - 1):
            raise ValueError("lane_boundary_markings must match lane_count - 1")
        return self
