"""Persist explicit lane-to-lane movements through intersections."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "e5d4c2b7a901"
down_revision = "c4d8e2a1f907"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lane_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("city_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intersection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_road_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_lane_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("to_road_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("to_lane_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("maneuver", sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(["city_id"], ["cities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["intersection_id"], ["intersections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["from_road_id"], ["roads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["from_lane_id"], ["lanes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["to_road_id"], ["roads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["to_lane_id"], ["lanes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "intersection_id",
            "from_lane_id",
            "to_lane_id",
            "maneuver",
            name="uq_lane_connection_movement",
        ),
        sa.CheckConstraint(
            "maneuver IN ('LEFT', 'STRAIGHT', 'RIGHT', 'U_TURN')",
            name="ck_lane_connections_maneuver",
        ),
    )
    op.create_index("ix_lane_connections_city_id", "lane_connections", ["city_id"])
    op.create_index("ix_lane_connections_intersection_id", "lane_connections", ["intersection_id"])
    op.create_index("ix_lane_connections_from_road_id", "lane_connections", ["from_road_id"])
    op.create_index("ix_lane_connections_from_lane_id", "lane_connections", ["from_lane_id"])
    op.create_index("ix_lane_connections_to_road_id", "lane_connections", ["to_road_id"])
    op.create_index("ix_lane_connections_to_lane_id", "lane_connections", ["to_lane_id"])


def downgrade() -> None:
    op.drop_index("ix_lane_connections_to_lane_id", table_name="lane_connections")
    op.drop_index("ix_lane_connections_to_road_id", table_name="lane_connections")
    op.drop_index("ix_lane_connections_from_lane_id", table_name="lane_connections")
    op.drop_index("ix_lane_connections_from_road_id", table_name="lane_connections")
    op.drop_index("ix_lane_connections_intersection_id", table_name="lane_connections")
    op.drop_index("ix_lane_connections_city_id", table_name="lane_connections")
    op.drop_table("lane_connections")
