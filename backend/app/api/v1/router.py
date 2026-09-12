from fastapi import APIRouter

from app.api.v1 import health
from app.city.api.city_router import router as city_router
from app.traffic.api import router as traffic_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(city_router)
api_router.include_router(traffic_router)
