"""Reusable example City payloads.

`four_way_intersection.json` is a compact, realistic example (one
signalized four-way intersection) meant to be reused by backend tests, the
future 2D editor, and simulation development -- not a test-only fixture.
"""

import json
from pathlib import Path
from typing import Any

_EXAMPLES_DIR = Path(__file__).parent


def load_four_way_intersection() -> dict[str, Any]:
    """Return the four-way-intersection example as a plain dict.

    The dict matches `app.city.schemas.city.CityCreate`'s shape and can be
    passed to `CityCreate.model_validate(...)`.
    """
    with (_EXAMPLES_DIR / "four_way_intersection.json").open() as f:
        result: dict[str, Any] = json.load(f)
        return result
