# Built with a repo-root build context (see docker-compose.yml) because the
# backend depends on the sibling `simulation` package (Traffic Engine) --
# see pyproject.toml's `pixel-lane-simulation @ file:../simulation`.

FROM python:3.12-slim AS base

WORKDIR /app/backend
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Copied to the same relative path as in the repo so the `file:../simulation`
# dependency resolves inside the image exactly like it does on the host.
COPY simulation /app/simulation

COPY backend/pyproject.toml ./
COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/alembic.ini ./

RUN pip install --no-cache-dir .

RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
