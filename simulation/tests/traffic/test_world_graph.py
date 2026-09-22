from dataclasses import replace
from uuid import uuid4

import pytest

from pixel_lane_simulation.traffic.graph.world import InvalidWorldGraphError, build_world_graph
from pixel_lane_simulation.traffic.models.inputs import (
    LaneAvailabilityInput, LaneConnectionInput, TrafficRuleInput, TrafficRuleType, VehicleClass,
)
from tests.traffic.factories import city, intersection, lane, point, road


def test_multi_lane_road_creates_directed_segments_without_collapsing_lanes():
    r = road(point(0, 0), point(100, 0), (lane("FORWARD"), lane("FORWARD", 1), lane("BACKWARD")))
    a, b = intersection(point(0, 0), (r.id,)), intersection(point(100, 0), (r.id,))
    graph = build_world_graph(city((r,), (a, b)))

    assert graph.road_segments[f"{r.id}:forward"].lane_ids == (r.lanes[0].id, r.lanes[1].id)
    assert graph.road_segments[f"{r.id}:backward"].lane_ids == (r.lanes[2].id,)


def test_lane_connection_is_directed_and_validates_references():
    r1 = road(point(0, 0), point(100, 0), (lane("FORWARD"),))
    r2 = road(point(100, 0), point(100, 100), (lane("FORWARD"),))
    junction = intersection(point(100, 0), (r1.id, r2.id))
    a, c = intersection(point(0, 0), (r1.id,)), intersection(point(100, 100), (r2.id,))
    connection = LaneConnectionInput(uuid4(), junction.id, r1.id, r1.lanes[0].id,
                                     r2.id, r2.lanes[0].id, "RIGHT")
    built_city = city((r1, r2), (a, junction, c),)
    graph = build_world_graph(replace(built_city, lane_connections=(connection,)))
    assert graph.lane_connections[connection.id].from_lane_id == r1.lanes[0].id

    bad = LaneConnectionInput(uuid4(), junction.id, r1.id, uuid4(), r2.id, r2.lanes[0].id, "RIGHT")
    with pytest.raises(InvalidWorldGraphError):
        build_world_graph(replace(built_city, lane_connections=(bad,)))


def test_vehicle_class_rule_supports_bus_only_lane_and_conditional_turn_access():
    bus_lane = lane("FORWARD")
    r = road(point(0, 0), point(100, 0), (bus_lane,))
    a, b = intersection(point(0, 0), (r.id,)), intersection(point(100, 0), (r.id,))
    rule = TrafficRuleInput(uuid4(), TrafficRuleType.NO_ACCESS, bus_lane.id, "LANE",
                            frozenset({VehicleClass.CAR}))
    graph = build_world_graph(replace(city((r,), (a, b)), traffic_rules=(rule,)))
    assert not graph.lane_can_use(bus_lane.id, VehicleClass.CAR)
    assert graph.lane_can_use(bus_lane.id, VehicleClass.BUS)

    connection_id = uuid4()
    conditional = TrafficRuleInput(uuid4(), TrafficRuleType.NO_ACCESS, bus_lane.id, "LANE",
                                   frozenset({VehicleClass.CAR}), connection_id=connection_id)
    graph.traffic_rules = (conditional,)
    assert graph.lane_can_use(bus_lane.id, VehicleClass.CAR)
    assert not graph.lane_can_use(bus_lane.id, VehicleClass.CAR, connection_id)


def test_dynamic_lane_availability_blocks_lane_without_changing_static_segment():
    r = road(point(0, 0), point(100, 0), (lane("FORWARD"),))
    a, b = intersection(point(0, 0), (r.id,)), intersection(point(100, 0), (r.id,))
    graph = build_world_graph(replace(city((r,), (a, b)), lane_availability=(
        LaneAvailabilityInput(r.lanes[0].id, available=False),)))
    assert f"{r.id}:forward" in graph.road_segments
    assert not graph.lane_can_use(r.lanes[0].id, VehicleClass.CAR)
