"""End-to-end Traffic Engine tests.

The backend's four-way-intersection example fixture has only one
intersection and movement-only demand (see backend/app/city/examples/), so
it can't exercise routing between two intersections. These tests instead
use a small, self-contained multi-intersection network via the shared
`tests/traffic/factories.py` helpers -- the same shape of data the backend
adapter would build from a real City Model.
"""

import dataclasses

from pixel_lane_simulation.traffic.analysis.engine import analyze_city
from tests.traffic.factories import demand, linear_network


def test_engine_end_to_end_produces_full_result() -> None:
    built_city, a_id, _b_id, c_id = linear_network(num_lanes_per_direction=1)
    demands = (demand(a_id, c_id, 500.0),)
    city_with_demand = dataclasses.replace(built_city, traffic_demands=demands)

    result = analyze_city(city_with_demand)

    assert result.network_summary.node_count == 3
    assert result.network_summary.edge_count == 4  # 2 roads x 2 directions
    assert result.network_summary.routed_demand_count == 1
    assert len(result.routes) == 1
    assert result.routes[0].road_ids  # traversed at least one road
    assert len(result.road_metrics) == 2
    assert len(result.lane_metrics) == 4
    assert len(result.intersection_metrics) == 3


def test_empty_city_returns_empty_analysis_without_error() -> None:
    from tests.traffic.factories import city

    empty_city = city((), ())

    result = analyze_city(empty_city)

    assert result.network_summary.node_count == 0
    assert result.routes == ()
    assert any("no intersections" in w for w in result.warnings)
