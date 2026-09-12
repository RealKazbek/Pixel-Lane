"""Reusable example City payloads.

`four_way_intersection.json` is a compact, realistic example (one
signalized four-way intersection) meant to be reused by backend tests, the
future 2D editor, and simulation development -- not a test-only fixture.

`two_intersection_corridor.json` is a separate, minimal demo city for
manually exercising Traffic Analysis routing/congestion: the four-way
example has only one intersection and movement-only demand, so it can
never produce a routed result (see its own description field). This one
is purely a developer/demo convenience -- it is loaded on request via
`load_two_intersection_corridor()`, never embedded in frontend code.
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


def load_two_intersection_corridor() -> dict[str, Any]:
    """Return the two-intersection high-demand corridor demo city.

    Also matches `CityCreate`'s shape. Unlike the four-way example, this
    city has a routable demand (source != destination), so running Traffic
    Analysis on it produces real routes, congestion, and bottlenecks.
    """
    with (_EXAMPLES_DIR / "two_intersection_corridor.json").open() as f:
        result: dict[str, Any] = json.load(f)
        return result
