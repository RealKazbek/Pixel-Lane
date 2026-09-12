"""Fixtures for City Model tests.

Per repository policy, database-backed tests run against real PostgreSQL --
never a substitute like SQLite. If PostgreSQL is not reachable (e.g. Docker
isn't running), the affected tests are skipped with a clear reason instead
of silently passing against different behavior.
"""

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.city import models as _city_models  # noqa: F401  (registers ORM models)
from app.db.base import Base
from app.db.session import get_db
from app.main import app

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://pixel_lane:change-me@localhost:5432/pixel_lane",
)


def _postgres_available() -> bool:
    try:
        engine = create_engine(TEST_DATABASE_URL)
        with engine.connect():
            pass
        engine.dispose()
        return True
    except Exception:
        return False


POSTGRES_AVAILABLE = _postgres_available()

requires_postgres = pytest.mark.skipif(
    not POSTGRES_AVAILABLE,
    reason=(
        "PostgreSQL is not reachable at TEST_DATABASE_URL/DATABASE_URL. "
        "Start it with `docker compose up -d postgres` (and run "
        "`alembic upgrade head`) and re-run -- these tests intentionally do "
        "not fall back to SQLite."
    ),
)


@pytest.fixture(scope="session")
def engine():
    if not POSTGRES_AVAILABLE:
        pytest.skip("PostgreSQL not available")
    eng = create_engine(TEST_DATABASE_URL)
    # Convenience net for a developer who hasn't run migrations yet;
    # create_all is a no-op for tables that already exist.
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db_session(engine):
    session_factory = sessionmaker(bind=engine)
    session: Session = session_factory()
    try:
        yield session
    finally:
        session.close()
        with engine.begin() as conn:
            conn.execute(text("TRUNCATE TABLE cities CASCADE"))


@pytest.fixture()
def client(db_session: Session):
    def _get_db_override():
        yield db_session

    app.dependency_overrides[get_db] = _get_db_override
    try:
        # raise_server_exceptions=False: an unhandled 500 (e.g. a DB
        # constraint violation) should come back as a real HTTP response
        # like a real client would see, not re-raise into the test.
        with TestClient(app, raise_server_exceptions=False) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
