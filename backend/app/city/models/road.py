import uuid
from typing import TYPE_CHECKING, Any

from geoalchemy2 import Geometry, WKBElement
from sqlalchemy import Boolean, CheckConstraint, Float, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.city.models.city import City
    from app.city.models.lane import Lane


class Road(Base):
    __tablename__ = "roads"
    __table_args__ = (
        CheckConstraint("source_lane_count > 0", name="ck_roads_source_lane_count"),
        Index("ix_roads_geom", "geom", postgresql_using="gist"),
    )

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
    # PostGIS mirror of `geometry` above, in WGS84 (SRID 4326), used only
    # for spatial (bbox) queries -- see docs/city-model.md's spatial
    # schema section. NULL for LOCAL_CARTESIAN cities, whose coordinates
    # aren't real geographic positions and so aren't spatially queryable.
    # `geometry` (JSONB) remains the source of truth for ordered points
    # and non-WGS84 cities; this column is deliberately kept in sync with
    # it rather than replacing it in this task.
    # `spatial_index=False`: the GiST index is created explicitly by the
    # Alembic migration that adds this column, not by GeoAlchemy2's DDL
    # event hook, so there is exactly one place that owns it.
    geom: Mapped[WKBElement | None] = mapped_column(
        Geometry("LINESTRING", srid=4326, spatial_index=False), nullable=True
    )
    default_speed_limit_kmh: Mapped[float | None] = mapped_column(Float, nullable=True)
    source_id: Mapped[str | None] = mapped_column(String(2000))
    source_road_type: Mapped[str | None] = mapped_column(String(200))
    one_way: Mapped[bool | None] = mapped_column(Boolean)
    source_lane_count: Mapped[int | None] = mapped_column(Integer)

    city: Mapped["City"] = relationship(back_populates="roads")
    lanes: Mapped[list["Lane"]] = relationship(
        back_populates="road",
        cascade="all, delete-orphan",
        order_by="Lane.index",
    )
