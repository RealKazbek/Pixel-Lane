import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("pixel_lane.errors")


def register_exception_handlers(app: FastAPI) -> None:
    """Ensure unhandled errors return a safe, generic response.

    Internal details are logged server-side only; clients never see stack
    traces or exception internals, regardless of environment.
    """

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error for %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )
