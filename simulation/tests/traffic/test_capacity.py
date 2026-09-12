from pixel_lane_simulation.traffic.capacity.capacity import edge_capacity_vph, lane_capacity_vph
from pixel_lane_simulation.traffic.config import TrafficEngineConfig


def test_one_lane_capacity() -> None:
    config = TrafficEngineConfig()
    assert edge_capacity_vph(1, config) == config.capacity_per_lane_vph


def test_multi_lane_road_capacity_sums_lanes() -> None:
    config = TrafficEngineConfig()
    assert edge_capacity_vph(3, config) == 3 * config.capacity_per_lane_vph


def test_configurable_capacity_is_respected() -> None:
    config = TrafficEngineConfig(capacity_per_lane_vph=900.0)
    assert lane_capacity_vph(config) == 900.0
    assert edge_capacity_vph(2, config) == 1800.0
