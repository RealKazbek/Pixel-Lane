"""Detailed road geometry (City Model Part 1): width, carriageway, median, level, bridge/tunnel.

Revision ID: a1c3d9f7e421
Revises: 7d014a16239c
"""

import sqlalchemy as sa

from alembic import op

revision = "a1c3d9f7e421"
down_revision = "7d014a16239c"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("roads", sa.Column("width_m", sa.Float(), nullable=True))
    op.add_column(
        "roads",
        sa.Column("is_width_estimated", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "roads",
        sa.Column("carriageway_count", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "roads",
        sa.Column("median", sa.String(length=20), nullable=False, server_default="NONE"),
    )
    op.add_column("roads", sa.Column("level", sa.Integer(), nullable=False, server_default="0"))
    op.add_column(
        "roads",
        sa.Column("is_bridge", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "roads",
        sa.Column("is_tunnel", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_check_constraint("ck_roads_width_m", "roads", "width_m IS NULL OR width_m > 0")
    op.create_check_constraint("ck_roads_carriageway_count", "roads", "carriageway_count IN (1, 2)")
    op.create_check_constraint(
        "ck_roads_median", "roads", "median IN ('NONE', 'PAINTED', 'PHYSICAL', 'UNKNOWN')"
    )


def downgrade():
    op.drop_constraint("ck_roads_median", "roads")
    op.drop_constraint("ck_roads_carriageway_count", "roads")
    op.drop_constraint("ck_roads_width_m", "roads")
    op.drop_column("roads", "is_tunnel")
    op.drop_column("roads", "is_bridge")
    op.drop_column("roads", "level")
    op.drop_column("roads", "median")
    op.drop_column("roads", "carriageway_count")
    op.drop_column("roads", "is_width_estimated")
    op.drop_column("roads", "width_m")
