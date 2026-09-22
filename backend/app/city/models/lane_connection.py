import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.city.models.city import City
    from app.city.models.intersection import Intersection
    from app.city.models.lane import Lane
    from app.city.models.road import Road


class LaneConnection(Base):
    """Explicit movement from one lane through one intersection to another."""

    __tablename__ = "lane_connections"
    __table_args__ = (
        UniqueConstraint(
            "intersection_id",
            "from_lane_id",
            "to_lane_id",
            "maneuver",
            name="uq_lane_connection_movement",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    city_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"), index=True
    )
    intersection_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("intersections.id", ondelete="CASCADE"), index=True
    )
    from_road_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("roads.id", ondelete="CASCADE"), index=True
    )
    from_lane_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("lanes.id", ondelete="CASCADE"), index=True
    )
    to_road_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("roads.id", ondelete="CASCADE"), index=True
    )
    to_lane_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("lanes.id", ondelete="CASCADE"), index=True
    )
    maneuver: Mapped[str] = mapped_column(String(20), nullable=False)

    city: Mapped["City"] = relationship(back_populates="lane_connections")
    intersection: Mapped["Intersection"] = relationship()
    from_road: Mapped["Road"] = relationship(foreign_keys=[from_road_id])
    from_lane: Mapped["Lane"] = relationship(foreign_keys=[from_lane_id])
    to_road: Mapped["Road"] = relationship(foreign_keys=[to_road_id])
    to_lane: Mapped["Lane"] = relationship(foreign_keys=[to_lane_id])
