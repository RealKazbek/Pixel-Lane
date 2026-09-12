"""Small builder helpers for CityInput test fixtures.

Kept separate from the tests themselves so each test can build just the
minimal network it needs, instead of everyone sharing one large fixture.
"""

from uuid import UUID, uuid4

from pixel_lane_simulation.traffic.models.inputs import (
    CityInput,
    IntersectionInput,
    LaneDirection,
    LaneInput,
    PointInput,
    RoadInput,
    TrafficDemandInput,
)


def point(x: float, y: float) -> PointInput:
    return PointInput(x=x, y=y)


def lane(
    direction: LaneDirection, index: int = 0, speed_limit_kmh: float | None = None
) -> LaneInput:
    return LaneInput(id=uuid4(), index=index, direction=direction, speed_limit_kmh=speed_limit_kmh)


def road(
    start: PointInput,
    end: PointInput,
    lanes: tuple[LaneInput, ...],
    *,
    name: str = "Test Road",
    speed_limit_kmh: float = 50.0,
    road_id: UUID | None = None,
) -> RoadInput:
    return RoadInput(
        id=road_id or uuid4(),
        name=name,
        geometry_points=(start, end),
        default_speed_limit_kmh=speed_limit_kmh,
        lanes=lanes,
    )


def intersection(
    position: PointInput, connected_road_ids: tuple[UUID, ...], intersection_id: UUID | None = None
) -> IntersectionInput:
    return IntersectionInput(
        id=intersection_id or uuid4(),
        position=position,
        connected_road_ids=connected_road_ids,
    )


def demand(
    source_id: UUID,
    destination_id: UUID | None,
    vehicles_per_hour: float,
) -> TrafficDemandInput:
    return TrafficDemandInput(
        id=uuid4(),
        source_intersection_id=source_id,
        destination_intersection_id=destination_id,
        vehicles_per_hour=vehicles_per_hour,
    )


def city(
    roads: tuple[RoadInput, ...],
    intersections: tuple[IntersectionInput, ...],
    demands: tuple[TrafficDemandInput, ...] = (),
    *,
    coordinate_system: str = "LOCAL_CARTESIAN",
) -> CityInput:
    return CityInput(
        id=uuid4(),
        name="Test City",
        coordinate_system=coordinate_system,  # type: ignore[arg-type]
        roads=roads,
        intersections=intersections,
        traffic_demands=demands,
    )


def linear_network(
    num_lanes_per_direction: int = 1, spacing_m: float = 1000.0
) -> tuple[CityInput, UUID, UUID, UUID]:
    """A -> B -> C, two bidirectional roads, one lane each way by default.

    Returns (city, node_a_id, node_b_id, node_c_id).
    """
    a_id, b_id, c_id = uuid4(), uuid4(), uuid4()
    lanes_ab = tuple(lane("FORWARD", i) for i in range(num_lanes_per_direction)) + tuple(
        lane("BACKWARD", i) for i in range(num_lanes_per_direction)
    )
    lanes_bc = tuple(lane("FORWARD", i) for i in range(num_lanes_per_direction)) + tuple(
        lane("BACKWARD", i) for i in range(num_lanes_per_direction)
    )
    road_ab = road(point(0, 0), point(spacing_m, 0), lanes_ab, name="A-B")
    road_bc = road(point(spacing_m, 0), point(2 * spacing_m, 0), lanes_bc, name="B-C")

    node_a = intersection(point(0, 0), (road_ab.id,), a_id)
    node_b = intersection(point(spacing_m, 0), (road_ab.id, road_bc.id), b_id)
    node_c = intersection(point(2 * spacing_m, 0), (road_bc.id,), c_id)

    built_city = city((road_ab, road_bc), (node_a, node_b, node_c))
    return built_city, a_id, b_id, c_id
