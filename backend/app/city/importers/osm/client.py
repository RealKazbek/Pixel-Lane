"""The only module in Pixel Lane allowed to import osmnx.

Isolated on purpose (see AGENTS.md's dependency-isolation rule): osmnx is
an optional `backend[osm]` extra, never a core backend runtime dependency.
City Model, the Traffic Engine, and the frontend must never import this
module or osmnx directly.
"""

from pathlib import Path
from typing import Any

from app.city.importers.osm.errors import OsmFetchError

DEFAULT_NETWORK_TYPE = "drive"

# Local-only HTTP response cache (never committed, never a source of
# truth -- see backend/.gitignore). Avoids re-fetching Overpass data on
# every `make import-almaty` run once it's already cached once.
_CACHE_DIR = Path(__file__).resolve().parents[4] / ".osmnx_cache"


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
