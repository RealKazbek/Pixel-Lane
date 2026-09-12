# AGENTS.md — Pixel Lane Development Policy

This is the **authoritative, shared development policy** for all AI agents
(Claude Code, Codex, or others) working in this repository. `CLAUDE.md` is a
short entry point that points here; it does not duplicate this content.

Pixel Lane is a smart-city / traffic-management platform. The codebase is
early-stage: prioritize building the system core correctly over adding
platform complexity.

## 0. Priority order

When rules conflict, resolve in this order:

**Correctness > Security > Maintainability > Context efficiency > Speed**

Never sacrifice correctness or security to save tokens or move faster.

## 1. Project principles (Pixel Lane architecture boundaries)

- Core traffic logic must not depend directly on the UI.
- The **City Model** is a stable domain representation — treat it as the
  source of truth for traffic entities.
- The 2D editor edits/generates City Model data; it does not own domain logic.
- Simulation sits behind an adapter/service boundary.
- SUMO integration must not leak throughout the codebase — isolate it behind
  an adapter.
- External hardware integration must be isolated behind its own boundary.
- Traffic optimization logic must be independently testable (no UI or
  simulation runtime required).
- Authentication must not become coupled to the core traffic engine.
- Business/domain logic must be testable without running the frontend.

See `docs/architecture.md` for the current and planned architecture.

## 2. Context efficiency rules

Applies to all agents, but never at the cost of correctness or missing
important code.

1. Identify task scope before reading files.
2. Search for relevant files, symbols, routes, components, services, and
   tests first (grep/search tools) before opening files.
3. Read the smallest sufficient set of files to complete the task correctly.
4. Do not read the entire repository unless the task genuinely requires it.
5. Do not repeatedly re-read unchanged files during the same task.
6. Prefer targeted search over opening large directories blindly.
7. Read large documentation files progressively, by relevant section.
8. Expand scope only when evidence indicates another module is involved.
9. Before modifying shared/core code, inspect its consumers first.
10. Never skip relevant code just to save tokens.

## 3. Code quality and readability

- Prefer simple code over clever code.
- One module has one clear responsibility.
- Avoid god classes, god services, god components.
- Do not create huge generic "utils" files — group by domain.
- Use meaningful names.
- Avoid deeply nested logic; prefer early returns.
- Extract reusable logic only when reuse is real (not speculative).
- Do not create abstractions prematurely.
- Keep business logic outside UI components where practical.
- Keep API/domain logic separated from presentation logic.
- Avoid duplicate logic.
- Comments explain WHY, not WHAT. Do not restate code in prose.

**File size guidance:** a file reaching roughly 300–500 lines should trigger
a review of whether it should be split by responsibility/domain boundary.
This is a signal, not a strict rule — never split just to hit a number, and
never let a file grow into a 5,000–10,000 line monolith when it can
reasonably be separated.

## 4. Project structure philosophy

Use feature/domain-based organization where appropriate, e.g. for a
`traffic` domain:

```
traffic/
  domain/
  services/
  validators/
  adapters/
  tests/
```

Do not force this exact structure onto every area — let actual project needs
drive structure. Do not invent architecture that doesn't exist yet; when
documenting early-stage areas, mark them explicitly as planned.

## 5. Security rules

AI-generated code must be secure by default. For any security-sensitive
change, run the `security-review` skill before declaring the task complete.

Always consider, when relevant to the change:

input validation, authentication, authorization, role/permission checks,
SQL injection, XSS, CSRF, SSRF, command injection, path traversal, unsafe
deserialization, insecure file upload, unrestricted file access, secret
leakage, exposed API keys, unsafe environment variables, sensitive data in
logs, missing rate limiting, insecure CORS, dependency vulnerabilities,
secure HTTP headers, error information leakage, unsafe redirects,
IDOR/broken object-level authorization, race conditions, database
transaction safety.

Hard rules:

- Never hardcode secrets. Never commit `.env` files with real secrets — use
  `.env.example` with placeholder values.
- Validate external input at system boundaries. Do not trust frontend
  validation — the backend must enforce authorization and validation
  independently.
