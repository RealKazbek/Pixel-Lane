import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.city.models.city import City
    from app.city.models.road import Road


class BusStop(Base):
    """A bus stop's map position along a road -- first-class so the
    renderer (and, later, public-transport domain logic) has a real
    entity instead of a decorative map symbol placed at an arbitrary
    coordinate. See docs/city-model.md's minimal-new-entity pattern.
    """

    __tablename__ = "bus_stops"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    city_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"), index=True
    )
    road_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("roads.id", ondelete="CASCADE"), index=True
    )
    position_x: Mapped[float] = mapped_column(Float, nullable=False)
    position_y: Mapped[float] = mapped_column(Float, nullable=False)
    name: Mapped[str | None] = mapped_column(String(200))

    city: Mapped["City"] = relationship(back_populates="bus_stops")
    # Plain relationship (no back_populates needed) so SQLAlchemy's unit of
    # work knows to insert the referenced road before this row -- see
    # ParkingZone.road's docstring for the same reasoning.
    road: Mapped["Road"] = relationship()
