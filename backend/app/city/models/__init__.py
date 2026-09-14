"""Import every City ORM model so they register on `Base.metadata`.

Alembic's autogenerate and any code that touches `Base.metadata` needs all
model modules imported at least once; this module is that single place.
"""

from app.city.models import associations  # noqa: F401
from app.city.models.bus_stop import BusStop  # noqa: F401
from app.city.models.city import City  # noqa: F401
from app.city.models.crosswalk import Crosswalk  # noqa: F401
from app.city.models.intersection import Intersection  # noqa: F401
from app.city.models.lane import Lane  # noqa: F401
from app.city.models.parking import ParkingZone  # noqa: F401
from app.city.models.road import Road  # noqa: F401
from app.city.models.traffic_demand import TrafficDemand  # noqa: F401
from app.city.models.traffic_light import Phase, SignalGroup, TrafficLight  # noqa: F401
from app.city.models.traffic_rule import TrafficRule  # noqa: F401

__all__ = [
    "City",
    "Road",
    "Lane",
    "Intersection",
    "TrafficLight",
    "SignalGroup",
    "Phase",
    "TrafficRule",
    "ParkingZone",
    "TrafficDemand",
    "BusStop",
    "Crosswalk",
]
