from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette import status


def make_max_body_size_middleware(
    max_bytes: int,
) -> Callable[[Request, Callable[[Request], Awaitable[Response]]], Awaitable[Response]]:
    """Reject requests whose declared Content-Length exceeds `max_bytes`.

    A simple, explicit safeguard against oversized nested JSON payloads
    (see AGENTS.md payload-safety guidance) -- not a full quota system.
    """

    async def middleware(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        content_length = request.headers.get("content-length")
        if content_length is not None and content_length.isdigit():
            if int(content_length) > max_bytes:
                return Response(
                    content='{"detail":"Request body too large"}',
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    media_type="application/json",
                )
        return await call_next(request)

    return middleware
