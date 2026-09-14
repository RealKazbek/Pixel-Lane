"""Stream regional PBF into a reference-complete city extract, not a country graph."""

from collections.abc import Mapping
from pathlib import Path
from typing import Any

# OSMnx drive-preset exclusions, shared semantics for both acquisition paths.
_EXCLUDED_HIGHWAYS = set(
    "abandoned bridleway bus_guideway construction corridor cycleway elevator escalator "
    "footway no path pedestrian planned platform proposed raceway razed rest_area "
    "service services steps track".split()
)
_EXCLUDED_SERVICES = {
    "alley",
    "driveway",
    "emergency_access",
    "parking",
    "parking_aisle",
    "private",
}


def is_drive_way(tags: Mapping[str, str]) -> bool:
    return bool(tags.get("highway")) and (
        tags.get("highway") not in _EXCLUDED_HIGHWAYS
        and tags.get("area") != "yes"
        and tags.get("access") != "private"
        and tags.get("motor_vehicle") != "no"
        and tags.get("motorcar") != "no"
        and tags.get("service") not in _EXCLUDED_SERVICES
    )


def extract_drive_xml(source: Path, output: Path, polygon: Any) -> dict[str, Any]:
    import osmium
    from shapely.geometry import Point
    from shapely.prepared import prep

    west, south, east, north = polygon.bounds
    boundary = prep(polygon)
    inside: set[int] = set()
    for node in osmium.FileProcessor(source, entities=osmium.osm.NODE):
        assert isinstance(node, osmium.osm.Node)
        lon, lat = node.location.lon, node.location.lat
        if west <= lon <= east and south <= lat <= north and boundary.covers(Point(lon, lat)):
            inside.add(node.id)
    if not inside:
        raise ValueError("PBF contains no nodes inside the Almaty boundary")
    ways = 0
    # Referenced signal nodes must retain their tags.
    with osmium.BackReferenceWriter(output, source, remove_tags=False) as writer:
        for way in osmium.FileProcessor(source, entities=osmium.osm.WAY).with_filter(
            osmium.filter.KeyFilter("highway")
        ):
            assert isinstance(way, osmium.osm.Way)
            if is_drive_way(dict(way.tags)) and any(node.ref in inside for node in way.nodes):
                writer.add_way(way)
                ways += 1
    if ways == 0:
        raise ValueError("PBF contains no drivable ways inside the Almaty boundary")
    header = osmium.FileProcessor(source).header
    return {
        "pbf_file": source.name,
        "source_timestamp": header.get("osmosis_replication_timestamp"),
        "selected_ways": ways,
        "inside_nodes": len(inside),
    }
