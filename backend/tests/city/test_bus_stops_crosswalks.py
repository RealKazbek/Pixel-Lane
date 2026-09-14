"""API/integration tests for the minimal BusStop/Crosswalk entities.

Skipped (not silently faked) if PostgreSQL isn't reachable -- see
tests/conftest.py.
"""

import copy
import uuid

from app.city.examples import load_four_way_intersection
from tests.conftest import requires_postgres


def _payload() -> dict:
    data = copy.deepcopy(load_four_way_intersection())
    road_id = data["roads"][0]["id"]
    data["bus_stops"] = [
        {
            "id": str(uuid.uuid4()),
            "road_id": road_id,
            "position_x": 10.0,
            "position_y": 5.0,
            "name": "Test Stop",
        }
    ]
    data["crosswalks"] = [
        {
            "id": str(uuid.uuid4()),
            "road_id": road_id,
            "position_ratio": 0.5,
        }
    ]
    return data


@requires_postgres
def test_create_and_retrieve_city_with_bus_stop_and_crosswalk(client) -> None:
    data = _payload()
    create_response = client.post("/api/v1/cities", json=data)
    assert create_response.status_code == 201
    created = create_response.json()
    assert len(created["bus_stops"]) == 1
    assert created["bus_stops"][0]["name"] == "Test Stop"
    assert created["bus_stops"][0]["road_id"] == data["roads"][0]["id"]
    assert len(created["crosswalks"]) == 1
    assert created["crosswalks"][0]["position_ratio"] == 0.5

    get_response = client.get(f"/api/v1/cities/{data['id']}")
    assert get_response.status_code == 200
    body = get_response.json()
    assert len(body["bus_stops"]) == 1
    assert len(body["crosswalks"]) == 1


@requires_postgres
def test_bus_stop_referencing_unknown_road_fails_validation(client) -> None:
    data = _payload()
    data["bus_stops"][0]["road_id"] = str(uuid.uuid4())
    response = client.post("/api/v1/cities/validate", json=data)
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is False
    assert any(
        issue["code"] == "UNKNOWN_ROAD_REFERENCE" and "bus_stops" in issue["path"]
        for issue in body["issues"]
    )


@requires_postgres
def test_crosswalk_referencing_unknown_road_fails_validation(client) -> None:
    data = _payload()
    data["crosswalks"][0]["road_id"] = str(uuid.uuid4())
    response = client.post("/api/v1/cities/validate", json=data)
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is False
    assert any(
        issue["code"] == "UNKNOWN_ROAD_REFERENCE" and "crosswalks" in issue["path"]
        for issue in body["issues"]
    )


@requires_postgres
def test_crosswalk_position_ratio_out_of_range_rejected(client) -> None:
    data = _payload()
    data["crosswalks"][0]["position_ratio"] = 1.5
    response = client.post("/api/v1/cities", json=data)
    assert response.status_code == 422
