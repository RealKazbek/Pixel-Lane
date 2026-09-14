"""The only module in Pixel Lane allowed to import osmnx.

Isolated on purpose (see AGENTS.md's dependency-isolation rule): osmnx is
an optional `backend[osm]` extra, never a core backend runtime dependency.
City Model, the Traffic Engine, and the frontend must never import this
module or osmnx directly.
"""

import json
import time
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

from app.city.importers.osm.errors import OsmFetchError

DEFAULT_NETWORK_TYPE = "drive"

# Local-only HTTP response cache (never committed, never a source of
# truth -- see backend/.gitignore). Avoids re-fetching Overpass data on
# every `make import-almaty` run once it's already cached once.
_CACHE_DIR = Path(__file__).resolve().parents[4] / ".osmnx_cache"


def fetch_almaty_network(
    boundary_file: Path | None = None,
    *,
    provider: str = "primary",
    cache_dir: Path | None = None,
    pbf_file: Path | None = None,
) -> tuple[Any, dict]:
    """Join cached <=25 km² requests before simplifying the full city graph."""
    import osmnx as ox
    from requests.exceptions import RequestException
    from shapely.geometry import shape

    ox.settings.use_cache = True
    ox.settings.cache_folder = str(cache_dir or _CACHE_DIR)
    ox.settings.max_query_area_size = 25_000_000
    ox.settings.requests_timeout = 120
    ox.settings.overpass_url = {
        "primary": "https://overpass-api.de/api",
        "mirror": "https://overpass.private.coffee/api",
    }[provider]
    # The mirror reports "Rate limit: 0" (no slot scheduling). OSMnx's
    # slot parser otherwise recursively waits on its running-query list.
    ox.settings.overpass_rate_limit = provider == "primary"
    ox.settings.log_console = True
    ox.settings.useful_tags_way = list(
        dict.fromkeys(
            [
                *ox.settings.useful_tags_way,
                "lanes:forward",
                "lanes:backward",
            ]
        )
    )
    if boundary_file is None:
        boundary = ox.geocode_to_gdf("R2465058", by_osmid=True)
        polygon = boundary.geometry.iloc[0]
    else:
        with boundary_file.open() as source:
            record = json.load(source)
        matches = (
            [r for r in record if r.get("osm_type") == "relation" and r.get("osm_id") == 2465058]
            if isinstance(record, list)
            else []
        )
        if len(matches) != 1:
            raise OsmFetchError("Boundary must identify Almaty administrative relation 2465058.")
        polygon = shape(matches[0]["geojson"])
    if polygon.geom_type not in {"Polygon", "MultiPolygon"} or not polygon.is_valid:
        raise OsmFetchError("Almaty boundary is not a valid polygon.")
    west, south, east, north = polygon.bounds
    if not (76 < west < east < 78 and 42 < south < north < 44):
        raise OsmFetchError("Boundary is outside the expected Almaty region.")
    source_metadata = {}
    if pbf_file is not None:
        from app.city.importers.osm.pbf import extract_drive_xml

        with TemporaryDirectory(prefix="pixel-lane-almaty-") as directory:
            xml = Path(directory) / "roads.osm"
            source_metadata = extract_drive_xml(pbf_file, xml, polygon)
            graph = ox.graph_from_xml(xml, simplify=False, retain_all=True)
        graph = ox.truncate.truncate_graph_polygon(graph, polygon, truncate_by_edge=False)
    else:
        for attempt in range(3):
            try:
                graph = ox.graph_from_polygon(
                    polygon,
                    network_type="drive",
                    simplify=False,
                    retain_all=True,
                    truncate_by_edge=False,
                )
                break
            except RequestException as exc:
                if attempt == 2:
                    raise OsmFetchError(
                        "Acquisition failed after three attempts; rerun to resume cached chunks."
                    ) from exc
                time.sleep(5 * (attempt + 1))
    graph = ox.simplification.simplify_graph(
        graph,
        node_attrs_include=["highway"],
        edge_attrs_differ=[
            "osmid",
            "name",
            "highway",
            "lanes",
            "lanes:forward",
            "lanes:backward",
            "maxspeed",
            "oneway",
        ],
        remove_rings=False,
    )
    return graph, {"relation": 2465058, "bounds": [west, south, east, north], **source_metadata}


def fetch_drive_network(center_lat: float, center_lon: float, radius_m: float) -> Any:
    """Fetches the drivable road network within `radius_m` meters of
    (center_lat, center_lon) from OpenStreetMap (via Overpass), simplified
    to topology nodes (intersections/dead-ends) and edges (road segments).

    Returns a `networkx.MultiDiGraph`. Raises `OsmFetchError` with a clear,
    user-facing message on any network/Overpass failure -- callers should
    not need to know this uses osmnx.
    """
    try:
        import osmnx as ox
    except ImportError as exc:
        raise OsmFetchError(
            "The 'osmnx' package is not installed. Install the optional OSM "
            "import extra first: pip install -e '.[osm]' (from backend/)."
        ) from exc

    ox.settings.use_cache = True
    ox.settings.cache_folder = str(_CACHE_DIR)

    try:
        return ox.graph_from_point(
            (center_lat, center_lon),
            dist=radius_m,
            network_type=DEFAULT_NETWORK_TYPE,
            simplify=True,
        )
    except Exception as exc:  # noqa: BLE001 -- osmnx/Overpass can raise many exception types
        raise OsmFetchError(
            "Failed to fetch OpenStreetMap data. Check your internet connection or retry later."
        ) from exc
