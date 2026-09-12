"""Centralized, documented fallback assumptions for the OSM importer.

None of these are real traffic-engineering facts about Almaty -- they are
sane defaults used only when OpenStreetMap doesn't supply the real value.
"""

# Used when an OSM way has no usable speed data at all.
DEFAULT_SPEED_LIMIT_KMH = 50.0

# Used when an OSM way/edge has no lane-count information at all. Each
# OSM directed edge becomes one Pixel Lane Road with lanes only in that
# edge's own direction (see mapper.py) -- so both a one-way road and a
# single direction of a two-way road fall back to 1 lane.
DEFAULT_LANE_COUNT = 1

# Every imported lane gets this movement set -- OSM turn-lane/turn
# restriction data is not parsed in v1, so no lane is claimed to be
# exclusively for a specific movement.
DEFAULT_ALLOWED_MOVEMENTS = ("STRAIGHT",)

# A synthetic, explicitly non-real single-phase "always green" plan for
# every imported signalized intersection -- OSM does not provide real
# signal-timing data. See mapper.py's docstring.
SYNTHETIC_PHASE_DURATION_SECONDS = 30
SYNTHETIC_PHASE_NAME = "Synthetic all-green (not real timing data)"
SYNTHETIC_SIGNAL_GROUP_NAME = "All approaches (synthetic)"

# OSM highway=* -> Pixel Lane RoadType. Anything not listed falls back to
# RESIDENTIAL, the most common urban road type.
HIGHWAY_TO_ROAD_TYPE = {
    "motorway": "HIGHWAY",
    "motorway_link": "HIGHWAY",
    "trunk": "HIGHWAY",
    "trunk_link": "HIGHWAY",
    "primary": "ARTERIAL",
    "primary_link": "ARTERIAL",
    "secondary": "ARTERIAL",
    "secondary_link": "ARTERIAL",
    "tertiary": "COLLECTOR",
    "tertiary_link": "COLLECTOR",
    "unclassified": "COLLECTOR",
    "residential": "RESIDENTIAL",
    "living_street": "RESIDENTIAL",
    "service": "SERVICE",
}
FALLBACK_ROAD_TYPE = "RESIDENTIAL"

FALLBACK_ROAD_NAME = "Unnamed road"

# Import namespace for deterministic UUID5 generation -- any fixed,
# never-changed string works; changing it would change every imported id.
IMPORT_UUID_NAMESPACE = "pixel-lane.osm-import"
