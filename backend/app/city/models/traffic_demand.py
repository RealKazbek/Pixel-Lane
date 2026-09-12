import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.city.models.city import City
    from app.city.models.intersection import Intersection


class TrafficDemand(Base):
    __tablename__ = "traffic_demands"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    city_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"), index=True
    )
    source_intersection_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("intersections.id", ondelete="CASCADE"), index=True
    )
    destination_intersection_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("intersections.id", ondelete="CASCADE"), index=True
    )
    movement: Mapped[str | None] = mapped_column(String(20))
    vehicles_per_hour: Mapped[float] = mapped_column(Float, nullable=False)
    time_interval: Mapped[str | None] = mapped_column(String(50))
    vehicle_category: Mapped[str | None] = mapped_column(String(20))

    city: Mapped["City"] = relationship(back_populates="traffic_demands")
    # Plain relationships (no back_populates needed) purely so SQLAlchemy's
    # unit of work inserts the referenced intersections before this row.
    source_intersection: Mapped["Intersection"] = relationship(
        foreign_keys=[source_intersection_id]
    )
    destination_intersection: Mapped["Intersection | None"] = relationship(
        foreign_keys=[destination_intersection_id]
    )
