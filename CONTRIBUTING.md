# Contributing to Pixel Lane

Read `AGENTS.md` first. It defines architecture, safety, resource, and AI-agent policy.
New contributors should also read [docs/developer-onboarding.md](docs/developer-onboarding.md) for setup and collaboration workflow.

Keep City Model data authoritative; do not put traffic logic in React, database rows in domain code, or external map/OSM/SUMO/hardware calls in core logic. PostgreSQL is the primary database; do not replace it with SQLite, JSON persistence, or in-memory repositories. Never commit or replace `.env`; update `.env.example` only for real configuration changes.

Every user-facing change ships complete `kk`/`ru`/`en` translations in the same change (`make frontend-check-i18n`) — see [docs/i18n.md](docs/i18n.md). Do not present a planned/unfinished feature as live or backed by real data.

Use focused conventional commits. Before declaring work complete: implement, run relevant checks, review `git diff` and `git status`, make logical commits, push, and verify remote state. Preserve unrelated work and do not force-push. Verify an isolated `TEST_DATABASE_URL` before backend pytest.

If you're using Claude Code, Codex, ChatGPT, or Gemini: `AGENTS.md` is the canonical policy for all of them (agent-specific files are entry points only), and [docs/ai-prompting.md](docs/ai-prompting.md) defines how to write a task prompt. AI output must be reviewed like any other contribution — it is not exempt from any rule above.
