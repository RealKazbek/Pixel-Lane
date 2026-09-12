# Contributing to Pixel Lane

Read `AGENTS.md` first. It defines architecture, safety, resource, and AI-agent policy.

Keep City Model data authoritative; do not put traffic logic in React, database rows in domain code, or external map/OSM/SUMO/hardware calls in core logic. PostgreSQL is the primary database; do not replace it with SQLite, JSON persistence, or in-memory repositories. Never commit or replace `.env`; update `.env.example` only for real configuration changes.

Use focused conventional commits. Before declaring work complete: implement, run relevant checks, review `git diff` and `git status`, make logical commits, push, and verify remote state. Preserve unrelated work and do not force-push. Verify an isolated `TEST_DATABASE_URL` before backend pytest.
