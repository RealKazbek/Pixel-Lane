from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.city.domain.enums import CoordinateSystem
from app.city.domain.limits import (
    DESCRIPTION_MAX_LENGTH,
    MAX_BUS_STOPS_PER_CITY,
    MAX_CROSSWALKS_PER_CITY,
    MAX_INTERSECTIONS_PER_CITY,
    MAX_LANE_CONNECTIONS_PER_CITY,
    MAX_PARKING_ZONES_PER_CITY,
    MAX_ROADS_PER_CITY,
    MAX_TRAFFIC_DEMANDS_PER_CITY,
    MAX_TRAFFIC_LIGHTS_PER_CITY,
    MAX_TRAFFIC_RULES_PER_CITY,
    NAME_MAX_LENGTH,
)
from app.city.schemas.bus_stop import BusStopCreate, BusStopRead
from app.city.schemas.crosswalk import CrosswalkCreate, CrosswalkRead
from app.city.schemas.intersection import IntersectionCreate, IntersectionRead
from app.city.schemas.lane_connection import LaneConnectionCreate, LaneConnectionRead
from app.city.schemas.parking import ParkingZoneCreate, ParkingZoneRead
from app.city.schemas.road import RoadCreate, RoadRead
from app.city.schemas.traffic_demand import TrafficDemandCreate, TrafficDemandRead
from app.city.schemas.traffic_light import TrafficLightCreate, TrafficLightRead
from app.city.schemas.traffic_rule import TrafficRuleCreate, TrafficRuleRead


class CityCreate(BaseModel):
    """The full nested payload used to validate or create a City.

    IDs for nested entities are supplied by the client (e.g. the future 2D
    editor) so entities can reference each other (an intersection
    referencing its roads, a traffic light referencing its intersection,
    etc.) within a single payload before anything is persisted.
    """

    id: UUID
    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX_LENGTH)
    coordinate_system: CoordinateSystem
    # Data-freshness/provenance metadata -- `None` for ordinary (non-import)
    # city creation, set only by the OSM importer (see
    # app.city.importers.osm.cli/full_cli). Never fabricated: if the
    # importer can't determine a real value it leaves the field `None`
    # rather than guessing (see docs/city-model.md's data-freshness note).
    import_source: str | None = Field(default=None, max_length=200)
    imported_at: datetime | None = None
    import_query: dict | None = None

    roads: list[RoadCreate] = Field(default_factory=list, max_length=MAX_ROADS_PER_CITY)
    intersections: list[IntersectionCreate] = Field(
        default_factory=list, max_length=MAX_INTERSECTIONS_PER_CITY
    )
    traffic_lights: list[TrafficLightCreate] = Field(
        default_factory=list, max_length=MAX_TRAFFIC_LIGHTS_PER_CITY
    )
    traffic_rules: list[TrafficRuleCreate] = Field(
        default_factory=list, max_length=MAX_TRAFFIC_RULES_PER_CITY
    )
    parking_zones: list[ParkingZoneCreate] = Field(
        default_factory=list, max_length=MAX_PARKING_ZONES_PER_CITY
    )
    traffic_demands: list[TrafficDemandCreate] = Field(
        default_factory=list, max_length=MAX_TRAFFIC_DEMANDS_PER_CITY
    )
    bus_stops: list[BusStopCreate] = Field(default_factory=list, max_length=MAX_BUS_STOPS_PER_CITY)
    crosswalks: list[CrosswalkCreate] = Field(
        default_factory=list, max_length=MAX_CROSSWALKS_PER_CITY
    )
    lane_connections: list[LaneConnectionCreate] = Field(
        default_factory=list, max_length=MAX_LANE_CONNECTIONS_PER_CITY
    )


class CityRead(BaseModel):
    id: UUID
    name: str
    description: str | None
    coordinate_system: CoordinateSystem
    created_at: datetime
    updated_at: datetime
    import_source: str | None = None
    imported_at: datetime | None = None
    import_query: dict | None = None

    roads: list[RoadRead]
    intersections: list[IntersectionRead]
    traffic_lights: list[TrafficLightRead]
    traffic_rules: list[TrafficRuleRead]
    parking_zones: list[ParkingZoneRead]
    traffic_demands: list[TrafficDemandRead]
    bus_stops: list[BusStopRead]
    crosswalks: list[CrosswalkRead]
    lane_connections: list[LaneConnectionRead]

    model_config = {"from_attributes": True}


class CitySummary(BaseModel):
    """Lightweight representation for list endpoints."""

    id: UUID
    name: str
    coordinate_system: CoordinateSystem
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CityMetadata(CitySummary):
    description: str | None
    bounds: tuple[float, float, float, float] | None
    road_count: int


class ValidationIssue(BaseModel):
    """A single, machine-readable validation problem."""

    code: str
    message: str
    path: str


class CityValidationResult(BaseModel):
    valid: bool
    issues: list[ValidationIssue] = Field(default_factory=list)
