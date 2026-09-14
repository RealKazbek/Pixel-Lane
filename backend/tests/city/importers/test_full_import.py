"""Full-import invariants, plus atomic replacement against isolated PostGIS."""

from uuid import uuid4

import pytest
from sqlalchemy import text

from app.city.importers.osm.mapper import map_network_to_city
from app.city.importers.osm.normalization import (
    NormalizedEdge,
    NormalizedNetwork,
    NormalizedNode,
    parse_lane_count,
)
from app.city.schemas.import_city import CityImport
from app.city.services import city_service
from tests.conftest import requires_postgres


def payload(city_id=None):
    network = NormalizedNetwork(
        nodes=(
            NormalizedNode(1, 76.9, 43.2, "TRAFFIC_LIGHT"),
            NormalizedNode(2, 76.91, 43.21, "UNCONTROLLED"),
        ),
        edges=(
            NormalizedEdge(
                1,
                2,
                0,
                (123,),
                ((76.9, 43.2), (76.91, 43.21)),
                "Real road",
                "primary",
                True,
                0,
                None,
            ),
        ),
    )
    return map_network_to_city(
        network, city_id=city_id or uuid4(), city_name="Test", description=None, full_import=True
    ).city


def test_full_mapping_does_not_fabricate_unknown_data():
    city = payload()
    assert isinstance(city, CityImport)
    assert city.roads[0].default_speed_limit_kmh is None
    assert city.roads[0].lanes == []
    assert city.roads[0].source_id == "osm:way:123"
    assert city.roads[0].one_way is True
    assert city.traffic_lights[0].phases == []
    assert city.traffic_lights[0].signal_groups == []
    assert city_service.validate_city_payload(city).valid


def test_directional_lanes_follow_reverse_edge():
    tags = {"lanes:forward": "3", "lanes:backward": "1", "reversed": True}
    assert parse_lane_count(tags, oneway=False, observed_only=True).count == 1
    assert parse_lane_count({"lanes": "3"}, oneway=False, observed_only=True).count == 0


@requires_postgres
def test_replacement_is_idempotent_and_spatial(db_session):
    city = payload()
    city_service.replace_imported_city(db_session, city)
    city_service.replace_imported_city(db_session, city)
    assert db_session.scalar(text("SELECT count(*) FROM cities")) == 1
    assert db_session.scalar(text("SELECT count(*) FROM roads")) == 1
    assert db_session.scalar(text("SELECT ST_SRID(geom) FROM roads")) == 4326
    assert db_session.scalar(text("SELECT ST_IsValid(geom) FROM roads"))


@requires_postgres
def test_failure_during_replacement_rolls_back_old_city(db_session):
    city = payload()
    city_service.replace_imported_city(db_session, city)
    broken = city.model_copy(deep=True)
    broken.name = "Replacement"
    broken.roads[0].geometry.points[1] = broken.roads[0].geometry.points[0]
    with pytest.raises(ValueError, match="invalid spatial"):
        city_service.replace_imported_city(db_session, broken)
    assert city_service.get_city_metadata(db_session, city.id).name == "Test"
    assert db_session.scalar(text("SELECT ST_IsValid(geom) FROM roads"))


@requires_postgres
def test_metadata_details_and_zoom_queries(client, db_session):
    city = payload()
    city_service.replace_imported_city(db_session, city)
    root = f"/api/v1/cities/{city.id}"
    metadata = client.get(root + "/metadata").json()
    assert metadata["bounds"] == [76.9, 43.2, 76.91, 43.21]
    assert metadata["road_count"] == 1
    assert "roads" not in metadata
    road_id = city.roads[0].id
    assert client.get(root + f"/roads/{road_id}").json()["source_id"] == "osm:way:123"
    assert client.get(f"/api/v1/cities/{uuid4()}/roads/{road_id}").status_code == 404
    assert len(client.get(root + "/roads?bbox=76,43,77,44&zoom=10").json()) == 1
    assert client.get(root + "/roads?bbox=76,43,77,44&zoom=nan").status_code == 422
