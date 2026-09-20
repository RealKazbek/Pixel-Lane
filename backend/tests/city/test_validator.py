"""Unit tests for City domain/schema validation.

Pure Python -- no database, no FastAPI -- exercising
`app.city.validators.city_validator.validate_city` and the structural
(Pydantic) validation on the schemas directly.
"""

import copy
import uuid

import pytest
from pydantic import ValidationError

from app.city.domain.geometry import Point, Polyline
from app.city.examples import load_four_way_intersection
from app.city.schemas.city import CityCreate
from app.city.validators.city_validator import validate_city


def _payload() -> dict:
    return copy.deepcopy(load_four_way_intersection())


def test_valid_city_has_no_issues() -> None:
    city = CityCreate.model_validate(_payload())
    assert validate_city(city) == []


def test_duplicate_ids_detected() -> None:
    data = _payload()
    data["roads"][1]["id"] = data["roads"][0]["id"]
    city = CityCreate.model_validate(data)
    issues = validate_city(city)
    assert any(issue.code == "DUPLICATE_ID" for issue in issues)


def test_unknown_road_reference_on_intersection() -> None:
    data = _payload()
    data["intersections"][0]["connected_road_ids"][0] = str(uuid.uuid4())
    city = CityCreate.model_validate(data)
    issues = validate_city(city)
    assert any(issue.code == "UNKNOWN_ROAD_REFERENCE" for issue in issues)


def test_unknown_lane_reference_on_intersection() -> None:
    data = _payload()
    data["intersections"][0]["connected_lane_ids"][0] = str(uuid.uuid4())
    city = CityCreate.model_validate(data)
    issues = validate_city(city)
    assert any(issue.code == "UNKNOWN_LANE_REFERENCE" for issue in issues)


def test_unknown_intersection_reference_on_traffic_light() -> None:
    data = _payload()
    data["traffic_lights"][0]["intersection_id"] = str(uuid.uuid4())
    city = CityCreate.model_validate(data)
    issues = validate_city(city)
    assert any(issue.code == "UNKNOWN_INTERSECTION_REFERENCE" for issue in issues)


def test_unknown_signal_group_reference_on_phase() -> None:
    data = _payload()
    data["traffic_lights"][0]["phases"][0]["green_signal_group_ids"] = [str(uuid.uuid4())]
    city = CityCreate.model_validate(data)
    issues = validate_city(city)
    assert any(issue.code == "UNKNOWN_SIGNAL_GROUP_REFERENCE" for issue in issues)


def test_invalid_rule_target_detected() -> None:
    data = _payload()
    data["traffic_rules"][0]["target_id"] = str(uuid.uuid4())
    city = CityCreate.model_validate(data)
    issues = validate_city(city)
    assert any(issue.code == "INVALID_RULE_TARGET" for issue in issues)


def test_duplicate_lane_index_detected() -> None:
    data = _payload()
    data["roads"][0]["lanes"][1]["index"] = data["roads"][0]["lanes"][0]["index"]
    city = CityCreate.model_validate(data)
    issues = validate_city(city)
    assert any(issue.code == "DUPLICATE_LANE_INDEX" for issue in issues)


def test_invalid_demand_endpoints_detected() -> None:
    data = _payload()
    data["traffic_demands"][0]["destination_intersection_id"] = data["intersections"][0]["id"]
    data["traffic_demands"][0]["movement"] = None
    city = CityCreate.model_validate(data)
    issues = validate_city(city)
    assert any(issue.code == "INVALID_DEMAND_ENDPOINTS" for issue in issues)


def test_invalid_speed_limit_rejected_structurally() -> None:
    data = _payload()
    data["roads"][0]["default_speed_limit_kmh"] = -10
    with pytest.raises(ValidationError):
        CityCreate.model_validate(data)


def test_invalid_geometry_rejected_structurally() -> None:
    with pytest.raises(ValidationError):
        Polyline(points=[Point(x=0, y=0)])


def test_invalid_phase_duration_rejected_structurally() -> None:
    data = _payload()
    data["traffic_lights"][0]["phases"][0]["duration_seconds"] = 0
    with pytest.raises(ValidationError):
        CityCreate.model_validate(data)


def test_invalid_traffic_demand_rejected_structurally() -> None:
    data = _payload()
    data["traffic_demands"][0].pop("movement")
    data["traffic_demands"][0]["destination_intersection_id"] = None
    with pytest.raises(ValidationError):
        CityCreate.model_validate(data)


def test_malformed_nested_payload_rejected() -> None:
    data = _payload()
    data["roads"][0]["lanes"] = "not-a-list"
    with pytest.raises(ValidationError):
        CityCreate.model_validate(data)


def test_valid_lane_connection_has_no_issues() -> None:
    data = _payload()
    intersection = data["intersections"][0]
    from_road = data["roads"][0]
    to_road = data["roads"][1]
    data["lane_connections"] = [
        {
            "id": str(uuid.uuid5(uuid.NAMESPACE_URL, "pixel-lane/test-connection")),
            "intersection_id": intersection["id"],
            "from_road_id": from_road["id"],
            "from_lane_id": from_road["lanes"][0]["id"],
            "to_road_id": to_road["id"],
            "to_lane_id": to_road["lanes"][0]["id"],
            "maneuver": "STRAIGHT",
        }
    ]
    city = CityCreate.model_validate(data)
    assert validate_city(city) == []


@pytest.mark.parametrize(
    ("field", "code"),
    [
        ("intersection_id", "UNKNOWN_INTERSECTION_REFERENCE"),
        ("from_road_id", "UNKNOWN_ROAD_REFERENCE"),
        ("from_lane_id", "UNKNOWN_LANE_REFERENCE"),
    ],
)
def test_invalid_lane_connection_reference_is_rejected(field: str, code: str) -> None:
    data = _payload()
    intersection = data["intersections"][0]
    from_road = data["roads"][0]
    to_road = data["roads"][1]
    connection = {
        "id": str(uuid.uuid4()),
        "intersection_id": intersection["id"],
        "from_road_id": from_road["id"],
        "from_lane_id": from_road["lanes"][0]["id"],
        "to_road_id": to_road["id"],
        "to_lane_id": to_road["lanes"][0]["id"],
        "maneuver": "STRAIGHT",
    }
    connection[field] = str(uuid.uuid4())
    data["lane_connections"] = [connection]
    city = CityCreate.model_validate(data)
    assert any(issue.code == code for issue in validate_city(city))
