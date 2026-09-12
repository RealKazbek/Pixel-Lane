from pixel_lane_simulation.traffic.config import TrafficEngineConfig
from pixel_lane_simulation.traffic.metrics.congestion import (
    FREE_FLOW,
    HEAVY,
    MODERATE,
    SATURATED,
    classify,
    volume_capacity_ratio,
)


def test_free_flow_classification() -> None:
    config = TrafficEngineConfig()
    assert classify(0.2, config) == FREE_FLOW


def test_moderate_classification() -> None:
    config = TrafficEngineConfig()
    assert classify(0.65, config) == MODERATE


def test_heavy_classification() -> None:
    config = TrafficEngineConfig()
    assert classify(0.9, config) == HEAVY


def test_saturated_classification() -> None:
    config = TrafficEngineConfig()
    assert classify(1.5, config) == SATURATED


def test_ratio_boundaries_match_documented_thresholds() -> None:
    config = TrafficEngineConfig()
    assert classify(0.49, config) == FREE_FLOW
    assert classify(0.50, config) == MODERATE
    assert classify(0.80, config) == HEAVY
    assert classify(1.00, config) == HEAVY
    assert classify(1.01, config) == SATURATED


def test_volume_capacity_ratio_handles_zero_capacity() -> None:
    assert volume_capacity_ratio(100.0, 0.0) == 0.0
