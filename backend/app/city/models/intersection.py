import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.city.models.associations import intersection_lane_link, intersection_road_link
from app.db.base import Base

if TYPE_CHECKING:
    from app.city.models.city import City
    from app.city.models.lane import Lane
    from app.city.models.road import Road
    from app.city.models.traffic_light import TrafficLight


class Intersection(Base):
    __tablename__ = "intersections"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    city_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"), index=True
    )
    position_x: Mapped[float] = mapped_column(Float, nullable=False)
    position_y: Mapped[float] = mapped_column(Float, nullable=False)
    control_type: Mapped[str] = mapped_column(String(30), nullable=False)

    city: Mapped["City"] = relationship(back_populates="intersections")
    connected_roads: Mapped[list["Road"]] = relationship(secondary=intersection_road_link)
    connected_lanes: Mapped[list["Lane"]] = relationship(secondary=intersection_lane_link)
    # One-to-one: the traffic light owns the FK (see TrafficLight.intersection_id).
    traffic_light: Mapped["TrafficLight | None"] = relationship(
        back_populates="intersection", uselist=False, cascade="all, delete-orphan"
    )
