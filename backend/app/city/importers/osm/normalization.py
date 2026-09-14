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


def parse_lane_count(tags: dict[str, Any], *, oneway: bool, observed_only: bool = False) -> int:
    """Lane count for ONE directed edge (this edge's own direction only --
    see mapper.py for why each directed edge is one Pixel Lane Road).

    Preference order: an explicit per-direction tag, then a fair share of
    the generic `lanes` tag, then the documented fallback.
    """
    forward = tags.get("lanes:forward")
    backward = tags.get("lanes:backward")
    directional = backward if tags.get("reversed") is True else forward
    if not observed_only and directional is None:
        directional = backward
    if directional is not None:
        parsed = _parse_int(first(directional))
        if parsed is not None and parsed > 0:
            return parsed

    lanes = tags.get("lanes")
    if lanes is not None:
        parsed = _parse_int(first(lanes))
        if parsed is not None and parsed > 0:
            if oneway:
                return parsed
            # A total count does not tell us directional allocation.
            if not observed_only:
                return max(1, round(parsed / 2))

    return 0 if observed_only else DEFAULT_LANE_COUNT


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
                lane_count=parse_lane_count(tags, oneway=oneway, observed_only=observed_only),
                maxspeed_kmh=parse_maxspeed_kmh(tags, warnings, edge_label=edge_label),
                source_lane_count=_parse_int(first(tags.get("lanes"))),
                width_m=parse_width_m(tags),
                bridge=parse_bridge(tags),
                tunnel=parse_tunnel(tags),
                level=parse_level(tags),
            )
        )

    return NormalizedNetwork(nodes=tuple(nodes), edges=tuple(edges), warnings=tuple(warnings))
