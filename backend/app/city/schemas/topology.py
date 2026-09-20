from uuid import UUID

from pydantic import BaseModel

from app.city.domain.geometry import Polyline
from app.city.schemas.intersection import IntersectionCreate


class TopologyRoadUpdate(BaseModel):
    id: UUID
    geometry: Polyline


class TopologyUpdate(BaseModel):
    roads: list[TopologyRoadUpdate]
    intersections: list[IntersectionCreate]
