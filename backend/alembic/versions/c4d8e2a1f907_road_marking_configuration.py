"""Persist road edge and internal lane-boundary marking choices."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "c4d8e2a1f907"
down_revision = "2c6f8a1d4e73"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "roads",
        sa.Column(
            "left_edge_marking",
            sa.String(30),
            nullable=False,
            server_default="SOLID_YELLOW",
        ),
    )
    op.add_column(
        "roads",
        sa.Column(
            "right_edge_marking",
            sa.String(30),
            nullable=False,
            server_default="SOLID_YELLOW",
        ),
    )
    op.add_column("roads", sa.Column("lane_boundary_markings", postgresql.JSONB(), nullable=True))


def downgrade():
    op.drop_column("roads", "lane_boundary_markings")
    op.drop_column("roads", "right_edge_marking")
    op.drop_column("roads", "left_edge_marking")
