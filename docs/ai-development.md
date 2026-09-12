# AI Development Workflow — Pixel Lane

This document explains how AI agents (Claude Code, Codex) operate in this
repository. The authoritative rules live in `AGENTS.md`; this document
explains the *workflow* around those rules in more detail. Avoid duplicating
rule text here — link back to `AGENTS.md` sections instead.

## Agent entry points

- **Claude Code** reads `CLAUDE.md` first, which points to `AGENTS.md`.
- **Codex** reads `AGENTS.md` directly and uses `.agents/skills/`.
- Both agents follow the same policy — there is one shared source of truth.

## Context efficiency workflow

Before touching code:

1. State the task scope in one or two sentences (what modules/files are
   plausibly involved).
2. Search first (grep/glob/symbol search) to locate relevant files, routes,
   components, services, and tests.
3. Read only the files needed to make a correct, safe change.
4. If the change touches shared/core code, look at its consumers before
   editing.
5. If new evidence shows another module is affected, expand scope — do not
   silently ignore it to save tokens.

Full rules: see AGENTS.md § Context efficiency rules.

## Security workflow

1. Determine whether the task is security-sensitive (touches auth, input
   handling, file access, external requests, secrets, permissions, etc.).
2. If yes, run the `security-review` skill (`.agents/skills/security-review`)
   before declaring the task complete.
3. Apply the hard rules in AGENTS.md § Security rules (no hardcoded secrets,
   no real secrets in `.env`, backend enforces authorization, no sensitive
   data in logs, no leaked stack traces).
4. Record findings and confirm they were addressed or explicitly accepted
   by the user before shipping.

## Testing workflow

1. Use the `testing` skill for guidance on what kind of test fits the change.
2. Add/update tests that validate real behavior, not tests written to pad
   coverage.
3. Run the smallest useful validation first (e.g. the touched module's unit
   tests), then broader validation (full suite, integration, build) if the
   change's scope warrants it.
4. Never claim a test or check passed without actually running it — if a
   command can't be executed in the current environment, say so explicitly.

## Git workflow

1. Run `git status` before editing anything, to see what's already there.
2. Make scoped, targeted edits — avoid unrelated formatting or mass
   rewrites.
3. Preserve any unrelated uncommitted work found from another agent or the
   user.

## Commit policy

- Split work into small, focused, logically coherent commits (see AGENTS.md
  § Commit rules for message conventions and examples).
- Tests for a change ship with that change; unrelated refactors do not.
- Never use vague commit messages.

## Push policy

- Push after each completed user-requested task, per AGENTS.md § Push rules.
- Do not let multiple finished tasks pile up unpushed.
- If push is skipped or fails, state the exact reason (no remote, auth
  failure, explicit user instruction, permissions, or exploratory task).
- Never force-push, rewrite history, or delete remote branches without
  explicit user request.

## How skills should be used

Skills in `.agents/skills/` are short, specialized checklists for a
particular kind of review or task (architecture, security, frontend, design,
backend, database, performance, testing, pre-ship). They assume the reader
already knows AGENTS.md and do not repeat it — they only add the
specialized checks for that domain. Load the skill matching the task type;
for larger tasks, multiple skills may apply (e.g. a new API endpoint touching
auth: `backend-review` + `security-review` + `testing` + `pre-ship`).

## Pre-ship

Before finishing any non-trivial task, run the `pre-ship` skill: it lists
the final checks (format, lint, typecheck, tests, build, security review,
dependency audit) to run or explicitly report as unavailable.
