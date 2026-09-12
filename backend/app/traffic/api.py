from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pixel_lane_simulation.traffic.errors import TrafficEngineError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.traffic.schemas import TrafficAnalysisResponse
from app.traffic.service import analyze_city_traffic

router = APIRouter(prefix="/cities", tags=["traffic"])


@router.post("/{city_id}/traffic-analysis", response_model=TrafficAnalysisResponse)
def post_traffic_analysis(city_id: UUID, db: Session = Depends(get_db)) -> TrafficAnalysisResponse:
    try:
        result = analyze_city_traffic(db, city_id)
    except TrafficEngineError as exc:
        # The City Model is validated on creation, but the engine still
        # fails clearly on network topology it cannot resolve rather than
        # silently ignoring it (see docs/architecture.md).
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"City network topology is invalid for traffic analysis: {exc}",
        ) from exc

    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    return result
