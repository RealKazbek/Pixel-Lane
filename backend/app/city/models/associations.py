"""Many-to-many association tables for the City Model schema.

Kept in one small module (not a class each) since these tables carry no
behavior of their own -- they only express relationships that are
genuinely many-to-many and must stay queryable, instead of being collapsed
into an array/JSON column.
"""

from sqlalchemy import Column, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.db.base import Base

intersection_road_link = Table(
    "intersection_road_link",
    Base.metadata,
    Column(
        "intersection_id",
        PGUUID(as_uuid=True),
        ForeignKey("intersections.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "road_id",
        PGUUID(as_uuid=True),
        ForeignKey("roads.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

intersection_lane_link = Table(
    "intersection_lane_link",
    Base.metadata,
    Column(
        "intersection_id",
        PGUUID(as_uuid=True),
        ForeignKey("intersections.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "lane_id",
        PGUUID(as_uuid=True),
        ForeignKey("lanes.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

signal_group_lane_link = Table(
    "signal_group_lane_link",
    Base.metadata,
    Column(
        "signal_group_id",
        PGUUID(as_uuid=True),
        ForeignKey("signal_groups.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "lane_id",
        PGUUID(as_uuid=True),
        ForeignKey("lanes.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

phase_signal_group_link = Table(
    "phase_signal_group_link",
    Base.metadata,
    Column(
        "phase_id",
        PGUUID(as_uuid=True),
        ForeignKey("phases.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "signal_group_id",
        PGUUID(as_uuid=True),
        ForeignKey("signal_groups.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)
