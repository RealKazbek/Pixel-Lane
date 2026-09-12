"""API/integration tests for POST /api/v1/cities/{id}/traffic-analysis.

Backed by real PostgreSQL (see tests/conftest.py) -- skipped with a clear
reason if it isn't reachable, never silently substituted with SQLite.
"""

import uuid

from tests.conftest import requires_postgres


def _two_intersection_payload() -> dict:
    """A minimal, routable city: two intersections joined by one
    bidirectional road, with demand flowing between them.

    The main four-way-intersection example fixture has only one
    intersection (its demand is movement-only, see its docstring), so it
    can't exercise routing -- this payload is a separate, purpose-built
    minimal case, as the task allows.
    """
    city_id = str(uuid.uuid4())
    road_id = str(uuid.uuid4())
    lane_fwd_id = str(uuid.uuid4())
    lane_bwd_id = str(uuid.uuid4())
    node_a_id = str(uuid.uuid4())
    node_b_id = str(uuid.uuid4())

    return {
        "id": city_id,
        "name": "Two Intersection Corridor",
        "coordinate_system": "LOCAL_CARTESIAN",
        "roads": [
            {
                "id": road_id,
                "name": "Main Street",
                "road_type": "ARTERIAL",
                "geometry": {"points": [{"x": 0.0, "y": 0.0}, {"x": 1000.0, "y": 0.0}]},
                "default_speed_limit_kmh": 50.0,
                "lanes": [
                    {
                        "id": lane_fwd_id,
                        "index": 0,
                        "direction": "FORWARD",
                        "allowed_movements": ["STRAIGHT"],
                        "lane_type": "GENERAL",
                    },
                    {
                        "id": lane_bwd_id,
                        "index": 1,
                        "direction": "BACKWARD",
                        "allowed_movements": ["STRAIGHT"],
                        "lane_type": "GENERAL",
                    },
                ],
            }
        ],
        "intersections": [
            {
                "id": node_a_id,
                "position": {"x": 0.0, "y": 0.0},
                "connected_road_ids": [road_id],
                "control_type": "UNCONTROLLED",
            },
            {
                "id": node_b_id,
                "position": {"x": 1000.0, "y": 0.0},
                "connected_road_ids": [road_id],
                "control_type": "UNCONTROLLED",
            },
        ],
        "traffic_demands": [
            {
                "id": str(uuid.uuid4()),
                "source_intersection_id": node_a_id,
                "destination_intersection_id": node_b_id,
                "vehicles_per_hour": 300.0,
            }
        ],
    }


@requires_postgres
def test_traffic_analysis_success(client) -> None:
    payload = _two_intersection_payload()
    create_response = client.post("/api/v1/cities", json=payload)
    assert create_response.status_code == 201

    response = client.post(f"/api/v1/cities/{payload['id']}/traffic-analysis")
    assert response.status_code == 200

    body = response.json()
    assert body["network_summary"]["node_count"] == 2
    assert body["network_summary"]["routed_demand_count"] == 1
    assert len(body["routes"]) == 1
    assert body["routes"][0]["vehicles_per_hour"] == 300.0
    assert len(body["road_metrics"]) == 1
    assert len(body["lane_metrics"]) == 2
    assert len(body["intersection_metrics"]) == 2


@requires_postgres
def test_traffic_analysis_result_structure(client) -> None:
    payload = _two_intersection_payload()
    client.post("/api/v1/cities", json=payload)

    response = client.post(f"/api/v1/cities/{payload['id']}/traffic-analysis")
    body = response.json()

    for key in (
        "network_summary",
        "road_metrics",
        "lane_metrics",
        "intersection_metrics",
        "routes",
        "bottlenecks",
        "warnings",
    ):
        assert key in body


@requires_postgres
def test_traffic_analysis_unknown_city_returns_404(client) -> None:
    response = client.post(f"/api/v1/cities/{uuid.uuid4()}/traffic-analysis")
    assert response.status_code == 404
