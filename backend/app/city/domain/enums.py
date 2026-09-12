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
