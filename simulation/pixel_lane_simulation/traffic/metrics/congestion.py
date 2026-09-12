"""Congestion classification from a volume/capacity ratio.

Thresholds are centralized in `TrafficEngineConfig` (see config.py) --
defaults:
    ratio < 0.50            -> FREE_FLOW
    0.50 <= ratio < 0.80    -> MODERATE
    0.80 <= ratio <= 1.00   -> HEAVY
    ratio > 1.00            -> SATURATED
"""

from pixel_lane_simulation.traffic.config import TrafficEngineConfig

FREE_FLOW = "FREE_FLOW"
MODERATE = "MODERATE"
HEAVY = "HEAVY"
SATURATED = "SATURATED"


def volume_capacity_ratio(volume_vph: float, capacity_vph: float) -> float:
    if capacity_vph <= 0:
        return 0.0
    return volume_vph / capacity_vph


def classify(ratio: float, config: TrafficEngineConfig) -> str:
    if ratio < config.free_flow_max_ratio:
        return FREE_FLOW
    if ratio < config.moderate_max_ratio:
        return MODERATE
    if ratio <= config.heavy_max_ratio:
        return HEAVY
    return SATURATED
