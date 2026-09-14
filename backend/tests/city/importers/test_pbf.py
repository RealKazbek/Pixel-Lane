"""Exercise real PBF reference completion without network or a country fixture."""

import pytest

from app.city.importers.osm.pbf import extract_drive_xml, is_drive_way


def test_drive_filter_excludes_private_service_and_pedestrian_ways():
    assert is_drive_way({"highway": "primary"})
    for tags in (
        {"highway": "footway"},
        {"highway": "service"},
        {"highway": "residential", "access": "private"},
        {"highway": "primary", "motor_vehicle": "no"},
    ):
        assert not is_drive_way(tags)


def test_pbf_keeps_signal_tags_and_outside_references(tmp_path):
    osmium = pytest.importorskip("osmium")
    from shapely.geometry import box

    source = tmp_path / "source.osm.pbf"
    output = tmp_path / "city.osm"
    with osmium.SimpleWriter(source) as writer:
        for node_id, location, tags in (
            (1, (76.9, 43.2), {"highway": "traffic_signals"}),
            (2, (76.91, 43.21), {}),
            (3, (78, 44), {}),
        ):
            writer.add_node(osmium.osm.mutable.Node(id=node_id, location=location, tags=tags))
        writer.add_way(
            osmium.osm.mutable.Way(
                id=10, nodes=[1, 2, 3], tags={"highway": "primary", "name": "Road"}
            )
        )
        writer.add_way(osmium.osm.mutable.Way(id=11, nodes=[1, 2], tags={"highway": "footway"}))
    result = extract_drive_xml(source, output, box(76.8, 43.1, 77, 43.3))
    assert result["selected_ways"] == 1
    seen = {}
    for obj in osmium.FileProcessor(output):
        seen[(obj.type_str(), obj.id)] = dict(obj.tags)
    assert seen[("n", 1)]["highway"] == "traffic_signals"
    assert ("n", 3) in seen  # reference outside polygon still complete
    assert ("w", 10) in seen
    assert ("w", 11) not in seen
