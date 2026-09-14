import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.city.models.city import City
    from app.city.models.road import Road


class Crosswalk(Base):
    """A pedestrian crossing's position along a road, expressed as a
    ratio (0 = the road's first point, 1 = its last) rather than a
    separate x/y -- the renderer derives the actual point from the
    road's own centerline, so a crosswalk always stays attached to its
    road even if the road's geometry is later edited. See
    docs/city-model.md's minimal-new-entity pattern.
    """

    __tablename__ = "crosswalks"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    city_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"), index=True
    )
    road_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("roads.id", ondelete="CASCADE"), index=True
    )
    position_ratio: Mapped[float] = mapped_column(Float, nullable=False)

    city: Mapped["City"] = relationship(back_populates="crosswalks")
    road: Mapped["Road"] = relationship()
