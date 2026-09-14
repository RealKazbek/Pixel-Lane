"""Preserve source attributes and allow genuinely unknown road speeds.

Revision ID: 6b14f092a731
Revises: 9c1a2f7e5b3d
"""

import sqlalchemy as sa

from alembic import op

revision = "6b14f092a731"
down_revision = "9c1a2f7e5b3d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("roads", "default_speed_limit_kmh", nullable=True)
    op.add_column("roads", sa.Column("source_id", sa.String(2000)))
    op.add_column("roads", sa.Column("source_road_type", sa.String(200)))
    op.add_column("roads", sa.Column("one_way", sa.Boolean()))


def downgrade() -> None:
    # Intentionally fails if unknown speeds exist: inventing speed data to
    # satisfy the old NOT NULL contract would be an unsafe downgrade.
    op.alter_column("roads", "default_speed_limit_kmh", nullable=False)
    op.drop_column("roads", "one_way")
    op.drop_column("roads", "source_road_type")
    op.drop_column("roads", "source_id")
