import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.city.models.road import Road


class Lane(Base):
    __tablename__ = "lanes"
    __table_args__ = (UniqueConstraint("road_id", "index", name="uq_lane_road_index"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    road_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("roads.id", ondelete="CASCADE"), index=True
    )
    index: Mapped[int] = mapped_column(Integer, nullable=False)
    direction: Mapped[str] = mapped_column(String(20), nullable=False)
    allowed_movements: Mapped[list[str]] = mapped_column(ARRAY(String(20)), nullable=False)
    lane_type: Mapped[str] = mapped_column(String(20), nullable=False)
    speed_limit_kmh: Mapped[float | None] = mapped_column(Float)

    road: Mapped["Road"] = relationship(back_populates="lanes")
