"""Bbox-scoped spatial query API tests, backed by real PostgreSQL/PostGIS.

Exercises the real `ST_Intersects`/`ST_MakeEnvelope` predicates end to end
(create a WGS84 city -> GET .../roads?bbox=... / .../intersections?bbox=...)
-- never mocked/faked in Python, per AGENTS.md's testing rules. Skipped if
PostgreSQL isn't reachable (see tests/conftest.py); further skipped if
PostGIS specifically isn't installed against whatever database is
reachable, so these tests don't fail with a confusing error against an
older non-PostGIS Postgres.
"""

import uuid

import pytest
from sqlalchemy import text

from tests.conftest import requires_postgres

# A small, easy-to-reason-about WGS84 layout:
#   - "inside" road: fully within the test bbox (lon 10-11, lat 10-11).
#   - "outside" road: fully outside it, far away.
#   - "crossing" road: straddles the bbox's east edge (lon 11).
#   - "inside" intersection: within the bbox.
#   - "outside" intersection: outside it.
_BBOX = "10,10,11,11"


def _lane(lane_id: str) -> dict:
    return {
        "id": lane_id,
        "index": 0,
        "direction": "FORWARD",
        "allowed_movements": ["STRAIGHT"],
        "lane_type": "GENERAL",
        "speed_limit_kmh": None,
    }


def _road(road_id: str, lane_id: str, points: list[tuple[float, float]]) -> dict:
    return {
        "id": road_id,
        "name": f"Road {road_id[:8]}",
        "road_type": "RESIDENTIAL",
        "geometry": {"points": [{"x": x, "y": y} for x, y in points]},
        "default_speed_limit_kmh": 50.0,
        "lanes": [_lane(lane_id)],
    }


def _intersection(intersection_id: str, road_id: str, lane_id: str, x: float, y: float) -> dict:
    return {
        "id": intersection_id,
        "position": {"x": x, "y": y},
        "connected_road_ids": [road_id],
        "connected_lane_ids": [lane_id],
        "control_type": "UNCONTROLLED",
        "traffic_light_id": None,
    }


def _wgs84_city_payload() -> dict:
    inside_road_id = str(uuid.uuid4())
    inside_lane_id = str(uuid.uuid4())
    outside_road_id = str(uuid.uuid4())
    outside_lane_id = str(uuid.uuid4())
    crossing_road_id = str(uuid.uuid4())
    crossing_lane_id = str(uuid.uuid4())
    inside_intersection_id = str(uuid.uuid4())
    outside_intersection_id = str(uuid.uuid4())

    return {
        "id": str(uuid.uuid4()),
        "name": "Spatial bbox test city",
        "description": "WGS84 fixture for bbox query tests -- not a real place.",
        "coordinate_system": "WGS84",
        "roads": [
            _road(inside_road_id, inside_lane_id, [(10.2, 10.2), (10.8, 10.8)]),
            _road(outside_road_id, outside_lane_id, [(50.0, 50.0), (50.1, 50.1)]),
            _road(crossing_road_id, crossing_lane_id, [(10.5, 10.5), (12.0, 10.5)]),
        ],
        "intersections": [
            _intersection(inside_intersection_id, inside_road_id, inside_lane_id, 10.2, 10.2),
            _intersection(outside_intersection_id, outside_road_id, outside_lane_id, 50.0, 50.0),
        ],
        "traffic_lights": [],
        "traffic_rules": [],
        "parking_zones": [],
        "traffic_demands": [],
    }, {
        "inside_road_id": inside_road_id,
        "outside_road_id": outside_road_id,
        "crossing_road_id": crossing_road_id,
        "inside_intersection_id": inside_intersection_id,
        "outside_intersection_id": outside_intersection_id,
    }


def _postgis_available(db_session) -> bool:
    row = db_session.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'postgis'")).first()
    return row is not None


@requires_postgres
def test_roads_bbox_returns_inside_and_crossing_not_outside(client, db_session) -> None:
    if not _postgis_available(db_session):
        pytest.skip("PostGIS not installed on the reachable database")
    payload, ids = _wgs84_city_payload()
    create_response = client.post("/api/v1/cities", json=payload)
    assert create_response.status_code == 201

    response = client.get(f"/api/v1/cities/{payload['id']}/roads?bbox={_BBOX}")
    assert response.status_code == 200
    returned_ids = {road["id"] for road in response.json()}

    assert ids["inside_road_id"] in returned_ids
    assert ids["crossing_road_id"] in returned_ids  # ST_Intersects, not ST_Within
    assert ids["outside_road_id"] not in returned_ids


@requires_postgres
def test_intersections_bbox_returns_only_inside(client, db_session) -> None:
    if not _postgis_available(db_session):
        pytest.skip("PostGIS not installed on the reachable database")
    payload, ids = _wgs84_city_payload()
    create_response = client.post("/api/v1/cities", json=payload)
    assert create_response.status_code == 201

    response = client.get(f"/api/v1/cities/{payload['id']}/intersections?bbox={_BBOX}")
    assert response.status_code == 200
    returned_ids = {i["id"] for i in response.json()}

    assert ids["inside_intersection_id"] in returned_ids
    assert ids["outside_intersection_id"] not in returned_ids


@requires_postgres
def test_bbox_far_from_any_geometry_returns_empty_list(client, db_session) -> None:
    if not _postgis_available(db_session):
        pytest.skip("PostGIS not installed on the reachable database")
    payload, _ids = _wgs84_city_payload()
    client.post("/api/v1/cities", json=payload)

    response = client.get(f"/api/v1/cities/{payload['id']}/roads?bbox=-20,-20,-19,-19")
    assert response.status_code == 200
    assert response.json() == []


@requires_postgres
def test_bbox_unknown_city_returns_404(client) -> None:
    response = client.get(f"/api/v1/cities/{uuid.uuid4()}/roads?bbox={_BBOX}")
    assert response.status_code == 404


@requires_postgres
@pytest.mark.parametrize(
    "bbox",
    [
        "not,a,valid,bbox",
        "10,10,11",  # wrong item count
        "200,10,201,11",  # longitude out of range
        "10,10,9,11",  # inverted min/max longitude
        "10,10,11,9",  # inverted min/max latitude
        "nan,10,11,11",
    ],
)
def test_malformed_bbox_returns_422(client, bbox: str) -> None:
    response = client.get(f"/api/v1/cities/{uuid.uuid4()}/roads?bbox={bbox}")
    assert response.status_code == 422


@requires_postgres
def test_missing_bbox_param_returns_422(client) -> None:
    response = client.get(f"/api/v1/cities/{uuid.uuid4()}/roads")
    assert response.status_code == 422
