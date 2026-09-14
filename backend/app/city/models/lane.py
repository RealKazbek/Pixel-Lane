import uuid
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.city.models.road import Road


class Lane(Base):
    __tablename__ = "lanes"
    __table_args__ = (
        UniqueConstraint("road_id", "index", name="uq_lane_road_index"),
        CheckConstraint(
            "lane_change IS NULL OR lane_change IN "
            "('YES', 'NO', 'NOT_LEFT', 'NOT_RIGHT', 'ONLY_LEFT', 'ONLY_RIGHT')",
            name="ck_lanes_lane_change",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    road_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("roads.id", ondelete="CASCADE"), index=True
    )
    index: Mapped[int] = mapped_column(Integer, nullable=False)
    direction: Mapped[str] = mapped_column(String(20), nullable=False)
    allowed_movements: Mapped[list[str]] = mapped_column(ARRAY(String(20)), nullable=False)
    lane_type: Mapped[str] = mapped_column(String(20), nullable=False)
    speed_limit_kmh: Mapped[float | None] = mapped_column(Float)

    # --- City Model Part 2A: lane data parsing ---------------------------
    # Normalized `turn:lanes=*` tokens for this lane (see TurnLaneType).
    # NULL = no turn-lane data for this road at all (tag absent or
    # discarded as unreliable); an empty array = the tag was present and
    # trustworthy but asserted nothing for this specific lane -- these are
    # deliberately distinct (see app.city.importers.osm.normalization).
    allowed_turns: Mapped[list[str] | None] = mapped_column(ARRAY(String(20)), nullable=True)
    # Normalized `change:lanes=*` value for this lane (see
    # LaneChangePermission), NULL when not provided/unreliable.
    lane_change: Mapped[str | None] = mapped_column(String(20), nullable=True)

    road: Mapped["Road"] = relationship(back_populates="lanes")
