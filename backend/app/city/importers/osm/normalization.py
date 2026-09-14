"""Turns a raw OSMnx/networkx graph into plain, framework-independent
dataclasses -- the boundary between "OSM retrieval" and "Pixel Lane
mapping" (see AGENTS.md § 19's source-of-truth/layering guidance).

Only `extract_network` touches a graph object (duck-typed: anything with
`.nodes(data=True)` / `.edges(keys=True, data=True)`, so tests can pass a
real small `networkx.MultiDiGraph` without hitting the network). Every
other function here is a plain parser over OSM tag dicts and has no
graph/networkx/osmnx dependency at all.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from math import isfinite
from typing import Any, Protocol

from app.city.importers.osm.defaults import DEFAULT_LANE_COUNT


def first(value: Any) -> Any:
    """OSMnx sometimes gives a list when multiple OSM ways were merged
    into one edge (e.g. `osmid`) or a tag had conflicting values along the
    way. Take the first, deterministically."""
    if isinstance(value, list):
        return value[0] if value else None
    return value


def parse_oneway(tags: dict[str, Any]) -> bool:
    """OSMnx already normalizes `oneway` to a real bool on the edge; this
    just defends against unexpected raw-string input."""
    value = tags.get("oneway", False)
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"yes", "true", "1", "-1"}


def _positive_int(raw: Any) -> int | None:
    """Parses an OSM integer-ish tag value, keeping `None` for anything
    absent or non-positive (zero/negative lane counts are not physically
    meaningful and are treated the same as "not provided")."""
    if raw is None:
        return None
    parsed = _parse_int(first(raw))
    return parsed if parsed is not None and parsed > 0 else None


@dataclass(frozen=True)
class LaneCountResult:
    """Result of resolving how many `Lane` rows to generate for ONE
    directed edge (this edge's own direction only), plus the raw
    directional tag evidence for the *original* (possibly two-way) OSM
    way -- kept regardless of which direction this edge represents, so a
    Road always carries the full source breakdown it was derived from,
    not just its own slice of it (see `Road.forward_lane_count` /
    `backward_lane_count` / `both_ways_lane_count` in mapper.py)."""

    count: int
    quality: str  # LaneCountQuality value
    forward_raw: int | None
    backward_raw: int | None
    both_ways_raw: int | None


def parse_lane_count(
    tags: dict[str, Any], *, oneway: bool, observed_only: bool = False
) -> LaneCountResult:
    """Resolves this edge's own-direction lane count with an explicit
    confidence (`LaneCountResult.quality`) instead of silently guessing.

    Preference order:
    1. An explicit per-direction tag (`lanes:forward`/`lanes:backward`)
       matching this edge's own direction -- `SOURCE`.
    2. `oneway=yes` with a generic `lanes=*` total -- the whole total
       safely belongs to this single direction -- `INFERRED`.
    3. Nothing usable -- `DEFAULT_LANE_COUNT`, `FALLBACK`. Critically,
       a two-way edge with only a generic `lanes=*` total (e.g. `lanes=4`,
       `oneway=no`) is NEVER split evenly between directions here: an
       even/odd total does not tell us the real per-direction allocation,
       so this Road's own count falls back rather than fabricating a
       2+2-style guess (see docs/city-model.md's Part 2A audit).
    `observed_only` (full-city import) additionally never synthesizes a
    fallback: with no usable evidence it returns `count=0`,
    `quality=UNKNOWN` rather than `DEFAULT_LANE_COUNT`.
    """
    forward_raw = _positive_int(tags.get("lanes:forward"))
    backward_raw = _positive_int(tags.get("lanes:backward"))
    both_ways_raw = _positive_int(tags.get("lanes:both_ways"))
    reversed_ = tags.get("reversed") is True
    same_direction_raw = backward_raw if reversed_ else forward_raw

    if same_direction_raw is not None:
        return LaneCountResult(
            same_direction_raw, "SOURCE", forward_raw, backward_raw, both_ways_raw
        )

    total_raw = _positive_int(tags.get("lanes"))
    if oneway and total_raw is not None:
        return LaneCountResult(total_raw, "INFERRED", forward_raw, backward_raw, both_ways_raw)

    if observed_only:
        return LaneCountResult(0, "UNKNOWN", forward_raw, backward_raw, both_ways_raw)

    return LaneCountResult(DEFAULT_LANE_COUNT, "FALLBACK", forward_raw, backward_raw, both_ways_raw)


#: OSM `turn:lanes=*` per-lane token -> `TurnLaneType` value. Anything not
#: listed here is unsupported and skipped with a warning rather than
#: guessed at (e.g. rare/regional tokens).
TURN_LANE_TOKEN_MAP: dict[str, str] = {
    "left": "LEFT",
    "slight_left": "SLIGHT_LEFT",
    "through": "THROUGH",
    "slight_right": "SLIGHT_RIGHT",
    "right": "RIGHT",
    "reverse": "REVERSE",
    "merge_to_left": "MERGE_TO_LEFT",
    "merge_to_right": "MERGE_TO_RIGHT",
    "none": "NONE",
}

#: OSM `change:lanes=*` per-lane token -> `LaneChangePermission` value.
CHANGE_LANE_TOKEN_MAP: dict[str, str] = {
    "yes": "YES",
    "no": "NO",
    "not_left": "NOT_LEFT",
    "not_right": "NOT_RIGHT",
    "only_left": "ONLY_LEFT",
    "only_right": "ONLY_RIGHT",
}


def _split_pipe_tag(raw: Any) -> tuple[str, ...] | None:
    """Splits an OSM per-lane pipe-separated tag (`turn:lanes`,
    `change:lanes`, ...) into one raw token per lane. An empty segment
    between pipes (e.g. `"through||right"`) is preserved as `""` -- it
    means a lane exists with no value asserted for it, not "no data at
    all" (that distinction matters: see `parse_turn_lanes`)."""
    if raw is None:
        return None
    return tuple(str(first(raw)).split("|"))


def _select_directional_tag(tags: dict[str, Any], base_key: str, *, oneway: bool) -> Any:
    """OSM convention: an unsuffixed per-lane tag (`turn:lanes`,
    `change:lanes`) is only reliably tied to a single direction when the
    way itself is `oneway=yes`. On a two-way way, only the `:forward`/
    `:backward`-suffixed tag matching this edge's own direction is used;
    an unsuffixed tag on a two-way way is ambiguous (could describe either
    direction) and is deliberately never applied."""
    if oneway:
        return tags.get(base_key)
    reversed_ = tags.get("reversed") is True
    return tags.get(f"{base_key}:backward" if reversed_ else f"{base_key}:forward")


def parse_turn_lanes(
    tags: dict[str, Any],
    *,
    oneway: bool,
    lane_count: int,
    warnings: list[str],
    edge_label: str,
) -> tuple[tuple[str, ...], ...] | None:
    """Parses `turn:lanes=*` into one normalized token group per lane, left
    to right in this edge's own direction of travel (OSM's own convention
    for these tags -- see docs/city-model.md's Part 2A lane-ordering
    note). Lane index 0 is therefore the leftmost lane in this Road's
    travel direction.

    Returns `None` (unknown -- never fabricated) when the tag is absent,
    or when the parsed token count doesn't match `lane_count` exactly: a
    mismatch means the tag can't be trusted to line up with the lanes we
    actually generated, so it's discarded rather than silently
    misapplied to the wrong lane indices."""
    raw = _split_pipe_tag(_select_directional_tag(tags, "turn:lanes", oneway=oneway))
    if raw is None:
        return None
    if len(raw) != lane_count:
        warnings.append(
            f"{edge_label}: turn:lanes has {len(raw)} lane group(s) but {lane_count} "
            "lane(s) were resolved for this road; turn-lane data discarded as unreliable."
        )
        return None

    groups: list[tuple[str, ...]] = []
    for token in raw:
        if token == "":
            groups.append(())
            continue
        parsed_group: list[str] = []
        for part in token.split(";"):
            mapped = TURN_LANE_TOKEN_MAP.get(part)
            if mapped is None:
                warnings.append(f"{edge_label}: unsupported turn:lanes token '{part}'; skipped.")
                continue
            parsed_group.append(mapped)
        groups.append(tuple(parsed_group))
    return tuple(groups)


def parse_change_lanes(
    tags: dict[str, Any],
    *,
    oneway: bool,
    lane_count: int,
    warnings: list[str],
    edge_label: str,
) -> tuple[str | None, ...] | None:
    """Parses `change:lanes=*` into one normalized permission per lane,
    same left-to-right/direction-selection convention as
    `parse_turn_lanes`. `None` in the result marks a lane with no
    asserted value (empty token); `None` for the whole tag marks "not
    provided or unreliable", same discard-on-mismatch rule as turn lanes."""
    raw = _split_pipe_tag(_select_directional_tag(tags, "change:lanes", oneway=oneway))
    if raw is None:
        return None
    if len(raw) != lane_count:
        warnings.append(
            f"{edge_label}: change:lanes has {len(raw)} lane group(s) but {lane_count} "
            "lane(s) were resolved for this road; change-lane data discarded as unreliable."
        )
        return None

    result: list[str | None] = []
    for token in raw:
        if token == "":
            result.append(None)
            continue
        mapped = CHANGE_LANE_TOKEN_MAP.get(token)
        if mapped is None:
            warnings.append(f"{edge_label}: unsupported change:lanes token '{token}'; skipped.")
        result.append(mapped)
    return tuple(result)


#: OSM `bus:lanes=*`/`psv:lanes=*` per-lane token -> is this lane bus/PSV
#: designated. Anything else ("no", unrecognized) is treated as "not a
#: bus lane" for that slot rather than skipped, since these tags are
#: binary in practice (designated vs not).
_BUS_LANE_DESIGNATED_TOKENS = {"designated", "yes"}


def parse_bus_lanes(
    tags: dict[str, Any],
    *,
    oneway: bool,
    lane_count: int,
    warnings: list[str],
    edge_label: str,
) -> tuple[bool, ...] | None:
    """Parses `bus:lanes=*` (preferred) or `psv:lanes=*` (fallback, same
    per-lane pipe/direction convention) into one bool per lane -- `True`
    only for lanes explicitly tagged `designated`/`yes`. `None` when
    neither tag is usable for this edge's direction, same
    absent-or-mismatched-count discard rule as `parse_turn_lanes`."""
    raw = _split_pipe_tag(_select_directional_tag(tags, "bus:lanes", oneway=oneway))
    source_tag = "bus:lanes"
    if raw is None:
        raw = _split_pipe_tag(_select_directional_tag(tags, "psv:lanes", oneway=oneway))
        source_tag = "psv:lanes"
    if raw is None:
        return None
    if len(raw) != lane_count:
        warnings.append(
            f"{edge_label}: {source_tag} has {len(raw)} lane group(s) but {lane_count} "
            "lane(s) were resolved for this road; bus-lane data discarded as unreliable."
        )
        return None
    return tuple(token in _BUS_LANE_DESIGNATED_TOKENS for token in raw)


#: OSM `parking:lane:left`/`:right`/`:both` value -> ParkingLaneOrientation
#: value. Covers the common direct-orientation convention
#: (`parking:lane:right=parallel`); the separate `:orientation` suffix
#: convention is not parsed (see docs/city-model.md's deferred-tags note).
_PARKING_LANE_TOKEN_MAP: dict[str, str] = {
    "no": "NONE",
    "none": "NONE",
    "parallel": "PARALLEL",
    "diagonal": "DIAGONAL",
    "perpendicular": "PERPENDICULAR",
    "yes": "MARKED",
    "marked": "MARKED",
}


def _parse_parking_lane_value(raw: Any) -> str | None:
    if raw is None:
        return None
    token = str(first(raw)).strip().lower()
    return _PARKING_LANE_TOKEN_MAP.get(token)


def parse_parking_lanes(tags: dict[str, Any]) -> tuple[str | None, str | None]:
    """Parses `parking:lane:left` / `:right` / `:both` into
    `(left, right)` `ParkingLaneOrientation` values. `None` = tag absent
    or unparseable -- never guessed. `parking:lane:both` fills whichever
    side has no more specific `:left`/`:right` tag."""
    both = _parse_parking_lane_value(tags.get("parking:lane:both"))
    left = _parse_parking_lane_value(tags.get("parking:lane:left")) or both
    right = _parse_parking_lane_value(tags.get("parking:lane:right")) or both
    return left, right


#: OSM `cycleway=*`/`cycleway:left`/`:right` value -> CyclewayType value.
_CYCLEWAY_TOKEN_MAP: dict[str, str] = {
    "no": "NONE",
    "none": "NONE",
    "lane": "LANE",
    "opposite_lane": "LANE",
    "track": "TRACK",
    "opposite_track": "TRACK",
    "shared_lane": "SHARED_LANE",
    "share_busway": "SHARED_LANE",
}


def _parse_cycleway_value(raw: Any) -> str | None:
    if raw is None:
        return None
    token = str(first(raw)).strip().lower()
    return _CYCLEWAY_TOKEN_MAP.get(token)


def parse_cycleways(tags: dict[str, Any]) -> tuple[str | None, str | None]:
    """Parses `cycleway=*` (applies to both sides when no more specific
    per-side tag exists) and `cycleway:left`/`:right` into
    `(left, right)` `CyclewayType` values. `None` = not provided."""
    both = _parse_cycleway_value(tags.get("cycleway"))
    left = _parse_cycleway_value(tags.get("cycleway:left")) or both
    right = _parse_cycleway_value(tags.get("cycleway:right")) or both
    return left, right


def parse_width_m(tags: dict[str, Any]) -> float | None:
    """Parses OSM `width=*` (meters, per OSM convention -- a bare number
    or a number with a `m`/`meters`/`meter` suffix). Anything else
    (feet, ranges, unparsable junk) is skipped rather than guessed at;
    the importer falls back to the centralized width estimate instead
    (see app.city.domain.road_geometry)."""
    raw = tags.get("width")
    if raw is None:
        return None
    text = str(first(raw)).strip().lower()
    for suffix in ("meters", "meter", "m"):
        if text.endswith(suffix):
            text = text[: -len(suffix)].strip()
            break
    value = _parse_float(text)
    if value is not None and 0 < value <= 100:
        return value
    return None


def parse_bridge(tags: dict[str, Any]) -> bool:
    value = first(tags.get("bridge"))
    if value is None or value is False:
        return False
    return str(value).strip().lower() != "no"


def parse_tunnel(tags: dict[str, Any]) -> bool:
    value = first(tags.get("tunnel"))
    if value is None or value is False:
        return False
    return str(value).strip().lower() != "no"


def parse_level(tags: dict[str, Any]) -> int:
    """OSM `layer=*` (vertical stacking order, ground = 0/absent). Falls
    back to +1/-1 for bridge/tunnel ways with no explicit `layer`, since
    those physically are not at ground level even when untagged."""
    raw = tags.get("layer")
    if raw is not None:
        parsed = _parse_int(first(raw))
        if parsed is not None:
            return max(-4, min(4, parsed))
    if parse_bridge(tags):
        return 1
    if parse_tunnel(tags):
        return -1
    return 0


def _parse_int(value: Any) -> int | None:
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError, OverflowError):
        return None


def parse_maxspeed_kmh(
    tags: dict[str, Any], warnings: list[str], *, edge_label: str
) -> float | None:
    """Parses OSM `maxspeed`. Supports a plain integer/float string
    ("50") and a "<number> mph" suffix; anything else (implicit-speed
    zone codes like "RU:urban", ranges, unparsable junk) is skipped with a
    warning rather than guessed at or allowed to break the import."""
    raw = tags.get("maxspeed")
    if raw is None:
        return None
    raw = first(raw)
    text = str(raw).strip().lower()

    if text.endswith("mph"):
        number = _parse_float(text.removesuffix("mph").strip())
        if number is not None and 0 < number * 1.60934 <= 200:
            return round(number * 1.60934, 1)
        warnings.append(f"{edge_label}: could not parse maxspeed '{raw}' (mph); skipped.")
        return None

    number = _parse_float(text)
    if number is not None and 0 < number <= 200:
        return number

    warnings.append(f"{edge_label}: unsupported maxspeed value '{raw}'; skipped.")
    return None


def _parse_float(value: str) -> float | None:
    try:
        number = float(value)
        return number if isfinite(number) else None
    except ValueError:
        return None


def parse_node_control(tags: dict[str, Any]) -> str:
    """Maps an OSM node's `highway` tag to a Pixel Lane
    IntersectionControlType value (as a plain string -- this module does
    not import the domain enum, mapper.py does the enum conversion)."""
    highway = first(tags.get("highway"))
    if highway == "traffic_signals":
        return "TRAFFIC_LIGHT"
    if highway == "stop":
        return "STOP_SIGN"
    if highway == "give_way":
        return "YIELD_SIGN"
    return "UNCONTROLLED"


@dataclass(frozen=True)
class NormalizedNode:
    osm_id: int
    lon: float
    lat: float
    control_type: str  # one of IntersectionControlType's values


@dataclass(frozen=True)
class NormalizedEdge:
    u: int
    v: int
    key: int
    osm_ids: tuple[int, ...]
    points: tuple[tuple[float, float], ...]  # (lon, lat), ordered u -> v
    name: str | None
    highway: str | None
    oneway: bool
    lane_count: int
    maxspeed_kmh: float | None
    source_lane_count: int | None = None
    width_m: float | None = None
    bridge: bool = False
    tunnel: bool = False
    level: int = 0
    # --- City Model Part 2A: lane data parsing --------------------------
    lane_count_quality: str = "FALLBACK"  # LaneCountQuality value
    lanes_forward_raw: int | None = None
    lanes_backward_raw: int | None = None
    lanes_both_ways_raw: int | None = None
    # One tuple of normalized `TurnLaneType` values per lane (index 0 =
    # leftmost lane in this edge's own direction), or `None` when unknown
    # -- see `parse_turn_lanes`.
    turn_lanes: tuple[tuple[str, ...], ...] | None = None
    # One normalized `LaneChangePermission` value (or `None`) per lane,
    # same ordering as `turn_lanes` -- see `parse_change_lanes`.
    change_lanes: tuple[str | None, ...] | None = None
    # One bool per lane (True = bus/PSV-designated), or `None` when
    # unknown -- see `parse_bus_lanes`.
    bus_lanes: tuple[bool, ...] | None = None
    # --- Road + Lane Representation V1: road-level lane-use fields ------
    # `ParkingLaneOrientation` values for the road's left/right edge
    # (independent of this edge's own travel direction -- see
    # `parse_parking_lanes`), `None` when not provided.
    parking_left: str | None = None
    parking_right: str | None = None
    # `CyclewayType` values for the road's left/right edge, `None` when
    # not provided -- see `parse_cycleways`.
    cycleway_left: str | None = None
    cycleway_right: str | None = None


@dataclass(frozen=True)
class NormalizedNetwork:
    nodes: tuple[NormalizedNode, ...] = field(default_factory=tuple)
    edges: tuple[NormalizedEdge, ...] = field(default_factory=tuple)
    warnings: tuple[str, ...] = field(default_factory=tuple)


class _GeometryLike(Protocol):
    coords: Any


def _edge_points(
    tags: dict[str, Any], u_point: tuple[float, float], v_point: tuple[float, float]
) -> tuple[tuple[float, float], ...]:
    geometry: _GeometryLike | None = tags.get("geometry")
    if geometry is not None and hasattr(geometry, "coords"):
        points = tuple((float(x), float(y)) for x, y in geometry.coords)
        if len(points) >= 2:
            return points
    return (u_point, v_point)


def extract_network(graph: Any, *, observed_only: bool = False) -> NormalizedNetwork:
    """Converts a fetched graph (networkx.MultiDiGraph, or anything with
    the same `.nodes()`/`.edges()` shape) into a NormalizedNetwork."""
    warnings: list[str] = []
    node_points: dict[int, tuple[float, float]] = {}
    nodes = []
    for node_id, tags in graph.nodes(data=True):
        lon, lat = float(tags["x"]), float(tags["y"])
        node_points[node_id] = (lon, lat)
        nodes.append(
            NormalizedNode(osm_id=node_id, lon=lon, lat=lat, control_type=parse_node_control(tags))
        )

    edges = []
    for u, v, key, tags in graph.edges(keys=True, data=True):
        if u not in node_points or v not in node_points:
            warnings.append(f"edge {u}->{v} (key {key}): endpoint missing from node set; skipped.")
            continue
        oneway = parse_oneway(tags)
        osm_ids = tags.get("osmid")
        osm_ids_tuple = tuple(osm_ids) if isinstance(osm_ids, list) else (osm_ids,)
        edge_label = f"way {osm_ids_tuple[0]} ({u}->{v})"
        points = _edge_points(tags, node_points[u], node_points[v])
        if len(set(points)) < 2:
            warnings.append(f"{edge_label}: zero-length geometry; skipped.")
            continue
        lane_result = parse_lane_count(tags, oneway=oneway, observed_only=observed_only)
        turn_lanes = parse_turn_lanes(
            tags,
            oneway=oneway,
            lane_count=lane_result.count,
            warnings=warnings,
            edge_label=edge_label,
        )
        change_lanes = parse_change_lanes(
            tags,
            oneway=oneway,
            lane_count=lane_result.count,
            warnings=warnings,
            edge_label=edge_label,
        )
        bus_lanes = parse_bus_lanes(
            tags,
            oneway=oneway,
            lane_count=lane_result.count,
            warnings=warnings,
            edge_label=edge_label,
        )
        parking_left, parking_right = parse_parking_lanes(tags)
        cycleway_left, cycleway_right = parse_cycleways(tags)
        edges.append(
            NormalizedEdge(
                u=u,
                v=v,
                key=key,
                osm_ids=osm_ids_tuple,
                points=points,
                name=first(tags.get("name")),
                highway=first(tags.get("highway")),
                oneway=oneway,
                lane_count=lane_result.count,
                maxspeed_kmh=parse_maxspeed_kmh(tags, warnings, edge_label=edge_label),
                source_lane_count=_parse_int(first(tags.get("lanes"))),
                width_m=parse_width_m(tags),
                bridge=parse_bridge(tags),
                tunnel=parse_tunnel(tags),
                level=parse_level(tags),
                lane_count_quality=lane_result.quality,
                lanes_forward_raw=lane_result.forward_raw,
                lanes_backward_raw=lane_result.backward_raw,
                lanes_both_ways_raw=lane_result.both_ways_raw,
                turn_lanes=turn_lanes,
                change_lanes=change_lanes,
                bus_lanes=bus_lanes,
                parking_left=parking_left,
                parking_right=parking_right,
                cycleway_left=cycleway_left,
                cycleway_right=cycleway_right,
            )
        )

    return NormalizedNetwork(nodes=tuple(nodes), edges=tuple(edges), warnings=tuple(warnings))
