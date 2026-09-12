import math

from pixel_lane_simulation.traffic.graph.geometry import euclidean_distance, haversine_distance
from tests.traffic.factories import point


def test_local_cartesian_length_is_euclidean() -> None:
    a = point(0, 0)
    b = point(3, 4)
    assert euclidean_distance(a, b) == 5.0


def test_wgs84_distance_sanity() -> None:
    # Roughly 1 degree of longitude at the equator is about 111.3 km.
    a = point(0.0, 0.0)
    b = point(1.0, 0.0)
    d = haversine_distance(a, b)
    assert math.isclose(d, 111_320, rel_tol=0.01)


def test_wgs84_distance_zero_for_same_point() -> None:
    a = point(37.5, 55.7)
    assert haversine_distance(a, a) == 0.0
