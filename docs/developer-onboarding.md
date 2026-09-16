# Developer onboarding

**Start here if you just got access to Pixel Lane** — this is the one
obvious entry point for a new developer or AI agent, human or otherwise.
This page is a guided path through the existing docs, plus the
collaboration rules that don't live anywhere else yet. It intentionally
does not repeat what those docs already say — follow the links.

Read it in order the first time:

1. [What Pixel Lane is](#1-what-pixel-lane-is)
2. [Architecture and repository layout](#2-architecture-and-repository-layout)
3. [Local setup](#3-local-setup)
4. [Database and migrations](#4-database-and-migrations)
5. [Internationalization](#5-internationalization) / [Theming](#5b-theming)
6. [Testing and validation](#6-testing-and-validation)
7. [Where tasks live and the Notion workspace](#7-where-tasks-live-and-the-notion-workspace)
8. [Git and collaboration workflow](#8-git-and-collaboration-workflow)
9. [AI-assisted development](#9-ai-assisted-development)
10. [Common pitfalls](#10-common-pitfalls)
11. [Definition of Done](#11-definition-of-done)
12. [Where to read next](#12-where-to-read-next)

## 1. What Pixel Lane is

An early-stage smart-city / urban traffic-management platform: a persisted
City Model (roads, lanes, intersections, traffic lights, rules, parking,
demand) in PostgreSQL, a framework-independent Traffic Engine for static
analysis, a real bounded OpenStreetMap import for central Almaty, and a
MapLibre map/editor. See the root [README](../README.md) for the current
status table (implemented / pending / planned) and
[docs/roadmap.md](roadmap.md) for what's next vs. future. Don't trust
verbal descriptions of "what Pixel Lane will do" over these two documents —
they're kept accurate as the source of truth.

Pixel Lane's long-term target is a transport digital-twin platform for
government/city administration — see [docs/product/vision.md](product/vision.md)
for the North Star, problem statement, and use cases, and its **Scope**
and **Non-goals** sections in particular for what is explicitly not being
built yet (city-wide autonomous control, an LLM as the control decision-
maker, etc.). Building ahead of the current roadmap phase is out of scope
even if it matches the long-term vision.

## 2. Architecture and repository layout

Read [docs/architecture.md](architecture.md) (subsystem table, dependency
direction, what depends on what) and [docs/project-structure.md](project-structure.md)
(directory ownership) before writing code in an area you haven't touched.
Key boundaries, already enforced in the current code:

- Domain/business logic (`backend/app/city/domain`, `backend/app/city/validators`,
  `simulation/pixel_lane_simulation/traffic`) never depends on FastAPI,
  SQLAlchemy, or React.
- FastAPI routes (`backend/app/**/api/`) stay thin — they call services,
  never touch SQLAlchemy or business rules directly.
- The frontend's `city-viewer` feature only calls the REST API; it holds no
  City Model or Traffic Engine domain logic itself (see
  `frontend/src/features/city-viewer/README.md`).

**Where do I change X?**

| I want to... | Look here |
| --- | --- |
| Change UI/map behavior | `frontend/src/features/city-viewer/`, `frontend/src/app/` |
| Add a REST endpoint | `backend/app/<domain>/api/` + its `services/` |
| Change the DB schema | `backend/app/city/models/` + `make migration msg="..."` |
| Change traffic analysis logic | `simulation/pixel_lane_simulation/traffic/` |
| Add/change a translation | `frontend/messages/{kk,ru,en}/*.json` (see [i18n](#5-internationalization)) |
| Add a theme-aware style | `frontend/src/app/globals.css`'s semantic tokens (see [theming](#5b-theming)) |
| Change AI-agent policy | `AGENTS.md` (canonical — see [docs/ai-development.md](ai-development.md)) |
| Add an AI task checklist | `.agents/skills/` |
| Change the Almaty import | `backend/app/city/importers/osm/` (see [docs/osm-import.md](osm-import.md)) |

## 3. Local setup

Follow the root [README's Quick start](../README.md#quick-start) and
[docs/development.md](development.md) — they're the single source of truth
for setup/run/check commands; this page won't duplicate them. Short version:
`cp .env.example .env`, then `make start`. `make start` always rebuilds
(`docker compose up -d --build`) so you never run stale baked-in source by
accident — there is no hot-reload inside the Docker images. For frontend-only
work, skip Docker entirely with `make frontend-dev`.

## 4. Database and migrations

PostgreSQL is the only supported database — never substitute SQLite, even
locally; the ORM models and some queries rely on real Postgres semantics,
and tests are expected to run against it too (see
[docs/testing.md](testing.md)). Schema changes always go through Alembic:

```
make migration msg="add crossing table"   # create a new migration
make migrate                              # apply pending migrations
```

Never hand-edit the schema out of band. PostGIS has not been introduced yet
(see `docs/architecture.md`'s "Planned: PostGIS" section for the documented
trigger condition) — don't assume spatial query support exists.

## 5. Internationalization

Every user-facing string ships in `kk`, `ru`, and `en` in the same change —
see [docs/i18n.md](i18n.md) for where translation files live, naming
conventions, and how to add a key. `npm run check:i18n`
(`make frontend-check-i18n`) fails the build if a key exists in only one or
two locales. It does **not** catch a string hardcoded directly in JSX
instead of going through the translation system — that's caught only by
review, so check it yourself before opening a PR.

## 5b. Theming

Every user-facing frontend change must work in Light, Dark, and System
appearance modes using the existing semantic tokens — see
[docs/theming.md](theming.md) for the token list, the theme-system
architecture (`next-themes`, `data-theme` attribute), and how to add a
theme-aware component. Unlike i18n, there is no automated key-parity
check for themes — verify by code review and, where a browser is
available, by actually toggling Light/Dark before considering a UI change
done.

## 6. Testing and validation

Run the smallest relevant check while iterating, then the fuller set before
you consider something done:

```
make frontend-lint frontend-typecheck frontend-test frontend-build frontend-check-i18n
make backend-lint backend-typecheck backend-test
make simulation-test
make check-agents   # instruction-file integrity, if you touched AGENTS.md/CLAUDE.md/etc.
```

There is currently no CI pipeline — these checks are not enforced
automatically on push or PR. Running them yourself before pushing is the
only thing that catches a regression. Read
[docs/testing.md](testing.md) before running backend `pytest` locally: it
must run against an isolated `TEST_DATABASE_URL`, never the shared
development database (a wrong setup can truncate your local demo city).

## 7. Where tasks live and the Notion workspace

Task tracking, ownership, epics, and product decisions live in Notion, not
GitHub Issues — see
[docs/development/project-management.md](development/project-management.md)
for the full Notion ↔ GitHub source-of-truth split.

1. **Connect once (optional, recommended)**: if your AI agent (Claude Code,
   Codex, Gemini CLI, or another compatible agent — Claude is not
   mandatory) supports MCP and you want it to retrieve tasks directly,
   follow [docs/development/notion-mcp.md](development/notion-mcp.md) to
   add the official Notion MCP server and authorize it — a one-time setup,
   not something you redo per task. **This is not required to contribute.**
   If you skip it, or your agent doesn't support it yet, just paste the
   task's fields into your prompt instead (see
   [docs/development/notion-mcp.md](development/notion-mcp.md#no-mcp-fallback)
   and [docs/ai-prompting.md](ai-prompting.md)'s Form B) — the workflow
   below is identical either way, and an agent must never invent missing
   task details rather than asking for them.
2. **Open the workspace**: [Pixel Lane — Project Guide](https://app.notion.com/p/3dc56325f84081c79e59ece0a7be12d4)
   → **Development Workspace** → **Tasks**.
3. **Self-pick only `Ready` tasks.** A task in `Backlog` isn't ready to be
   picked — its acceptance criteria aren't settled yet.
4. **Read the entire task** before starting, specifically its Goal, Module,
   Acceptance Criteria, and Dependencies (see
   [task-template.md](development/task-template.md) for what each field
   means).
5. **Assign yourself** in the task's `Assignee` field; move `Status` to
   `In Progress`.
6. Create your branch, implement, validate, push, open the PR, and move the
   task through `Review` → (`Changes Requested` if needed) → `Approved` →
   `Done` — the full mechanics are in
   [project-management.md](development/project-management.md), summarized
   again in §8 below.
7. **`Blocked`** is a separate status for a task stuck on something outside
   your control (an external dependency, a decision pending from the
   maintainer, etc.) — move it there and say why in `Notes` rather than
   leaving it silently stalled in `In Progress`.
8. **Do not silently expand a task's scope.** If you discover unrelated
   work that's genuinely needed, report it and propose a separate task
   (Backlog, with its own acceptance criteria) — don't fold it into the
   task you're already on.

## 8. Git and collaboration workflow

The process and Notion/GitHub canonical split are documented once, in
[docs/development/project-management.md](development/project-management.md)
— read that before opening your first PR. Short version: self-pick a
`Ready` task (§7 above), branch as
`feat|fix|docs|refactor/PL-XXX-short-description`, open a PR against `main`
using `.github/pull_request_template.md`, get maintainer review. **No one
pushes directly to `main`.**

`main` has an active branch-protection ruleset enforcing this: a Pull
Request is required before merging, conversation resolution is required,
only squash merges are allowed, force pushes are blocked, and branch
deletion is restricted. Required approvals are currently set to 0, and
status checks aren't required yet since no CI pipeline exists (see the
`Developer Platform / CI` epic in Notion) — so tooling blocks a direct
push or an unreviewed merge, but doesn't yet block a merge on failing
checks. Run the checks in §6 yourself until that changes.

Git mechanics not covered by the workflow doc:

- **Before starting work**, pull the latest `main` and check `git status` —
  don't build on top of stale state, and don't overwrite another
  developer's or agent's uncommitted work if you find any (stash it and
  ask, don't discard it).
- **Commit style**: small, focused Conventional Commits (`feat:`, `fix:`,
  `refactor:`, `docs:`, `test:`, `chore:`) — never `update`/`fix stuff`.
  Split unrelated changes into separate commits.
- **Before pushing**: review your own `git diff`, run the relevant checks
  from §6, confirm no `.env`, secrets, or generated/local files are staged.
- **Migrations in team development**: pull before generating a new
  migration so you branch off the latest schema; if two migrations are
  created against the same revision, regenerate yours on top of `main`
  rather than editing history.
- **Conflicts**: resolve them by re-reading both sides' intent, not by
  blindly taking "ours"/"theirs" — for a schema or City Model conflict,
  re-run `make migrate` after resolving to confirm the result is valid.
- Since there's no CI yet, treat "I ran the checks locally and they passed"
  as a real commitment, not a formality.

## 9. AI-assisted development

You may use Claude Code, Codex, Gemini CLI, ChatGPT, or another compatible
coding agent on this repository — **none of them is mandatory or the
"default" one.** `AGENTS.md` is the canonical policy for all of them —
agent-specific files (`CLAUDE.md`, `GEMINI.md`) are thin entry points, not
separate rules. See [docs/ai-development.md](ai-development.md) for
exactly what each agent discovers (including the required
pre-implementation startup protocol and an agent capability matrix) and
[docs/ai-prompting.md](ai-prompting.md) for how to write a good task
prompt, including both standard forms: handing an agent a Notion Task ID
directly when it has MCP access (Form A), or pasting the task's fields
when it doesn't (Form B).

**What's actually required, regardless of agent:** repository access,
`AGENTS.md` compliance, access to the task's content (via Notion MCP or
pasted fields), the branch/PR workflow (§8), and running the relevant
validation (§6). **Notion MCP is optional but recommended** — see
[docs/development/notion-mcp.md](development/notion-mcp.md). If you don't
configure it, or your agent doesn't support it, you can still work by
copying the assigned task's fields into your prompt; nothing about
contributing to Pixel Lane requires MCP or any specific agent.

Ground rules regardless of which agent you use:

- It must audit the current implementation before changing it — don't let
  it assume a feature exists, is missing, or is broken without checking.
- It must never invent implementation status: a planned/unfinished feature
  stays labeled as such (the app already does this consistently — see any
  "Planned"/"In development" badge in `frontend/src/app/[locale]/app/`) —
  never presented as live or backed by real data it doesn't have.
- It must treat the task it was given as a contract: implement exactly that
  scope, and report (rather than silently fix) anything else it notices.
- If it's told to work on a Task ID but has neither Notion MCP access nor
  the task's fields pasted into the prompt, it must stop and ask for them
  — never invent a goal, scope, acceptance criteria, or dependencies from
  the Task ID or a title alone.
- Its output is not a substitute for your review — read the diff before
  committing it.
- Its changes face the exact same tests/security/i18n/Git bar as a human's
  — "the AI wrote it" is not an exemption from any rule in `AGENTS.md`.
- A research/audit-only agent run must not commit, push, or edit Notion —
  see `AGENTS.md` §15.

## 10. Common pitfalls

- Overwriting or deleting your own or someone else's `.env` — it's
  persistent local config, not a temporary file; `make reset`/`clean`/`stop`
  never touch it and neither should you.
- Adding a translation key to only one or two locales — `check:i18n` will
  fail, and it's checked for a reason: partial translation is the default
  failure mode of this kind of feature.
- Writing business/domain logic directly inside a FastAPI route handler or
  a React component instead of the service/domain layer it belongs to.
- Assuming a UI element (e.g. a "Planned" preview page) means backend
  support already exists — check the actual API/service code, not just the
  screen.
- Forgetting that `make start` bakes source into the image — after a
  dependency change, `make rebuild` (not just `restart`) may be needed;
  after a normal source change, `make start`'s `--build` already handles
  it.
- Reaching for SQLite "just for local convenience" — don't; the project
  standardizes on PostgreSQL everywhere, including tests.
- Running backend `pytest` against the shared development database instead
  of an isolated `TEST_DATABASE_URL` (see [docs/testing.md](testing.md)) —
  it can truncate the local Almaty demo city.

## 11. Definition of Done

A change is done when, not before:

- It implements exactly the requested scope — no unrelated refactors, and
  nothing from a later roadmap phase pulled forward (see
  [docs/product/vision.md](product/vision.md)'s Scope/Non-goals).
- Every new/changed user-facing string has `kk`/`ru`/`en` translations and
  `make frontend-check-i18n` passes (§5).
- Every new/changed user-facing UI is verified correct in both Light and
  Dark appearance (§5b).
- The relevant checks in §6 pass locally (there is no CI to catch this for
  you).
- Docs affected by the change are updated in the same change — an outdated
  `docs/architecture.md`, `docs/roadmap.md`, or API doc is a bug, not a
  follow-up (AGENTS.md §17).
- `git diff`/`git status` were reviewed for accidental files, secrets, or
  unrelated changes before committing.
- The commit(s) are small, Conventional-Commits-styled, and pushed (AGENTS.md
  §14) unless the user said not to.
- The Notion task (§7) is moved to `Review` with its Pull Request linked —
  `Done` is set only after merge and verification, not at PR-open time.

## 12. Where to read next

- [Architecture](architecture.md), [City Model](city-model.md), [Traffic Engine](traffic-engine.md), [Map and editor](map-editor.md), [OSM import](osm-import.md), [API](api.md)
- [Configuration](configuration.md), [Testing](testing.md), [Troubleshooting](troubleshooting.md), [Roadmap](roadmap.md)
- [Project management (task lifecycle, Notion ↔ GitHub split)](development/project-management.md), [Task template](development/task-template.md), [Notion MCP setup](development/notion-mcp.md)
- [AI development workflow](ai-development.md), [AI agent audit](ai-agent-audit.md), [AI prompting standard](ai-prompting.md)
- `AGENTS.md` (repo root) — canonical policy for humans and AI agents alike
- [CONTRIBUTING.md](../CONTRIBUTING.md) — the short version of this page
- [Pixel Lane — Project Guide](https://app.notion.com/p/3dc56325f84081c79e59ece0a7be12d4) (Notion) — product vision, users, roadmap narrative, and the **Development Workspace** (Tasks/Epics/Team/Decisions)
