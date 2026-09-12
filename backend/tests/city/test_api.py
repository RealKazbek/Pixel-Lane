"""API/integration tests for the City endpoints, backed by real PostgreSQL.

Skipped (not silently faked) if PostgreSQL isn't reachable -- see
tests/city/conftest.py.
"""

import copy
import uuid

from sqlalchemy import select

from app.city.examples import load_four_way_intersection
from app.city.models.road import Road
from tests.city.conftest import requires_postgres


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
