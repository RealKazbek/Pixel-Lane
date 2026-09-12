---
name: pre-ship
description: Final validation checklist to run before declaring a development task complete.
---

# Pre-ship

Run before declaring any non-trivial task complete.

## Checklist

- **Format**: run the project's formatter if configured.
- **Lint**: run the project's linter if configured.
- **Typecheck**: run the project's type checker if configured.
- **Tests**: run the smallest relevant set, then broader if the change
  warrants it (see `testing` skill).
- **Build**: run the project build if one exists.
- **Security review**: run `security-review` if the change is
  security-sensitive.
- **Dependency audit**: run the ecosystem's audit tool if dependencies were
  added/changed.
- **Diff review**: `git status` and diff clean — no secrets, no accidental
  generated files, no unrelated edits, no leftover debug code.
- **Commit shape**: for architecture/database/foundation work, changes are
  split into focused commits (e.g. domain model, migration, API
  integration, tests/docs) rather than one opaque commit.

## Rules

- Never claim a check passed without actually running it.
- If a command cannot be run in the current environment (missing tool, no
  script configured), report that explicitly instead of skipping silently.
- If any check fails, fix the root cause before shipping, or report the
  failure clearly if it's out of scope for this task.
