# Contributing to Pixel Lane

Read `AGENTS.md` first. It defines architecture, safety, resource, and AI-agent policy.
New contributors should also read [docs/developer-onboarding.md](docs/developer-onboarding.md) for setup and collaboration workflow.

## Team workflow

Task planning and ownership live in Notion (Tasks/Epics/Team/Decisions in
the **Development Workspace**, linked from
[docs/development/project-management.md](docs/development/project-management.md));
implementation lives here. In short:

- Self-pick only tasks marked **Ready**; assign yourself before starting.
- One dedicated branch per task, named `feat|fix|docs|refactor/PL-XXX-short-description`.
- One focused task per branch/PR where practical.
- **No direct push to `main`** for anyone, including AI agents — every
  change lands through a reviewed Pull Request using
  `.github/pull_request_template.md`.
- A task must have clear acceptance criteria (see
  [docs/development/task-template.md](docs/development/task-template.md))
  before implementation starts — an under-specified task stays in Backlog.
- Maintainer (Kazbek) approval is required before merge.
- Temporary/external contributors get isolated, self-contained tasks with
  minimal required access — see project-management.md's "Contributor
  scope by type."
- An audit/research (sub)agent must not mutate repository state or Notion
  unless explicitly granted write permission for that task, and must never
  commit or push on a research-only task — see AGENTS.md §15.

Full lifecycle (`Backlog -> Ready -> In Progress -> Review -> Changes
Requested -> Approved -> Done`, plus `Blocked`) and the Notion/GitHub
canonical-ownership split:
[docs/development/project-management.md](docs/development/project-management.md).

Keep City Model data authoritative; do not put traffic logic in React, database rows in domain code, or external map/OSM/SUMO/hardware calls in core logic. PostgreSQL is the primary database; do not replace it with SQLite, JSON persistence, or in-memory repositories. Never commit or replace `.env`; update `.env.example` only for real configuration changes.

Every user-facing change ships complete `kk`/`ru`/`en` translations in the same change (`make frontend-check-i18n`) — see [docs/i18n.md](docs/i18n.md). Do not present a planned/unfinished feature as live or backed by real data.

Use focused conventional commits. Before declaring work complete: implement, run relevant checks, review `git diff` and `git status`, make logical commits, push, and verify remote state. Preserve unrelated work and do not force-push. Verify an isolated `TEST_DATABASE_URL` before backend pytest.

If you're using Claude Code, Codex, ChatGPT, or Gemini: `AGENTS.md` is the canonical policy for all of them (agent-specific files are entry points only), and [docs/ai-prompting.md](docs/ai-prompting.md) defines how to write a task prompt. AI output must be reviewed like any other contribution — it is not exempt from any rule above.
