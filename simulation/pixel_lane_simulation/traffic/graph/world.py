"""Hierarchical road/lane graph for routing and future vehicle simulation.

This is additive to the v1 aggregate ``NetworkGraph``.  It deliberately
keeps static topology (roads, lanes, movements, rules) separate from the
small dynamic availability overlay.
"""

from dataclasses import dataclass, field
from uuid import UUID

from pixel_lane_simulation.traffic.models.inputs import (
    CityInput, LaneAvailabilityInput, LaneConnectionInput, TrafficRuleInput,
    TrafficRuleType, VehicleClass,
)


class InvalidWorldGraphError(ValueError):
    pass


@dataclass(frozen=True)
class RoadSegment:
    id: str
    road_id: UUID
    from_intersection_id: UUID
    to_intersection_id: UUID
    lane_ids: tuple[UUID, ...]


@dataclass(frozen=True)
class LaneConnection:
    id: UUID
    intersection_id: UUID
    from_lane_id: UUID
    to_lane_id: UUID
    maneuver: str


@dataclass
class WorldGraph:
    road_segments: dict[str, RoadSegment] = field(default_factory=dict)
    lanes_by_id: dict[UUID, object] = field(default_factory=dict)
    lane_connections: dict[UUID, LaneConnection] = field(default_factory=dict)
    traffic_rules: tuple[TrafficRuleInput, ...] = ()
    lane_availability: dict[UUID, LaneAvailabilityInput] = field(default_factory=dict)

    def lane_can_use(self, lane_id: UUID, vehicle_class: VehicleClass,
                     connection_id: UUID | None = None) -> bool:
        state = self.lane_availability.get(lane_id)
        if state is not None and not state.available:
            return False
        for rule in self.traffic_rules:
            applies = (rule.target_id == lane_id or
                       (rule.connection_id is not None and rule.connection_id == connection_id))
            if not applies or (rule.vehicle_classes and vehicle_class not in rule.vehicle_classes):
                if not applies:
                    continue
                if rule.rule_type == TrafficRuleType.ACCESS:
                    return False
                continue
            if rule.rule_type == TrafficRuleType.ACCESS and rule.vehicle_classes:
                continue
            if rule.rule_type in (TrafficRuleType.NO_ACCESS, TrafficRuleType.TEMPORARY_CLOSURE):
                return False
        return True


def build_world_graph(city: CityInput) -> WorldGraph:
    graph = WorldGraph(traffic_rules=city.traffic_rules)
    for road in city.roads:
        for lane in road.lanes:
            graph.lanes_by_id[lane.id] = lane
        endpoints = [i for i in city.intersections if road.id in i.connected_road_ids]
        if len(endpoints) != 2:
            continue
        start, end = endpoints
        for direction, source, target in (("FORWARD", start, end), ("BACKWARD", end, start)):
            lanes = tuple(l.id for l in road.lanes if l.direction == direction)
            if lanes:
                graph.road_segments[f"{road.id}:{direction.lower()}"] = RoadSegment(
                    id=f"{road.id}:{direction.lower()}", road_id=road.id,
                    from_intersection_id=source.id, to_intersection_id=target.id, lane_ids=lanes)
    for connection in city.lane_connections:
        source = graph.lanes_by_id.get(connection.from_lane_id)
        target = graph.lanes_by_id.get(connection.to_lane_id)
        if source is None or target is None:
            raise InvalidWorldGraphError(f"Connection {connection.id} references an unknown lane")
        if connection.from_road_id == connection.to_road_id:
            raise InvalidWorldGraphError(f"Connection {connection.id} must cross an intersection")
        graph.lane_connections[connection.id] = LaneConnection(
            connection.id, connection.intersection_id, connection.from_lane_id,
            connection.to_lane_id, connection.maneuver)
    graph.lane_availability = {item.lane_id: item for item in city.lane_availability}
    return graph
