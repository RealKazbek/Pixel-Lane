import dataclasses

from pixel_lane_simulation.traffic.analysis.engine import analyze_city
from tests.traffic.factories import demand, linear_network


def test_overloaded_road_detected_as_bottleneck() -> None:
    built_city, a_id, b_id, _ = linear_network(num_lanes_per_direction=1)
    # Road capacity = forward + backward lane capacity = 2 x 1800 = 3600 vph;
    # push demand well past that.
    demands = (demand(a_id, b_id, 4500.0),)
    city_with_demand = dataclasses.replace(built_city, traffic_demands=demands)

    result = analyze_city(city_with_demand)

    road_bottlenecks = [b for b in result.bottlenecks if b.entity_type == "road"]
    assert road_bottlenecks
    assert road_bottlenecks[0].severity == "high"
    assert road_bottlenecks[0].volume_capacity_ratio > 1.0


def test_non_overloaded_network_has_no_high_severity_bottleneck() -> None:
    built_city, a_id, b_id, _ = linear_network(num_lanes_per_direction=2)
    demands = (demand(a_id, b_id, 100.0),)
    city_with_demand = dataclasses.replace(built_city, traffic_demands=demands)

    result = analyze_city(city_with_demand)

    assert result.bottlenecks == ()
