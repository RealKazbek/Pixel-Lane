import pytest
from pydantic import ValidationError

from app.city.schemas.road import RoadPropertiesUpdate


def payload(**overrides):
    value = {
        "name": "Main Street",
        "width_m": 14,
        "lane_count": 4,
        "lane_width_m": 3.5,
        "lane_directions": ["BACKWARD", "BACKWARD", "FORWARD", "FORWARD"],
        "left_edge_marking": "SOLID_YELLOW",
        "right_edge_marking": "SOLID_WHITE",
        "lane_boundary_markings": ["DASHED_WHITE", "DOUBLE_SOLID_WHITE", "NONE"],
    }
    return {**value, **overrides}


def test_valid_marking_configuration_is_typed():
    result = RoadPropertiesUpdate(**payload())
    assert result.lane_boundary_markings[1].value == "DOUBLE_SOLID_WHITE"


@pytest.mark.parametrize(
    "field,value",
    [
        ("left_edge_marking", "DOUBLE_SOLID_WHITE"),
        ("lane_boundary_markings", ["SOLID_YELLOW", "NONE", "NONE"]),
    ],
)
def test_unsupported_marking_combinations_are_rejected(field, value):
    with pytest.raises(ValidationError):
        RoadPropertiesUpdate(**payload(**{field: value}))
