import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.city.models.associations import phase_signal_group_link, signal_group_lane_link
from app.db.base import Base

if TYPE_CHECKING:
    from app.city.models.city import City
    from app.city.models.intersection import Intersection
    from app.city.models.lane import Lane


class TrafficLight(Base):
    __tablename__ = "traffic_lights"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    city_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"), index=True
    )
    intersection_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("intersections.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )

    city: Mapped["City"] = relationship(back_populates="traffic_lights")
    intersection: Mapped["Intersection"] = relationship(back_populates="traffic_light")
    signal_groups: Mapped[list["SignalGroup"]] = relationship(
        back_populates="traffic_light", cascade="all, delete-orphan"
    )
    phases: Mapped[list["Phase"]] = relationship(
        back_populates="traffic_light", cascade="all, delete-orphan"
    )


class SignalGroup(Base):
    __tablename__ = "signal_groups"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    traffic_light_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("traffic_lights.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)

    traffic_light: Mapped["TrafficLight"] = relationship(back_populates="signal_groups")
    controlled_lanes: Mapped[list["Lane"]] = relationship(secondary=signal_group_lane_link)


class Phase(Base):
    __tablename__ = "phases"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    traffic_light_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("traffic_lights.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)

    traffic_light: Mapped["TrafficLight"] = relationship(back_populates="phases")
    green_signal_groups: Mapped[list["SignalGroup"]] = relationship(
        secondary=phase_signal_group_link
    )
