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
        CheckConstraint("width_m IS NULL OR width_m > 0", name="ck_roads_width_m"),
        CheckConstraint("carriageway_count IN (1, 2)", name="ck_roads_carriageway_count"),
        CheckConstraint(
            "median IN ('NONE', 'PAINTED', 'PHYSICAL', 'UNKNOWN')", name="ck_roads_median"
        ),
        CheckConstraint(
            "forward_lane_count IS NULL OR forward_lane_count > 0",
            name="ck_roads_forward_lane_count",
        ),
        CheckConstraint(
            "backward_lane_count IS NULL OR backward_lane_count > 0",
            name="ck_roads_backward_lane_count",
        ),
        CheckConstraint(
            "both_ways_lane_count IS NULL OR both_ways_lane_count > 0",
            name="ck_roads_both_ways_lane_count",
        ),
        CheckConstraint(
            "lane_count_quality IN ('SOURCE', 'INFERRED', 'FALLBACK', 'UNKNOWN')",
            name="ck_roads_lane_count_quality",
        ),
        CheckConstraint(
            "parking_left IN "
            "('NONE', 'PARALLEL', 'DIAGONAL', 'PERPENDICULAR', 'MARKED', 'UNKNOWN')",
            name="ck_roads_parking_left",
        ),
        CheckConstraint(
            "parking_right IN "
            "('NONE', 'PARALLEL', 'DIAGONAL', 'PERPENDICULAR', 'MARKED', 'UNKNOWN')",
            name="ck_roads_parking_right",
        ),
        CheckConstraint(
            "cycleway_left IN ('NONE', 'LANE', 'TRACK', 'SHARED_LANE', 'UNKNOWN')",
            name="ck_roads_cycleway_left",
        ),
        CheckConstraint(
            "cycleway_right IN ('NONE', 'LANE', 'TRACK', 'SHARED_LANE', 'UNKNOWN')",
            name="ck_roads_cycleway_right",
        ),
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

    # --- City Model Part 1: detailed road geometry -----------------------
    # Physical carriageway width in meters -- either an explicit
    # source-provided value or a centrally-computed fallback (see
    # app.city.domain.road_geometry). Nullable for rows imported before
    # this attribute existed; renderers/consumers must fall back to their
    # own estimate when it's NULL (backward compatibility).
    width_m: Mapped[float | None] = mapped_column(Float)
    # True when `width_m` is a fallback estimate rather than a real
    # source-provided measurement -- never treat an estimated width as
    # ground truth (e.g. for precise collision/lane-fit geometry later).
    is_width_estimated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # 1 = a single physical surface carries both directions (or this
    # road's one direction, per this Road's own polyline). 2 = this Road
    # is one of a pair of physically separated carriageways (e.g. a
    # divided arterial with a median). Only these two values are
    # supported in Part 1 -- individual lanes/turn geometry are later
    # roadmap parts.
    carriageway_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # none / painted-virtual / physical / unknown -- see MedianType.
    median: Mapped[str] = mapped_column(String(20), nullable=False, default="NONE")
    # Vertical level relative to ground: 0 = ground, positive = overpass/
    # bridge levels, negative = underpass/tunnel levels. Two roads that
    # cross in plan view but differ in `level` are NOT assumed to be an
    # intersection (this model never derives intersections from geometric
    # crossings -- see app.city.importers.osm.mapper, which only creates
    # Intersections from real OSM graph nodes).
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_bridge: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_tunnel: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # --- City Model Part 2A: lane data parsing ---------------------------
    # Raw OSM `lanes:forward` / `lanes:backward` / `lanes:both_ways` tag
    # values for the *original* (possibly two-way) way this Road was
    # derived from -- kept regardless of which direction this particular
    # Road represents (see app.city.importers.osm.mapper). NULL means the
    # tag was absent, never an inferred split (see docs/city-model.md).
    forward_lane_count: Mapped[int | None] = mapped_column(Integer)
    backward_lane_count: Mapped[int | None] = mapped_column(Integer)
    both_ways_lane_count: Mapped[int | None] = mapped_column(Integer)
    # SOURCE / INFERRED / FALLBACK / UNKNOWN -- confidence of this Road's
    # own generated lane count (`len(lanes)`). See LaneCountQuality.
    lane_count_quality: Mapped[str] = mapped_column(String(20), nullable=False, default="FALLBACK")
    left_edge_marking: Mapped[str] = mapped_column(
        String(30), nullable=False, default="SOLID_YELLOW"
    )
    right_edge_marking: Mapped[str] = mapped_column(
        String(30), nullable=False, default="SOLID_YELLOW"
    )
    lane_boundary_markings: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)

    # --- Road + Lane Representation V1: road-level lane-use fields -------
    # `ParkingLaneOrientation` / `CyclewayType` for the road's left/right
    # edge, from OSM `parking:lane:*` / `cycleway*` -- SOURCE only, never
    # guessed. `UNKNOWN` (not `NONE`) is the default: absence of the tag
    # does not mean absence of parking/a cycle lane in reality.
    parking_left: Mapped[str] = mapped_column(String(20), nullable=False, default="UNKNOWN")
    parking_right: Mapped[str] = mapped_column(String(20), nullable=False, default="UNKNOWN")
    cycleway_left: Mapped[str] = mapped_column(String(20), nullable=False, default="UNKNOWN")
    cycleway_right: Mapped[str] = mapped_column(String(20), nullable=False, default="UNKNOWN")

    city: Mapped["City"] = relationship(back_populates="roads")
    lanes: Mapped[list["Lane"]] = relationship(
        back_populates="road",
        cascade="all, delete-orphan",
        order_by="Lane.index",
    )
