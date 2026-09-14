"""Unit tests for the centralized road-geometry fallback rules
(City Model Part 1) -- see app.city.domain.road_geometry.
"""

from app.city.domain.road_geometry import (
    FALLBACK_WIDTH_BY_CLASS_M,
    ROAD_CLASS_HIERARCHY,
    estimate_width_m,
    resolve_road_class,
)


def test_resolve_road_class_known_highway_tag() -> None:
    assert resolve_road_class("motorway") == "motorway"
    assert resolve_road_class("primary_link") == "primary"
    assert resolve_road_class("living_street") == "residential"


def test_resolve_road_class_unknown_or_missing_falls_back() -> None:
    assert resolve_road_class(None) == "unclassified"
    assert resolve_road_class("nonsense-tag") == "unclassified"


def test_fallback_width_table_matches_documented_hierarchy_order() -> None:
    # Every hierarchy tier must have a fallback entry, and the fallback
    # widths must be non-increasing down the documented hierarchy -- the
    # width table and the hierarchy ordering must never silently drift
    # apart.
    widths = [FALLBACK_WIDTH_BY_CLASS_M[tier] for tier in ROAD_CLASS_HIERARCHY]
    assert widths == sorted(widths, reverse=True)


def test_estimate_width_prefers_explicit_source_width() -> None:
    estimate = estimate_width_m(road_class="residential", lane_count=1, explicit_width_m=7.5)
    assert estimate.width_m == 7.5
    assert estimate.is_estimated is False


def test_estimate_width_uses_lane_count_when_no_explicit_width() -> None:
    estimate = estimate_width_m(road_class="primary", lane_count=3, explicit_width_m=None)
    assert estimate.is_estimated is True
    assert estimate.width_m > 3 * 3.2  # lane width alone, before the class bonus


def test_estimate_width_falls_back_to_flat_class_default() -> None:
    estimate = estimate_width_m(road_class="motorway", lane_count=None, explicit_width_m=None)
    assert estimate.is_estimated is True
    assert estimate.width_m == FALLBACK_WIDTH_BY_CLASS_M["motorway"]


def test_estimate_width_higher_class_wider_than_lower_class_same_lanes() -> None:
    motorway = estimate_width_m(road_class="motorway", lane_count=2, explicit_width_m=None)
    service = estimate_width_m(road_class="service", lane_count=2, explicit_width_m=None)
    assert motorway.width_m > service.width_m


def test_estimate_width_never_below_minimum() -> None:
    estimate = estimate_width_m(road_class="unclassified", lane_count=0, explicit_width_m=None)
    assert estimate.width_m >= 2.5


def test_estimate_width_ignores_non_positive_explicit_width() -> None:
    estimate = estimate_width_m(road_class="residential", lane_count=1, explicit_width_m=0)
    assert estimate.is_estimated is True
