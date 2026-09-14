"""Framework-independent domain enums for the City Model.

These are plain `str` enums so they serialize cleanly through Pydantic and
store as plain strings in PostgreSQL, without depending on Pydantic,
SQLAlchemy, or FastAPI.
"""

from enum import StrEnum


class CoordinateSystem(StrEnum):
    """How (x, y) coordinates on a City should be interpreted."""

    LOCAL_CARTESIAN = "LOCAL_CARTESIAN"
    WGS84 = "WGS84"


class RoadType(StrEnum):
    RESIDENTIAL = "RESIDENTIAL"
    COLLECTOR = "COLLECTOR"
    ARTERIAL = "ARTERIAL"
    HIGHWAY = "HIGHWAY"
    SERVICE = "SERVICE"


class MedianType(StrEnum):
    """Physical/visual divider between opposing traffic flows on a road.

    `NONE` means there genuinely is no divider (traffic flows share the
    surface with no separation); `UNKNOWN` means the source data does not
    say either way -- these are deliberately distinct so "no median" is
    never guessed from missing data (see docs/city-model.md's Part 1
    road-geometry section)."""

    NONE = "NONE"
    PAINTED = "PAINTED"
    PHYSICAL = "PHYSICAL"
    UNKNOWN = "UNKNOWN"


class LaneCountQuality(StrEnum):
    """Confidence of a Road's own per-direction lane count (`len(lanes)`,
    i.e. how many `Lane` rows were generated for it).

    `SOURCE` -- an explicit per-direction OSM tag (`lanes:forward` /
    `lanes:backward`) matched this Road's own direction exactly.
    `INFERRED` -- no per-direction tag, but the way is `oneway=yes` and a
    generic `lanes=*` total exists, which safely describes that single
    direction (see docs/city-model.md Part 2A). `FALLBACK` -- no usable
    source evidence at all (including an ambiguous two-way `lanes=*` total
    with no directional breakdown -- NEVER split evenly, see mapper.py);
    `DEFAULT_LANE_COUNT` was used. `UNKNOWN` -- reserved for
    observation-only import modes that must not synthesize a fallback."""

    SOURCE = "SOURCE"
    INFERRED = "INFERRED"
    FALLBACK = "FALLBACK"
    UNKNOWN = "UNKNOWN"


class TurnLaneType(StrEnum):
    """Normalized OSM `turn:lanes=*` per-lane token vocabulary. `NONE` is
    the explicit OSM token meaning "no turn indicated for this lane" --
    distinct from an empty per-lane group (see normalization.py)."""

    LEFT = "LEFT"
    SLIGHT_LEFT = "SLIGHT_LEFT"
    THROUGH = "THROUGH"
    SLIGHT_RIGHT = "SLIGHT_RIGHT"
    RIGHT = "RIGHT"
    REVERSE = "REVERSE"
    MERGE_TO_LEFT = "MERGE_TO_LEFT"
    MERGE_TO_RIGHT = "MERGE_TO_RIGHT"
    NONE = "NONE"


class LaneChangePermission(StrEnum):
    """Normalized OSM `change:lanes=*` per-lane token vocabulary."""

    YES = "YES"
    NO = "NO"
    NOT_LEFT = "NOT_LEFT"
    NOT_RIGHT = "NOT_RIGHT"
    ONLY_LEFT = "ONLY_LEFT"
    ONLY_RIGHT = "ONLY_RIGHT"


class ParkingLaneOrientation(StrEnum):
    """Normalized OSM `parking:lane:left`/`:right`/`:both` value -- SOURCE
    only, never guessed (see docs/city-model.md's Road+Lane V1 audit).
    `MARKED` covers the plain `parking:lane:*=yes`/`marked` case where OSM
    asserts a parking lane exists but not its orientation."""

    NONE = "NONE"
    PARALLEL = "PARALLEL"
    DIAGONAL = "DIAGONAL"
    PERPENDICULAR = "PERPENDICULAR"
    MARKED = "MARKED"
    UNKNOWN = "UNKNOWN"


class CyclewayType(StrEnum):
    """Normalized OSM `cycleway=*`/`cycleway:left`/`:right` value."""

    NONE = "NONE"
    LANE = "LANE"
    TRACK = "TRACK"
    SHARED_LANE = "SHARED_LANE"
    UNKNOWN = "UNKNOWN"


class LaneDirection(StrEnum):
    """Travel direction relative to the road's polyline point order."""

    FORWARD = "FORWARD"
    BACKWARD = "BACKWARD"


class LaneType(StrEnum):
    GENERAL = "GENERAL"
    BUS = "BUS"
    BICYCLE = "BICYCLE"
    EMERGENCY = "EMERGENCY"
    PARKING = "PARKING"
    TURN_ONLY = "TURN_ONLY"


class MovementType(StrEnum):
    LEFT = "LEFT"
    STRAIGHT = "STRAIGHT"
    RIGHT = "RIGHT"
    U_TURN = "U_TURN"


class IntersectionControlType(StrEnum):
    UNCONTROLLED = "UNCONTROLLED"
    STOP_SIGN = "STOP_SIGN"
    YIELD_SIGN = "YIELD_SIGN"
    ALL_WAY_STOP = "ALL_WAY_STOP"
    TRAFFIC_LIGHT = "TRAFFIC_LIGHT"


class TrafficRuleType(StrEnum):
    YIELD = "YIELD"
    STOP = "STOP"
    PRIORITY_ROAD = "PRIORITY_ROAD"
    NO_ENTRY = "NO_ENTRY"
    TURN_RESTRICTION = "TURN_RESTRICTION"
    SPEED_LIMIT = "SPEED_LIMIT"


class TrafficRuleTargetType(StrEnum):
    ROAD = "ROAD"
    LANE = "LANE"
    INTERSECTION = "INTERSECTION"
    MOVEMENT = "MOVEMENT"


class ParkingSide(StrEnum):
    LEFT = "LEFT"
    RIGHT = "RIGHT"
    BOTH = "BOTH"


class VehicleCategory(StrEnum):
    CAR = "CAR"
    BUS = "BUS"
    TRUCK = "TRUCK"
    MOTORCYCLE = "MOTORCYCLE"
    BICYCLE = "BICYCLE"
