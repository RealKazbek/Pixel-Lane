"""Traffic analysis service: load a City, run the Traffic Engine, return a
serializable result.

Routes stay thin and call only this module.
"""

from uuid import UUID

from pixel_lane_simulation.traffic.analysis.engine import analyze_city
from sqlalchemy.orm import Session

from app.city.services import city_service
from app.traffic.adapter import to_engine_city_input
from app.traffic.schemas import TrafficAnalysisResponse


def analyze_city_traffic(db: Session, city_id: UUID) -> TrafficAnalysisResponse | None:
    """Returns None if the city does not exist (the route maps that to 404)."""
    city = city_service.get_city(db, city_id)
    if city is None:
        return None

    engine_input = to_engine_city_input(city)
    result = analyze_city(engine_input)
    return TrafficAnalysisResponse.model_validate(result, from_attributes=True)
