"""Baseline capacity model.

v1 uses one flat per-lane capacity for every lane, regardless of lane type,
road type, or signal control (see `TrafficEngineConfig.capacity_per_lane_vph`
in config.py for the documented assumption). Refining this per lane/road
type is future work, not implemented here.
"""

from pixel_lane_simulation.traffic.config import TrafficEngineConfig


def lane_capacity_vph(config: TrafficEngineConfig) -> float:
    return config.capacity_per_lane_vph


def edge_capacity_vph(lane_count: int, config: TrafficEngineConfig) -> float:
    return lane_count * config.capacity_per_lane_vph
