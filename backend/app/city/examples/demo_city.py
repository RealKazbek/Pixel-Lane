"""Canonical, intentionally empty City Model editor city.

The editor uses this stable identity so saved work survives reloads.  The
legacy renderer showcase is kept separately as an explicit test/example
fixture and is never imported by the application resolver.
"""

from uuid import NAMESPACE_DNS, UUID, uuid5

_NAMESPACE = uuid5(NAMESPACE_DNS, "pixel-lane.demo-city")

DEMO_CITY_ID: UUID = uuid5(_NAMESPACE, "city")
DEMO_CITY_NAME = "Demo City"
DEMO_CITY_DESCRIPTION = "Pixel Lane editor workspace."
