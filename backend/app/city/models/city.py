import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.city.models.bus_stop import BusStop
    from app.city.models.crosswalk import Crosswalk
    from app.city.models.intersection import Intersection
    from app.city.models.parking import ParkingZone
    from app.city.models.road import Road
    from app.city.models.traffic_demand import TrafficDemand
    from app.city.models.traffic_light import TrafficLight
    from app.city.models.traffic_rule import TrafficRule


class City(Base):
    __tablename__ = "cities"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000))
    coordinate_system: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # --- Data-freshness/provenance metadata -------------------------------
    # `None` for a city that was never (re-)imported from an external
    # source (e.g. a hand-built example city). Set only by the OSM
    # importer -- never fabricated, see docs/city-model.md.
    import_source: Mapped[str | None] = mapped_column(String(200))
    imported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    import_query: Mapped[dict | None] = mapped_column(JSONB)

    roads: Mapped[list["Road"]] = relationship(back_populates="city", cascade="all, delete-orphan")
    intersections: Mapped[list["Intersection"]] = relationship(
        back_populates="city", cascade="all, delete-orphan"
    )
    traffic_lights: Mapped[list["TrafficLight"]] = relationship(
        back_populates="city", cascade="all, delete-orphan"
    )
    traffic_rules: Mapped[list["TrafficRule"]] = relationship(
        back_populates="city", cascade="all, delete-orphan"
    )
    parking_zones: Mapped[list["ParkingZone"]] = relationship(
        back_populates="city", cascade="all, delete-orphan"
    )
    traffic_demands: Mapped[list["TrafficDemand"]] = relationship(
        back_populates="city", cascade="all, delete-orphan"
    )
    bus_stops: Mapped[list["BusStop"]] = relationship(
        back_populates="city", cascade="all, delete-orphan"
    )
    crosswalks: Mapped[list["Crosswalk"]] = relationship(
        back_populates="city", cascade="all, delete-orphan"
    )
