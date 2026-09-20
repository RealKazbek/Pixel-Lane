"""Canonical persisted starter document for the PL-005 editor."""

from uuid import NAMESPACE_DNS, UUID, uuid5

from app.city.domain.enums import CoordinateSystem, LaneDirection, LaneType, RoadType
from app.city.domain.geometry import Point, Polyline
from app.city.schemas.city import CityCreate
from app.city.schemas.lane import LaneCreate
from app.city.schemas.road import RoadCreate

_NAMESPACE = uuid5(NAMESPACE_DNS, "pixel-lane.editor-workspace")
EDITOR_WORKSPACE_CITY_ID = uuid5(_NAMESPACE, "city")


def _id(value: str) -> UUID:
    return uuid5(_NAMESPACE, value)


def _road(key: str, name: str, points: list[tuple[float, float]]) -> RoadCreate:
    road_id = _id(f"road:{key}")
    return RoadCreate(
        id=road_id,
        name=name,
        road_type=RoadType.ARTERIAL,
        geometry=Polyline(points=[Point(x=x, y=y) for x, y in points]),
        width_m=8,
        is_width_estimated=False,
        lanes=[
            LaneCreate(
                id=_id(f"lane:{key}:0"),
                index=0,
                direction=LaneDirection.FORWARD,
                lane_type=LaneType.GENERAL,
            ),
            LaneCreate(
                id=_id(f"lane:{key}:1"),
                index=1,
                direction=LaneDirection.BACKWARD,
                lane_type=LaneType.GENERAL,
            ),
        ],
    )


def build_editor_workspace() -> CityCreate:
    return CityCreate(
        id=EDITOR_WORKSPACE_CITY_ID,
        name="Editor workspace",
        description="The initial Pixel Lane road editor workspace.",
        coordinate_system=CoordinateSystem.LOCAL_CARTESIAN,
        roads=[
            _road("a", "Road A", [(-260, 220), (100, 220)]),
            _road("b", "Road B", [(0, -180), (0, 120)]),
            _road("c", "Road C", [(260, -100), (500, 140)]),
        ],
    )
