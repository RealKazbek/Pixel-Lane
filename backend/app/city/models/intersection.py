import uuid
from typing import TYPE_CHECKING

from geoalchemy2 import Geometry, WKBElement
from sqlalchemy import Float, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.city.models.associations import intersection_lane_link, intersection_road_link
from app.db.base import Base

if TYPE_CHECKING:
    from app.city.models.city import City
    from app.city.models.lane import Lane
    from app.city.models.road import Road
    from app.city.models.traffic_light import TrafficLight


class Intersection(Base):
    __tablename__ = "intersections"
    __table_args__ = (Index("ix_intersections_geom", "geom", postgresql_using="gist"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    city_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"), index=True
    )
    position_x: Mapped[float] = mapped_column(Float, nullable=False)
    position_y: Mapped[float] = mapped_column(Float, nullable=False)
    # PostGIS mirror of position_x/position_y, WGS84 (SRID 4326), used only
    # for spatial (bbox) queries -- see docs/city-model.md. NULL for
    # LOCAL_CARTESIAN cities (see Road.geom's docstring for the same
    # reasoning). `spatial_index=False`: the GiST index is created
    # explicitly by the Alembic migration that adds this column.
    geom: Mapped[WKBElement | None] = mapped_column(
        Geometry("POINT", srid=4326, spatial_index=False), nullable=True
    )
    control_type: Mapped[str] = mapped_column(String(30), nullable=False)

    city: Mapped["City"] = relationship(back_populates="intersections")
    connected_roads: Mapped[list["Road"]] = relationship(secondary=intersection_road_link)
    connected_lanes: Mapped[list["Lane"]] = relationship(secondary=intersection_lane_link)
    # One-to-one: the traffic light owns the FK (see TrafficLight.intersection_id).
    traffic_light: Mapped["TrafficLight | None"] = relationship(
        back_populates="intersection", uselist=False, cascade="all, delete-orphan"
    )
