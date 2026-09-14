"""Lane data parsing (City Model Part 2A): directional lane counts, turn lanes, change lanes.

Revision ID: f3b7c1d92a58
Revises: a1c3d9f7e421
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "f3b7c1d92a58"
down_revision = "a1c3d9f7e421"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("roads", sa.Column("forward_lane_count", sa.Integer(), nullable=True))
    op.add_column("roads", sa.Column("backward_lane_count", sa.Integer(), nullable=True))
    op.add_column("roads", sa.Column("both_ways_lane_count", sa.Integer(), nullable=True))
    op.add_column(
        "roads",
        sa.Column(
            "lane_count_quality", sa.String(length=20), nullable=False, server_default="FALLBACK"
        ),
    )
    op.create_check_constraint(
        "ck_roads_forward_lane_count",
        "roads",
        "forward_lane_count IS NULL OR forward_lane_count > 0",
    )
    op.create_check_constraint(
        "ck_roads_backward_lane_count",
        "roads",
        "backward_lane_count IS NULL OR backward_lane_count > 0",
    )
    op.create_check_constraint(
        "ck_roads_both_ways_lane_count",
        "roads",
        "both_ways_lane_count IS NULL OR both_ways_lane_count > 0",
    )
    op.create_check_constraint(
        "ck_roads_lane_count_quality",
        "roads",
        "lane_count_quality IN ('SOURCE', 'INFERRED', 'FALLBACK', 'UNKNOWN')",
    )

    op.add_column(
        "lanes",
        sa.Column("allowed_turns", postgresql.ARRAY(sa.String(length=20)), nullable=True),
    )
    op.add_column("lanes", sa.Column("lane_change", sa.String(length=20), nullable=True))
    op.create_check_constraint(
        "ck_lanes_lane_change",
        "lanes",
        "lane_change IS NULL OR lane_change IN "
        "('YES', 'NO', 'NOT_LEFT', 'NOT_RIGHT', 'ONLY_LEFT', 'ONLY_RIGHT')",
    )


def downgrade():
    op.drop_constraint("ck_lanes_lane_change", "lanes")
    op.drop_column("lanes", "lane_change")
    op.drop_column("lanes", "allowed_turns")

    op.drop_constraint("ck_roads_lane_count_quality", "roads")
    op.drop_constraint("ck_roads_both_ways_lane_count", "roads")
    op.drop_constraint("ck_roads_backward_lane_count", "roads")
    op.drop_constraint("ck_roads_forward_lane_count", "roads")
    op.drop_column("roads", "lane_count_quality")
    op.drop_column("roads", "both_ways_lane_count")
    op.drop_column("roads", "backward_lane_count")
    op.drop_column("roads", "forward_lane_count")
