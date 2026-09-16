# Pixel Lane documentation

New to the repository — human or AI agent? Start with
[Developer onboarding](developer-onboarding.md) — it's a guided path,
in order, through everything below.

## Start Here

- [Developer onboarding](developer-onboarding.md) — the one obvious entry point: what Pixel Lane is, setup, tasks, workflow, AI use, Definition of Done.
- [CONTRIBUTING.md](../CONTRIBUTING.md) — the short version.
- `AGENTS.md` (repo root) — canonical policy for humans and AI agents alike.
- [Pixel Lane — Project Guide](https://app.notion.com/p/3dc56325f84081c79e59ece0a7be12d4) (Notion) — product vision, users, roadmap narrative, and the **Development Workspace** (Tasks/Epics/Team/Decisions).

## Product

- [Product vision](product/vision.md) — long-term direction, North Star, operating loop, scope and non-goals.
- [Roadmap](roadmap.md) — implemented, next, planned, and future work, by version.

## Architecture

- [Architecture](architecture.md) — implemented boundaries and planned systems.
- [Project structure](project-structure.md) — directory ownership.
- [City Model](city-model.md) — authoritative road-network domain data.
- [Traffic Engine](traffic-engine.md) — current static analysis scope.
- [Map and editor](map-editor.md) — MapLibre/Terra Draw data flow.
- [OSM import](osm-import.md) — Almaty demo normalization.
- [API](api.md) — API groups and OpenAPI source of truth.

## Development

- [Development](development.md) — local workflow and Docker commands.
- [Configuration](configuration.md) — safe environment-variable reference.
- [Testing](testing.md) — checks and database safety.
- [Internationalization](i18n.md) — kk/ru/en workflow and requirements.
- [Theming](theming.md) — Light/Dark/System appearance system and token workflow.
- [Troubleshooting](troubleshooting.md) — common local issues.
- [Project management](development/project-management.md) — task lifecycle, branch naming, and the Notion ↔ GitHub canonical source-of-truth split.
- [Task template](development/task-template.md) — required fields before a task moves to Ready.
- [Notion MCP setup](development/notion-mcp.md) — connect Claude Code (or another agent) to the Notion workspace.

## AI-assisted Development

- [AI development workflow](ai-development.md) — how Claude/Codex/Gemini operate here, including the pre-implementation startup protocol.
- [AI prompting standard](ai-prompting.md) — how to write a task prompt for this repo, including the short Notion-task-linked format.
- [AI agent audit](ai-agent-audit.md) — verified cross-agent consistency findings.

## Operations / Reference

- `AGENTS.md` (repo root) — architecture, security, database, testing, git, and AI-agent policy in full.
- `CLAUDE.md` / `GEMINI.md` (repo root) — thin per-agent entry points; do not restate `AGENTS.md`.
