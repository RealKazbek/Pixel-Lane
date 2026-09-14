"""Preserve tagged total lane counts without guessing directional allocation.

Revision ID: 7d014a16239c
Revises: 6b14f092a731
"""

import sqlalchemy as sa

from alembic import op

revision = "7d014a16239c"
down_revision = "6b14f092a731"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("roads", sa.Column("source_lane_count", sa.Integer()))
    op.create_check_constraint("ck_roads_source_lane_count", "roads", "source_lane_count > 0")


def downgrade():
    op.drop_constraint("ck_roads_source_lane_count", "roads")
    op.drop_column("roads", "source_lane_count")
