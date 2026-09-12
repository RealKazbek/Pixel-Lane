import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.city.models.city import City


class TrafficRule(Base):
    __tablename__ = "traffic_rules"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    city_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"), index=True
    )
    rule_type: Mapped[str] = mapped_column(String(30), nullable=False)
    # target_type + target_id form a polymorphic reference (road, lane,
    # intersection, or movement/intersection). A single FK cannot span
    # multiple target tables, so target_id is a plain UUID column;
    # referential integrity for it is enforced at the application layer
    # (see app.city.validators.city_validator), not the database.
    target_type: Mapped[str] = mapped_column(String(30), nullable=False)
    target_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    movement: Mapped[str | None] = mapped_column(String(20))
    speed_limit_kmh: Mapped[float | None] = mapped_column(Float)

    city: Mapped["City"] = relationship(back_populates="traffic_rules")
