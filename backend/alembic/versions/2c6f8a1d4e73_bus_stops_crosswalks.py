"""Minimal BusStop/Crosswalk entities (renderer-quality pass).

Revision ID: 2c6f8a1d4e73
Revises: 7a1e4c9f0b3d
"""

import sqlalchemy as sa

from alembic import op

revision = "2c6f8a1d4e73"
down_revision = "7a1e4c9f0b3d"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "bus_stops",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("city_id", sa.UUID(), nullable=False),
        sa.Column("road_id", sa.UUID(), nullable=False),
        sa.Column("position_x", sa.Float(), nullable=False),
        sa.Column("position_y", sa.Float(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(["city_id"], ["cities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["road_id"], ["roads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_bus_stops_city_id"), "bus_stops", ["city_id"], unique=False)
    op.create_index(op.f("ix_bus_stops_road_id"), "bus_stops", ["road_id"], unique=False)

    op.create_table(
        "crosswalks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("city_id", sa.UUID(), nullable=False),
        sa.Column("road_id", sa.UUID(), nullable=False),
        sa.Column("position_ratio", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["city_id"], ["cities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["road_id"], ["roads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_crosswalks_city_id"), "crosswalks", ["city_id"], unique=False)
    op.create_index(op.f("ix_crosswalks_road_id"), "crosswalks", ["road_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_crosswalks_road_id"), table_name="crosswalks")
    op.drop_index(op.f("ix_crosswalks_city_id"), table_name="crosswalks")
    op.drop_table("crosswalks")

    op.drop_index(op.f("ix_bus_stops_road_id"), table_name="bus_stops")
    op.drop_index(op.f("ix_bus_stops_city_id"), table_name="bus_stops")
    op.drop_table("bus_stops")
