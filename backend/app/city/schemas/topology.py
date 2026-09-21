from uuid import UUID

from pydantic import BaseModel, Field

from app.city.domain.geometry import Polyline
from app.city.schemas.intersection import IntersectionCreate
from app.city.schemas.road import RoadCreate


class TopologyRoadUpdate(BaseModel):
    id: UUID
    geometry: Polyline


class TopologyUpdate(BaseModel):
    roads: list[TopologyRoadUpdate]
    intersections: list[IntersectionCreate]
    # Roads created by one atomic editor topology operation (for example the
    # second child produced when an existing road is split).
    new_roads: list[RoadCreate] = Field(default_factory=list)
