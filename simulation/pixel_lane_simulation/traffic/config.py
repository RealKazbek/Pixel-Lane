"""Centralized, documented Traffic Engine v1 assumptions.

Every "magic number" the engine uses lives here, once, so it's visible and
adjustable without hunting through the codebase.
"""

from dataclasses import dataclass

# Baseline per-lane capacity assumption. 1800 vehicles/hour/lane is a
# commonly used rough baseline for an urban through lane (in the range
# HCM-style rules of thumb use for a single lane under good conditions).
# It is NOT calibrated to any specific city and does not vary by lane type,
# road type, or signal control in v1 -- that is a known simplification.
DEFAULT_CAPACITY_PER_LANE_VPH = 1800.0

# Used only when a road has no usable speed limit to compute free-flow
# travel time from.
DEFAULT_FREE_FLOW_SPEED_KMH = 40.0

# Congestion classification thresholds, applied to volume/capacity ratio.
#   ratio < FREE_FLOW_MAX             -> FREE_FLOW
#   FREE_FLOW_MAX <= ratio < MODERATE_MAX -> MODERATE
#   MODERATE_MAX <= ratio <= HEAVY_MAX     -> HEAVY
#   ratio > HEAVY_MAX                  -> SATURATED
DEFAULT_FREE_FLOW_MAX_RATIO = 0.50
DEFAULT_MODERATE_MAX_RATIO = 0.80
DEFAULT_HEAVY_MAX_RATIO = 1.00


@dataclass(frozen=True)
class TrafficEngineConfig:
    capacity_per_lane_vph: float = DEFAULT_CAPACITY_PER_LANE_VPH
    default_free_flow_speed_kmh: float = DEFAULT_FREE_FLOW_SPEED_KMH
    free_flow_max_ratio: float = DEFAULT_FREE_FLOW_MAX_RATIO
    moderate_max_ratio: float = DEFAULT_MODERATE_MAX_RATIO
    heavy_max_ratio: float = DEFAULT_HEAVY_MAX_RATIO
