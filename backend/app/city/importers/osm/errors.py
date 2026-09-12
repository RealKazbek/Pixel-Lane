class OsmImportError(Exception):
    """Base class for OSM import errors."""


class OsmFetchError(OsmImportError):
    """Raised when OpenStreetMap data could not be fetched (network,
    Overpass timeout/unavailability, etc.). Never wraps a raw traceback
    for the end user -- see cli.py."""


class OsmMappingValidationError(OsmImportError):
    """Raised when the mapped City payload fails Pixel Lane's own
    validation -- would indicate a bug in the mapper, not bad OSM data."""

    def __init__(self, issues: list[str]) -> None:
        self.issues = issues
        super().__init__(f"Mapped city failed validation with {len(issues)} issue(s)")
