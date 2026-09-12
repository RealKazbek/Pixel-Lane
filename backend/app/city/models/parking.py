import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.city.models.city import City
    from app.city.models.lane import Lane
    from app.city.models.road import Road


class ParkingZone(Base):
    __tablename__ = "parking_zones"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    city_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"), index=True
    )
    road_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("roads.id", ondelete="CASCADE"), index=True
    )
    lane_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("lanes.id", ondelete="CASCADE"), index=True
    )
    allowed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    side: Mapped[str | None] = mapped_column(String(10))
    capacity: Mapped[int | None] = mapped_column(Integer)

    city: Mapped["City"] = relationship(back_populates="parking_zones")
    # Plain relationships (no back_populates needed) so SQLAlchemy's unit of
    # work knows to insert the referenced road/lane before this row --
    # without them, a raw FK column alone doesn't establish insert order.
    road: Mapped["Road"] = relationship()
    lane: Mapped["Lane | None"] = relationship()