- Do not expose internal stack traces or raw error details to users.
- Do not log passwords, tokens, session cookies, secrets, or sensitive
  personal data.

## 6. Testing rules

Use the `testing` skill for guidance. Relevant changes should include
appropriate tests (unit, integration, API, component, or regression) that
validate actual behavior — not tests written only to inflate coverage.

Before finishing a task: run the smallest useful validation set first (e.g.
unit tests for the touched module), then broader validation if the change
warrants it (e.g. full suite, build).

## 7. Frontend / design rules

Use the `frontend-review` and `design-review` skills for UI work. Check:
responsive layout (mobile/tablet/desktop), spacing consistency, typography,
contrast, accessibility, keyboard navigation, semantic HTML, focus/hover/
disabled/error/loading/empty states, and consistent visual language.

Prefer existing project components and design tokens over inventing new
patterns. Do not build massive page components that mix all logic and UI.

## 8. Git rules

- Inspect `git status` before making changes; before any destructive
  operation (`checkout`/`restore`/`reset`/`clean`, `rm -rf`), stash or commit
  anything present first.
- Do not blindly `git add .` when unrelated changes exist — stage only
  relevant files.
- Verify before committing: no accidental generated files, no secrets
  staged, no unrelated edits staged, no leftover debug code, no temp files.

## 9. Commit rules

- Small, focused, internally coherent commits. Do not mix unrelated changes.
- A task touching many concerns should usually be split into logical
  commits.
- Tests belonging directly to a change may be committed with it. Unrelated
  refactors must not be mixed into feature commits.
- Use conventional, descriptive commit messages:
  `feat: add traffic intersection model`
  `fix: validate lane direction input`
  `refactor: split traffic analysis service`
  `test: add congestion calculation tests`
  `docs: document city model architecture`
  `chore: configure development tooling`
- Never use vague messages like `update`, `fix stuff`, `changes`, `final`,
  `work`.

## 10. Push rules

After completing a user-requested task: run relevant validation, review the
diff, ensure no secrets/accidental files are included, create appropriately
small commit(s), then **push to the configured remote branch**.

Do not accumulate multiple finished tasks locally without pushing. Push
after each completed task unless: there is no configured remote,
authentication fails, the user explicitly said not to push, repository
permissions block it, or the task was explicitly exploratory with an
instruction not to commit.

If a push fails, report the exact reason. Never force-push, rewrite
published history, or delete remote branches unless the user explicitly
requests it.

## 11. Multi-agent compatibility

Claude Code and Codex may work on the same repository.

- Respect existing work; do not revert another agent's changes unless the
  user requires it.
- Inspect `git status` before making changes; preserve unrelated
  uncommitted work you find.
- Do not overwrite unfamiliar modifications.
- Avoid broad formatting changes or mass file rewrites unrelated to the
  task. Keep changes scoped; prefer targeted patches.

## 12. Skill routing

Load the relevant skill from `.agents/skills/` for the task type:

- `architecture-review` — boundary/domain-structure changes
- `security-review` — anything security-sensitive (required before shipping)
- `backend-review` — server/API/domain logic changes
- `frontend-review` — UI/component changes
- `design-review` — visual/UX-facing changes
- `database-review` — schema/query/migration changes
- `performance-review` — hot paths, simulation, rendering loops
- `testing` — writing/selecting tests for a change
- `pre-ship` — final checklist before declaring a task done

Skills contain only specialized instructions — they do not repeat this file.

## 13. Completion checklist

Before declaring a task complete:

1. Task scope matched the actual change (no unrequested scope creep).
2. Relevant skills were applied (security review for sensitive changes).
3. Tests added/updated and run (smallest useful set, then broader if needed).
4. Pre-ship checks run: format, lint, typecheck, tests, build, security
   review, dependency audit — as applicable. If a check can't be run, say so
   explicitly.
5. `git status` and diff reviewed; no secrets, no accidental files, no
   unrelated edits.
6. Changes committed in small, logical, well-described commits.
7. Completed work pushed to the remote per the push rules above.
