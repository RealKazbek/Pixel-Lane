import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.city.models.city import City
    from app.city.models.lane import Lane


class Road(Base):
    __tablename__ = "roads"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    city_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    road_type: Mapped[str] = mapped_column(String(30), nullable=False)
    # Ordered list of {"x": float, "y": float} points. A polyline's point
    # order is intrinsic to its meaning, which does not map cleanly onto a
    # normalized table without extra ordering bookkeeping for no real
    # query benefit at this stage -- JSONB is the pragmatic, documented
    # exception here (see docs/architecture.md). Revisit if/when PostGIS
    # geometry columns are introduced.
    geometry: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    default_speed_limit_kmh: Mapped[float] = mapped_column(Float, nullable=False)

    city: Mapped["City"] = relationship(back_populates="roads")
    lanes: Mapped[list["Lane"]] = relationship(
        back_populates="road",
        cascade="all, delete-orphan",
        order_by="Lane.index",
    )
