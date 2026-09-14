"""Road + Lane Representation V1: parking/cycleway lane-use fields, city import provenance.

Revision ID: 7a1e4c9f0b3d
Revises: f3b7c1d92a58
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "7a1e4c9f0b3d"
down_revision = "f3b7c1d92a58"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "roads",
        sa.Column("parking_left", sa.String(length=20), nullable=False, server_default="UNKNOWN"),
    )
    op.add_column(
        "roads",
        sa.Column("parking_right", sa.String(length=20), nullable=False, server_default="UNKNOWN"),
    )
    op.add_column(
        "roads",
        sa.Column("cycleway_left", sa.String(length=20), nullable=False, server_default="UNKNOWN"),
    )
    op.add_column(
        "roads",
        sa.Column("cycleway_right", sa.String(length=20), nullable=False, server_default="UNKNOWN"),
    )
    op.create_check_constraint(
        "ck_roads_parking_left",
        "roads",
        "parking_left IN ('NONE', 'PARALLEL', 'DIAGONAL', 'PERPENDICULAR', 'MARKED', 'UNKNOWN')",
    )
    op.create_check_constraint(
        "ck_roads_parking_right",
        "roads",
        "parking_right IN ('NONE', 'PARALLEL', 'DIAGONAL', 'PERPENDICULAR', 'MARKED', 'UNKNOWN')",
    )
    op.create_check_constraint(
        "ck_roads_cycleway_left",
        "roads",
        "cycleway_left IN ('NONE', 'LANE', 'TRACK', 'SHARED_LANE', 'UNKNOWN')",
    )
    op.create_check_constraint(
        "ck_roads_cycleway_right",
        "roads",
        "cycleway_right IN ('NONE', 'LANE', 'TRACK', 'SHARED_LANE', 'UNKNOWN')",
    )

    op.add_column("cities", sa.Column("import_source", sa.String(length=200), nullable=True))
    op.add_column("cities", sa.Column("imported_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("cities", sa.Column("import_query", postgresql.JSONB(), nullable=True))


def downgrade():
    op.drop_column("cities", "import_query")
    op.drop_column("cities", "imported_at")
    op.drop_column("cities", "import_source")

    op.drop_constraint("ck_roads_cycleway_right", "roads")
    op.drop_constraint("ck_roads_cycleway_left", "roads")
    op.drop_constraint("ck_roads_parking_right", "roads")
    op.drop_constraint("ck_roads_parking_left", "roads")
    op.drop_column("roads", "cycleway_right")
    op.drop_column("roads", "cycleway_left")
    op.drop_column("roads", "parking_right")
    op.drop_column("roads", "parking_left")
