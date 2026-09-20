"""API/integration tests for the City endpoints, backed by real PostgreSQL.

Skipped (not silently faked) if PostgreSQL isn't reachable -- see
tests/conftest.py.
"""

import copy
import uuid

from sqlalchemy import select

from app.city.examples import load_four_way_intersection
from app.city.examples.demo_district import DEMO_DISTRICT_CITY_ID
from app.city.models.road import Road
from tests.conftest import requires_postgres


def _payload() -> dict:
    return copy.deepcopy(load_four_way_intersection())


@requires_postgres
def test_validate_endpoint_success(client) -> None:
    response = client.post("/api/v1/cities/validate", json=_payload())
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is True
    assert body["issues"] == []


@requires_postgres
def test_validate_endpoint_failure(client) -> None:
    data = _payload()
    data["roads"][1]["id"] = data["roads"][0]["id"]
    response = client.post("/api/v1/cities/validate", json=data)
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is False
    assert any(issue["code"] == "DUPLICATE_ID" for issue in body["issues"])


@requires_postgres
def test_create_and_retrieve_city(client) -> None:
    data = _payload()
    create_response = client.post("/api/v1/cities", json=data)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["id"] == data["id"]
    assert len(created["roads"]) == 4
    assert sum(len(road["lanes"]) for road in created["roads"]) == 12
    assert len(created["traffic_lights"]) == 1
    assert len(created["traffic_rules"]) == 2

    get_response = client.get(f"/api/v1/cities/{data['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["id"] == data["id"]


@requires_postgres
def test_lane_connections_persist_and_reload(client) -> None:
    data = _payload()
    client.post("/api/v1/cities", json=data)
    intersection = data["intersections"][0]
    from_road = data["roads"][0]
    to_road = data["roads"][1]
    connection = {
        "id": str(uuid.uuid5(uuid.NAMESPACE_URL, "pixel-lane/test-persisted-connection")),
        "intersection_id": intersection["id"],
        "from_road_id": from_road["id"],
        "from_lane_id": from_road["lanes"][0]["id"],
        "to_road_id": to_road["id"],
        "to_lane_id": to_road["lanes"][0]["id"],
        "maneuver": "STRAIGHT",
    }

    response = client.put(
        f"/api/v1/cities/{data['id']}/lane-connections",
        json={"connections": [connection]},
    )
    assert response.status_code == 200
    assert response.json() == [
        {**connection, "city_id": data["id"]},
    ]

    refreshed = client.get(f"/api/v1/cities/{data['id']}")
    assert refreshed.status_code == 200
    assert refreshed.json()["lane_connections"] == [
        {**connection, "city_id": data["id"]},
    ]


@requires_postgres
def test_auto_lane_connections_is_deterministic(client) -> None:
    data = _payload()
    assert client.post("/api/v1/cities", json=data).status_code == 201

    first = client.post(f"/api/v1/cities/{data['id']}/lane-connections/auto")
    second = client.post(f"/api/v1/cities/{data['id']}/lane-connections/auto")

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
    assert set(first.json()) == {"connections", "warnings"}


@requires_postgres
def test_get_unknown_city_returns_404(client) -> None:
    response = client.get(f"/api/v1/cities/{uuid.uuid4()}")
    assert response.status_code == 404


@requires_postgres
def test_list_cities_after_create(client) -> None:
    data = _payload()
    client.post("/api/v1/cities", json=data)
    response = client.get("/api/v1/cities")
    assert response.status_code == 200
    assert any(city["id"] == data["id"] for city in response.json())


@requires_postgres
def test_create_city_rejects_invalid_reference(client) -> None:
    data = _payload()
    data["intersections"][0]["connected_road_ids"][0] = str(uuid.uuid4())
    response = client.post("/api/v1/cities", json=data)
    assert response.status_code == 422
    issues = response.json()["detail"]["issues"]
    assert any(issue["code"] == "UNKNOWN_ROAD_REFERENCE" for issue in issues)


@requires_postgres
def test_create_city_rejects_malformed_payload(client) -> None:
    data = _payload()
    del data["coordinate_system"]
    response = client.post("/api/v1/cities", json=data)
    assert response.status_code == 422


@requires_postgres
def test_transaction_rollback_on_duplicate_city(client, db_session) -> None:
    data = _payload()
    first_response = client.post("/api/v1/cities", json=data)
    assert first_response.status_code == 201

    # Re-submitting the exact same payload passes application-level
    # validation (no in-payload duplicates) but violates the database's
    # primary key constraints -- the whole insert must roll back cleanly.
    second_response = client.post("/api/v1/cities", json=data)
    assert second_response.status_code >= 400

    roads = (
        db_session.execute(select(Road).where(Road.city_id == uuid.UUID(data["id"])))
        .scalars()
        .all()
    )
    assert len(roads) == 4  # unchanged: no duplicate or partial rows left behind


@requires_postgres
def test_update_road_geometry_success(client) -> None:
    data = _payload()
    client.post("/api/v1/cities", json=data)
    road_id = data["roads"][0]["id"]
    new_points = {"points": [{"x": 0.0, "y": 0.0}, {"x": 10.0, "y": 10.0}, {"x": 20.0, "y": 5.0}]}

    response = client.patch(
        f"/api/v1/cities/{data['id']}/roads/{road_id}/geometry",
        json={"geometry": new_points},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == road_id
    assert [(p["x"], p["y"]) for p in body["geometry"]["points"]] == [
        (0.0, 0.0),
        (10.0, 10.0),
        (20.0, 5.0),
    ]

    # persisted, not just echoed back
    get_response = client.get(f"/api/v1/cities/{data['id']}")
    updated_road = next(r for r in get_response.json()["roads"] if r["id"] == road_id)
    assert len(updated_road["geometry"]["points"]) == 3


@requires_postgres
def test_update_road_properties_persists_name_and_width(client) -> None:
    data = _payload()
    client.post("/api/v1/cities", json=data)
    road_id = data["roads"][0]["id"]

    response = client.patch(
        f"/api/v1/cities/{data['id']}/roads/{road_id}/properties",
        json={
            "name": "Updated Avenue",
            "width_m": 14.0,
            "lane_count": 4,
            "lane_width_m": 3.5,
            "lane_directions": ["FORWARD", "FORWARD", "BACKWARD", "BACKWARD"],
        },
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Updated Avenue"
    assert response.json()["width_m"] == 14.0

    refreshed = client.get(f"/api/v1/cities/{data['id']}").json()
    road = next(item for item in refreshed["roads"] if item["id"] == road_id)
    assert road["name"] == "Updated Avenue"
    assert road["width_m"] == 14.0


@requires_postgres
def test_update_road_properties_rejects_invalid_width(client) -> None:
    data = _payload()
    client.post("/api/v1/cities", json=data)
    road_id = data["roads"][0]["id"]

    response = client.patch(
        f"/api/v1/cities/{data['id']}/roads/{road_id}/properties",
        json={
            "name": "Updated Avenue",
            "width_m": 0,
            "lane_count": 4,
            "lane_width_m": 3.5,
            "lane_directions": ["FORWARD", "FORWARD", "BACKWARD", "BACKWARD"],
        },
    )

    assert response.status_code == 422


@requires_postgres
def test_update_road_geometry_unknown_road_returns_404(client) -> None:
    data = _payload()
    client.post("/api/v1/cities", json=data)

    response = client.patch(
        f"/api/v1/cities/{data['id']}/roads/{uuid.uuid4()}/geometry",
        json={"geometry": {"points": [{"x": 0.0, "y": 0.0}, {"x": 1.0, "y": 1.0}]}},
    )

    assert response.status_code == 404


@requires_postgres
def test_update_road_geometry_rejects_too_few_points(client) -> None:
    data = _payload()
    client.post("/api/v1/cities", json=data)
    road_id = data["roads"][0]["id"]

    response = client.patch(
        f"/api/v1/cities/{data['id']}/roads/{road_id}/geometry",
        json={"geometry": {"points": [{"x": 0.0, "y": 0.0}]}},
    )

    assert response.status_code == 422


@requires_postgres
def test_demo_city_is_created_once_and_preserves_road_edits(client) -> None:
    first = client.get("/api/v1/cities/demo")
    assert first.status_code == 200
    initial = first.json()
    assert initial["id"] == str(DEMO_DISTRICT_CITY_ID)
    assert initial["roads"]
    assert initial["intersections"]
    road = initial["roads"][0]
    edited_points = [
        {"x": point["x"] + 123.0, "y": point["y"] + 45.0} for point in road["geometry"]["points"]
    ]

    update = client.patch(
        f"/api/v1/cities/{initial['id']}/roads/{road['id']}/geometry",
        json={"geometry": {"points": edited_points}},
    )
    assert update.status_code == 200

    second = client.get("/api/v1/cities/demo")
    assert second.status_code == 200
    persisted = second.json()
    assert persisted["id"] == initial["id"]
    assert {item["id"] for item in persisted["roads"]} == {item["id"] for item in initial["roads"]}
    persisted_road = next(item for item in persisted["roads"] if item["id"] == road["id"])
    assert persisted_road["geometry"]["points"] == edited_points
