"""API contract for bbox-scoped spatial queries.

See docs/city-model.md's spatial schema section: this is the only schema
module that knows about "bbox" as a concept -- `domain/` and the rest of
`schemas/` stay geometry-agnostic beyond the generic `Point`/`Polyline`.
"""

from pydantic import BaseModel, model_validator

# WGS84 ranges. A bbox outside these isn't a real place on Earth, so it's
# rejected at the API boundary rather than silently producing an empty
# (or, worse, wrapped-around) result.
_MIN_LON, _MAX_LON = -180.0, 180.0
_MIN_LAT, _MAX_LAT = -90.0, 90.0


class BBox(BaseModel):
    """A viewport bounding box in WGS84 degrees."""

    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float

    @model_validator(mode="after")
    def _validate_bounds(self) -> "BBox":
        for value, lo, hi, label in (
            (self.min_lon, _MIN_LON, _MAX_LON, "min_lon"),
            (self.max_lon, _MIN_LON, _MAX_LON, "max_lon"),
            (self.min_lat, _MIN_LAT, _MAX_LAT, "min_lat"),
            (self.max_lat, _MIN_LAT, _MAX_LAT, "max_lat"),
        ):
            if not (lo <= value <= hi):
                raise ValueError(f"{label}={value} is outside the valid range [{lo}, {hi}]")
        if self.min_lon >= self.max_lon:
            raise ValueError(f"min_lon ({self.min_lon}) must be less than max_lon ({self.max_lon})")
        if self.min_lat >= self.max_lat:
            raise ValueError(f"min_lat ({self.min_lat}) must be less than max_lat ({self.max_lat})")
        return self

    @classmethod
    def parse_query_param(cls, raw: str) -> "BBox":
        """Parses the `?bbox=minLon,minLat,maxLon,maxLat` query string
        format. Raises `ValueError` (caught by the route as a 422) on any
        malformed input -- wrong item count, non-numeric values, NaN/inf,
        or bounds rejected by `_validate_bounds`."""
        parts = raw.split(",")
        if len(parts) != 4:
            raise ValueError(
                "bbox must have exactly 4 comma-separated values: minLon,minLat,maxLon,maxLat"
            )
        try:
            values = [float(p) for p in parts]
        except ValueError as exc:
            raise ValueError("bbox values must be numbers") from exc
        if not all(v == v and abs(v) != float("inf") for v in values):  # noqa: PLR0124 (NaN check)
            raise ValueError("bbox values must be finite numbers")
        min_lon, min_lat, max_lon, max_lat = values
        return cls(min_lon=min_lon, min_lat=min_lat, max_lon=max_lon, max_lat=max_lat)
