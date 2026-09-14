"""Maps a NormalizedNetwork (pure OSM data) onto Pixel Lane's City Model
contract (`CityCreate` and friends). No osmnx/networkx import here -- this
is the layer unit tests exercise directly with hand-built
`NormalizedNode`/`NormalizedEdge` values (see AGENTS.md § 19's
retrieval/normalization/mapping layering).

Key mapping decision: OSMnx already simplifies the graph to topology nodes
(intersections/dead-ends), so every graph node becomes one Intersection
and every directed graph edge becomes one Road -- no extra
degree-filtering logic is needed (see docs/architecture.md).

A two-way OSM street therefore becomes **two** Pixel Lane Roads (one per
direction, since OSMnx represents it as two directed edges), each with
lanes only in the FORWARD direction relative to that Road's own point
order. This avoids the significant extra complexity of pairing up
directed edges back into one bidirectional Road, loses no information
(geometry, direction, and lane counts are all preserved per direction),
and means an imported one-way OSM road trivially has no reverse lane.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import NAMESPACE_DNS, UUID, uuid5

from app.city.domain.enums import (
    CoordinateSystem,
    IntersectionControlType,
    LaneDirection,
    MovementType,
    RoadType,
    TrafficRuleTargetType,
    TrafficRuleType,
)
from app.city.domain.geometry import Point, Polyline
from app.city.domain.limits import MAX_LANES_PER_ROAD, MAX_LANES_PER_SIGNAL_GROUP
from app.city.importers.osm.defaults import (
    DEFAULT_SPEED_LIMIT_KMH,
    FALLBACK_ROAD_NAME,
    FALLBACK_ROAD_TYPE,
    HIGHWAY_TO_ROAD_TYPE,
    IMPORT_UUID_NAMESPACE,
    SYNTHETIC_PHASE_DURATION_SECONDS,
    SYNTHETIC_PHASE_NAME,
    SYNTHETIC_SIGNAL_GROUP_NAME,
)
from app.city.importers.osm.normalization import NormalizedEdge, NormalizedNetwork, NormalizedNode
from app.city.schemas.city import CityCreate
from app.city.schemas.import_city import CityImport
from app.city.schemas.intersection import IntersectionCreate
from app.city.schemas.lane import LaneCreate
from app.city.schemas.road import RoadCreate
from app.city.schemas.traffic_light import PhaseCreate, SignalGroupCreate, TrafficLightCreate
from app.city.schemas.traffic_rule import TrafficRuleCreate

_ROOT_NAMESPACE = uuid5(NAMESPACE_DNS, IMPORT_UUID_NAMESPACE)


def _id_for(*parts: object) -> UUID:
    """Deterministic UUID5 for an imported entity -- re-importing the same
    OSM data produces the same ids (idempotency, stable diffs)."""
    return uuid5(_ROOT_NAMESPACE, ":".join(str(p) for p in parts))


@dataclass
class MappingResult:
    city: CityCreate
    warnings: list[str] = field(default_factory=list)


def _road_type(highway: str | None) -> RoadType:
    return RoadType(HIGHWAY_TO_ROAD_TYPE.get(highway or "", FALLBACK_ROAD_TYPE))


def _road_name(edge: NormalizedEdge) -> str:
    return edge.name or f"{FALLBACK_ROAD_NAME} {edge.osm_ids[0]}"


def _map_edge(
    edge: NormalizedEdge, warnings: list[str], *, observed_only: bool = False
) -> tuple[RoadCreate, list[UUID]]:
    road_id = _id_for("way", edge.u, edge.v, edge.key)
    edge_label = f"way {edge.osm_ids[0]} ({edge.u}->{edge.v})"

    lane_count = edge.lane_count
    if lane_count > MAX_LANES_PER_ROAD:
        warnings.append(
            f"{edge_label}: lane count {lane_count} exceeds the per-road maximum "
            f"({MAX_LANES_PER_ROAD}); capped."
        )
        lane_count = MAX_LANES_PER_ROAD

    lane_ids: list[UUID] = []
    lanes: list[LaneCreate] = []
    for index in range(lane_count):
        lane_id = _id_for("lane", edge.u, edge.v, edge.key, index)
        lane_ids.append(lane_id)
        lanes.append(
            LaneCreate(
                id=lane_id,
                index=index,
                direction=LaneDirection.FORWARD,
                allowed_movements=[] if observed_only else [MovementType.STRAIGHT],
                speed_limit_kmh=None,
            )
        )

    road = RoadCreate(
        id=road_id,
        name=_road_name(edge),
        road_type=_road_type(edge.highway),
        geometry=Polyline(points=[Point(x=lon, y=lat) for lon, lat in edge.points]),
        default_speed_limit_kmh=(
            edge.maxspeed_kmh if observed_only else edge.maxspeed_kmh or DEFAULT_SPEED_LIMIT_KMH
        ),
        source_id="osm:way:" + ",".join(str(i) for i in sorted(edge.osm_ids)),
        source_road_type=edge.highway,
        one_way=edge.oneway,
        source_lane_count=edge.source_lane_count
        if edge.source_lane_count and edge.source_lane_count > 0
        else None,
        lanes=lanes,
    )
    return road, lane_ids


def _speed_rule(edge: NormalizedEdge, road_id: UUID) -> TrafficRuleCreate | None:
    if edge.maxspeed_kmh is None:
        return None
    return TrafficRuleCreate(
        id=_id_for("speed-rule", edge.u, edge.v, edge.key),
        rule_type=TrafficRuleType.SPEED_LIMIT,
        target_type=TrafficRuleTargetType.ROAD,
        target_id=road_id,
        speed_limit_kmh=edge.maxspeed_kmh,
    )


def _map_traffic_light(
    node: NormalizedNode, intersection_id: UUID, connected_lane_ids: list[UUID], warnings: list[str]
) -> TrafficLightCreate | None:
    """A synthetic, explicitly non-real single-phase "always green" plan.

    OpenStreetMap tells us a signal exists at this node, never its real
    phase timing -- see this package's README and docs/architecture.md.
    """
    if not connected_lane_ids:
        return None

    lane_ids = connected_lane_ids
    if len(lane_ids) > MAX_LANES_PER_SIGNAL_GROUP:
        warnings.append(
            f"node {node.osm_id}: {len(lane_ids)} approach lanes exceeds the signal "
            f"group maximum ({MAX_LANES_PER_SIGNAL_GROUP}); truncated."
        )
        lane_ids = lane_ids[:MAX_LANES_PER_SIGNAL_GROUP]

    signal_group_id = _id_for("signal-group", node.osm_id)
    return TrafficLightCreate(
        id=_id_for("signal", node.osm_id),
        intersection_id=intersection_id,
        signal_groups=[
            SignalGroupCreate(
                id=signal_group_id,
                name=SYNTHETIC_SIGNAL_GROUP_NAME,
                controlled_lane_ids=lane_ids,
            )
        ],
        phases=[
            PhaseCreate(
                id=_id_for("phase", node.osm_id),
                name=SYNTHETIC_PHASE_NAME,
                duration_seconds=SYNTHETIC_PHASE_DURATION_SECONDS,
                green_signal_group_ids=[signal_group_id],
            )
        ],
    )


def map_network_to_city(
    network: NormalizedNetwork,
    *,
    city_id: UUID,
    city_name: str,
    description: str | None,
    full_import: bool = False,
) -> MappingResult:
    warnings = list(network.warnings)

    roads: list[RoadCreate] = []
    traffic_rules: list[TrafficRuleCreate] = []
    roads_by_node: dict[int, list[UUID]] = {}
    lanes_by_node: dict[int, list[UUID]] = {}

    for edge in network.edges:
        road, lane_ids = _map_edge(edge, warnings, observed_only=full_import)
        roads.append(road)
        speed_rule = _speed_rule(edge, road.id)
        if speed_rule is not None:
            traffic_rules.append(speed_rule)

        for node_id in dict.fromkeys((edge.u, edge.v)):
            roads_by_node.setdefault(node_id, []).append(road.id)
            lanes_by_node.setdefault(node_id, []).extend(lane_ids)

    intersections: list[IntersectionCreate] = []
    traffic_lights: list[TrafficLightCreate] = []
    for node in network.nodes:
        connected_road_ids = roads_by_node.get(node.osm_id, [])
        if not connected_road_ids:
            warnings.append(f"node {node.osm_id}: not connected to any road; skipped.")
            continue

        intersection_id = _id_for("node", node.osm_id)
        connected_lane_ids = lanes_by_node.get(node.osm_id, [])

        traffic_light = None
        if node.control_type == "TRAFFIC_LIGHT":
            traffic_light = (
                TrafficLightCreate(
                    id=_id_for("signal", node.osm_id), intersection_id=intersection_id
                )
                if full_import
                else _map_traffic_light(node, intersection_id, connected_lane_ids, warnings)
            )
            if traffic_light is None:
                warnings.append(
                    f"node {node.osm_id}: tagged as a traffic signal but has no "
                    "approach lanes; imported as an uncontrolled intersection."
                )

        intersections.append(
            IntersectionCreate(
                id=intersection_id,
                position=Point(x=node.lon, y=node.lat),
                connected_road_ids=connected_road_ids,
                connected_lane_ids=connected_lane_ids,
                control_type=(
                    IntersectionControlType.TRAFFIC_LIGHT
                    if traffic_light is not None
                    else IntersectionControlType(node.control_type)
                    if node.control_type != "TRAFFIC_LIGHT"
                    else IntersectionControlType.UNCONTROLLED
                ),
                traffic_light_id=traffic_light.id if traffic_light is not None else None,
            )
        )
        if traffic_light is not None:
            traffic_lights.append(traffic_light)

    city = (CityImport if full_import else CityCreate)(
        id=city_id,
        name=city_name,
        description=description,
        coordinate_system=CoordinateSystem.WGS84,
        roads=roads,
        intersections=intersections,
        traffic_lights=traffic_lights,
        traffic_rules=traffic_rules,
        parking_zones=[],
        traffic_demands=[],
    )
    return MappingResult(city=city, warnings=warnings)
