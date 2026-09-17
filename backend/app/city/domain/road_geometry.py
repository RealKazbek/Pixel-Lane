"""Centralized road-geometry fallback rules (City Model Part 1).

This is the single domain-layer source of truth for "how wide is a road
when the source data doesn't say" -- used by the OSM importer (to fill in
`Road.width_m` when OSM has no `width` tag) and reusable by anything else
that needs a road's physical footprint (editor, Traffic Engine,
simulation, analysis) without depending on rendering code.

The frontend's `roadStyle.ts` keeps its own presentation-only pixel-floor
logic (minimum on-screen width per zoom), but for real-world meters it
prefers `Road.width_m` from the backend over guessing -- see that file's
`roadWidthMeters`. Nothing here is a measured fact about any real city;
these are documented engineering defaults only, and callers that use the
fallback path get `is_estimated=True` so the distinction is never lost.
"""

from dataclasses import dataclass

# OSM `highway=*` value -> road classification tier, coarsened to the
# standard functional-classification ladder used for width fallback.
# Unknown/missing highway tags fall back to "unclassified".
HIGHWAY_TO_ROAD_CLASS: dict[str, str] = {
    "motorway": "motorway",
    "motorway_link": "motorway",
    "trunk": "trunk",
    "trunk_link": "trunk",
    "primary": "primary",
    "primary_link": "primary",
    "secondary": "secondary",
    "secondary_link": "secondary",
    "tertiary": "tertiary",
    "tertiary_link": "tertiary",
    "residential": "residential",
    "living_street": "residential",
    "service": "service",
    "unclassified": "unclassified",
}
FALLBACK_ROAD_CLASS = "unclassified"

#: Ordered fallback hierarchy, most to least important -- documents the
#: precedence the width table below encodes, and is asserted against in
#: tests so the two can never silently drift apart.
ROAD_CLASS_HIERARCHY: tuple[str, ...] = (
    "motorway",
    "trunk",
    "primary",
    "secondary",
    "tertiary",
    "residential",
    "service",
    "unclassified",
)

#: Typical per-lane-equivalent carriageway width (meters) used only when a
#: road has no explicit width and no usable lane count -- i.e. the last
#: resort in `estimate_width_m`'s preference order. Wider for
#: higher-class roads (wider lanes, shoulders, medians typical of that
#: class) even at the same nominal lane count.
FALLBACK_WIDTH_BY_CLASS_M: dict[str, float] = {
    "motorway": 15.0,
    "trunk": 12.0,
    "primary": 10.0,
    "secondary": 9.0,
    "tertiary": 8.0,
    "residential": 6.0,
    "service": 4.0,
    "unclassified": 3.5,
}

#: Per-lane width (meters) added for each lane beyond the first when a
#: lane count is known -- see `estimate_width_m`.
LANE_WIDTH_M = 3.2

#: Extra width (meters) added on top of the lane-count-derived figure,
#: representing shoulders/medians typical of that class. Mirrors (in
#: spirit, not in exact numbers) `HIERARCHY_WIDTH_BONUS_M` in the
#: frontend's roadStyle.ts, which layers its own presentation-only pixel
#: floor on top.
CLASS_WIDTH_BONUS_M: dict[str, float] = {
    "motorway": 4.0,
    "trunk": 3.5,
    "primary": 2.5,
    "secondary": 2.0,
    "tertiary": 1.5,
    "residential": 0.8,
    "service": 0.3,
    "unclassified": 1.0,
}

MIN_ROAD_WIDTH_M = 2.5
MAX_ROAD_WIDTH_M = 60.0


def resolve_road_class(source_road_type: str | None) -> str:
    """Normalizes a raw OSM `highway=*` value into the width-fallback
    classification tier. Anything unrecognized (including `None`) is
    `"unclassified"`, never guessed to be something more specific."""
    return HIGHWAY_TO_ROAD_CLASS.get(source_road_type or "", FALLBACK_ROAD_CLASS)


@dataclass(frozen=True)
class RoadWidthEstimate:
    width_m: float
    is_estimated: bool


def estimate_width_m(
    *,
    road_class: str,
    lane_count: int | None,
    explicit_width_m: float | None,
) -> RoadWidthEstimate:
    """Resolves a road's physical width in meters.

    Preference order:
    1. An explicit, source-provided width (e.g. OSM `width=*`) -- exact,
       never marked as estimated.
    2. Lane count (if known) * per-lane width + a class-appropriate bonus
       for shoulders/medians.
    3. A flat per-class fallback width, for roads with neither an
       explicit width nor a usable lane count.

    Cases 2 and 3 are marked `is_estimated=True` so callers never
    present a guess as measured fact.
    """
    if explicit_width_m is not None and explicit_width_m > 0:
        return RoadWidthEstimate(width_m=explicit_width_m, is_estimated=False)

    bonus = CLASS_WIDTH_BONUS_M.get(road_class, CLASS_WIDTH_BONUS_M[FALLBACK_ROAD_CLASS])
    if lane_count is not None and lane_count > 0:
        width = lane_count * LANE_WIDTH_M + bonus
        return RoadWidthEstimate(width_m=max(width, MIN_ROAD_WIDTH_M), is_estimated=True)

    flat = FALLBACK_WIDTH_BY_CLASS_M.get(road_class, FALLBACK_WIDTH_BY_CLASS_M[FALLBACK_ROAD_CLASS])
    return RoadWidthEstimate(width_m=max(flat, MIN_ROAD_WIDTH_M), is_estimated=True)
