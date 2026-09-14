"""Trusted offline import contract; HTTP CityCreate limits remain unchanged."""

from pydantic import Field

from app.city.schemas.city import CityCreate
from app.city.schemas.intersection import IntersectionCreate
from app.city.schemas.road import RoadCreate
from app.city.schemas.traffic_light import TrafficLightCreate
from app.city.schemas.traffic_rule import TrafficRuleCreate


class CityImport(CityCreate):
    roads: list[RoadCreate] = Field(default_factory=list, max_length=200_000)
    intersections: list[IntersectionCreate] = Field(default_factory=list, max_length=200_000)
    traffic_lights: list[TrafficLightCreate] = Field(default_factory=list, max_length=50_000)
    traffic_rules: list[TrafficRuleCreate] = Field(default_factory=list, max_length=200_000)
