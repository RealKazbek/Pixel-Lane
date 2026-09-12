"""Distance calculations for the two supported coordinate systems.

No PostGIS, no geodesy libraries -- just enough to get a reasonable road
length and node-matching distance for v1.
"""

import math

from pixel_lane_simulation.traffic.models.inputs import CoordinateSystem, PointInput

_EARTH_RADIUS_M = 6_371_000.0


def euclidean_distance(a: PointInput, b: PointInput) -> float:
    """Plain 2D distance, for LOCAL_CARTESIAN coordinates."""
    return math.hypot(b.x - a.x, b.y - a.y)


def haversine_distance(a: PointInput, b: PointInput) -> float:
    """Approximate geodesic distance in meters, for WGS84 coordinates.

    Convention: `PointInput.x` is longitude, `PointInput.y` is latitude, in
    degrees (the standard GIS x=lon/y=lat convention).
    """
    lon1, lat1, lon2, lat2 = map(math.radians, (a.x, a.y, b.x, b.y))
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * _EARTH_RADIUS_M * math.asin(math.sqrt(h))


def distance(a: PointInput, b: PointInput, coordinate_system: CoordinateSystem) -> float:
    if coordinate_system == "WGS84":
        return haversine_distance(a, b)
    return euclidean_distance(a, b)


def polyline_length(points: tuple[PointInput, ...], coordinate_system: CoordinateSystem) -> float:
    return sum(
        distance(points[i], points[i + 1], coordinate_system) for i in range(len(points) - 1)
    )
