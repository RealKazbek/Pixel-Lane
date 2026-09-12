"""Minimal reusable geometry primitives for the City Model.

These are plain value objects independent of Next.js, canvas
implementations, SUMO, or any persistence detail. They use Pydantic only
for validation (no FastAPI/SQLAlchemy dependency), so the same types are
reused as-is by the API schemas layer instead of being redefined twice.

Coordinates are unitless (x, y) floats. Their real-world meaning is given
by `City.coordinate_system` (see `app.city.domain.enums.CoordinateSystem`)
-- geometry itself is not bound to pixels, meters, or lat/lon.
"""

from pydantic import BaseModel, ConfigDict, Field

MIN_POLYLINE_POINTS = 2
MAX_POLYLINE_POINTS = 2000

# WGS84 longitude/latitude bounds; irrelevant but harmless for
# LOCAL_CARTESIAN coordinates, which we simply allow a generous range for.
_COORDINATE_BOUND = 1_000_000.0


class Point(BaseModel):
    """A single 2D coordinate."""

    model_config = ConfigDict(frozen=True)

    x: float = Field(ge=-_COORDINATE_BOUND, le=_COORDINATE_BOUND)
    y: float = Field(ge=-_COORDINATE_BOUND, le=_COORDINATE_BOUND)


class Polyline(BaseModel):
    """An ordered sequence of points describing a road's centerline."""

    model_config = ConfigDict(frozen=True)

    points: list[Point] = Field(
        min_length=MIN_POLYLINE_POINTS,
        max_length=MAX_POLYLINE_POINTS,
    )
