# AGENTS.md — Pixel Lane Development Policy

This is the **authoritative, shared development policy** for all AI agents
(Claude Code, Codex, or others) working in this repository. `CLAUDE.md` is a
short entry point that points here; it does not duplicate this content.

Pixel Lane is a smart-city / traffic-management platform. The codebase is
early-stage: prioritize building the system core correctly over adding
platform complexity.

## 0. Priority order

When rules conflict, resolve in this order:

**Correctness > Security > Maintainability > Scalability > Context efficiency > Speed**

Never sacrifice correctness or security to save tokens, move faster, or make
something "scale better". Scalability work never justifies weakening
security or correctness — see § 5 for what scalability does and does not
mean here.

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
- Traffic logic must not live inside React components; domain logic must
  not depend on Next.js; simulation logic must not depend on FastAPI routes.
- Database models must not become the only representation of a domain
  concept — domain logic operates on domain objects, not raw ORM rows.
- External systems (SUMO, cameras, sensors, other hardware, maps, AI
  services) are isolated behind clear adapters, never called directly from
  domain or UI code.

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
11. For foundational/architectural changes specifically, "save context" never
    means "skip dependencies or consumers": inspect callers, data flow,
    relevant tests, relevant documentation, and — if the change touches
    persistence — the database schema/migrations, before making a
    locally-correct but globally-wrong change.

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
reasonably be separated. Watch specifically for: massive route files, huge
React pages that mix all logic and markup, huge service classes, and
generic `utils`-style dumping grounds. Split only along meaningful
responsibility boundaries, never arbitrarily.

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

**Layering.** Where a component is non-trivial, keep these responsibilities
explicit and separate: API/transport, validation/schema, service/application,
domain logic, persistence/repository, and external adapters/integrations.
Do not force all six layers onto a trivial endpoint or script — use them
when they actually improve clarity and testability, not by default. The
goal is to prevent code from becoming tightly coupled, not to produce
boilerplate.

**Avoid disposable architecture.** Do not implement shortcuts that will
obviously need to be thrown away once the feature is real, including: JSON
files as primary persistence, in-memory/fake repositories presented as
final architecture, hardcoded city data embedded in application code, giant
single-file services, business logic living only in the frontend, direct
database calls scattered across route handlers instead of a
repository/service layer, or framework-specific code standing in for domain
logic. If temporary/demo code is genuinely needed, mark it clearly as
temporary (e.g. a `# TODO(temporary):` comment or an explicit note in the
PR/commit) so it isn't mistaken for the real architecture.

## 5. Scalability and technology choices

**Scalability by design, not over-engineering.** Important modules should
be able to scale and evolve without requiring a full rewrite. This does
**not** mean premature microservices, unnecessary distributed systems,
complex patterns without current value, or abstraction for abstraction's
sake. It also does not mean disposable prototype decisions that will
obviously need replacing soon (see § 4's "avoid disposable architecture").
Prefer simple architecture with clean boundaries that stays easy to extend.

**Prefer production-grade technology.** When choosing between a
toy/development-only technology and the project's intended production-grade
option, prefer the production-grade one unless there is a strong, documented
reason not to. Concretely: do not use SQLite as the main persistence layer
— PostgreSQL is the standard database for Pixel Lane (see § 6). SQLite may
only be used when there is a specific, isolated reason, it does not change
production behavior, it is clearly documented, and it does not hide
PostgreSQL-specific behavior. Prefer PostgreSQL-compatible testing over
silently swapping in SQLite for integration/database tests.

**Before adding a new dependency, database, framework, or infrastructure
component**, evaluate:

1. Does the project already have a suitable technology for this?
2. Is the new dependency solving a real, current problem?
3. Is it actively maintained?
4. Does it fit the existing architecture?
5. Does it improve maintainability or scalability?
6. Is there a simpler solution using existing tools?
7. Will it introduce unnecessary vendor/framework coupling?

Do not add a dependency just because it's popular or "the modern choice."

**Future growth — consider, don't build.** When designing foundational
components, keep plausible future extensions in mind so today's decisions
don't unnecessarily block them: multiple cities, many intersections, large
road graphs, live traffic, cameras, sensors, emergency vehicles, public
transport, SUMO, digital twins, PostGIS, analytics, background processing,
real-time updates. Do not implement any of this before it's needed — only
avoid choices that would make it needlessly hard later.

## 6. Database rules

PostgreSQL is the authoritative relational database for Pixel Lane (see
§ 5). For schema/query changes, also run the `database-review` skill.

- Use proper migrations (Alembic) for schema changes — never hand-edit the
  schema out of band.
- Use foreign keys and constraints (`NOT NULL`, `UNIQUE`, checks) where they
  reflect real invariants, instead of relying on application code alone.
- Use transactions for multi-record operations that must be atomic.
- Add indexes based on actual access patterns, not speculatively.
- Avoid N+1 query patterns; avoid loading large datasets when a filtered or
  paginated query is sufficient.
- Model relational data relationally — do not store it as arbitrary JSON
  just to avoid schema design. `JSONB` is fine when the data is genuinely
  flexible/document-like.
- Keep future PostGIS compatibility in mind when modeling geographic data
  (e.g. sensible column types, avoiding designs that would block a later
  geometry column), but do not add PostGIS until the project actually needs
  geospatial database operations.

## 7. Security rules

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

## 8. Testing rules

Use the `testing` skill for guidance. Relevant changes should include
appropriate tests (unit, integration, API, component, or regression) that
validate actual behavior — not tests written only to inflate coverage. Keep
test layers distinct where useful: unit tests for pure logic, integration
tests for database behavior, API tests for transport behavior.

**Tests must reflect the real architecture.** Do not make a test pass by
replacing important infrastructure with a behaviorally different
technology — e.g. if production behavior depends on PostgreSQL semantics,
validate it against PostgreSQL, not by substituting SQLite.

Before finishing a task: run the smallest useful validation set first (e.g.
unit tests for the touched module), then broader validation if the change
warrants it (e.g. full suite, build).

## 9. Performance awareness

Do not optimize prematurely, but do not accept obviously poor architecture
either. Performance work should be evidence-driven where possible. For
changes to hot paths (simulation loops, rendering, large data processing),
also run the `performance-review` skill and watch for: O(n²)+ operations on
collections that scale with city size, unnecessary repeated queries, N+1
access patterns, oversized payloads where a smaller query would do, repeated
full-city-graph loads, unnecessary frontend re-renders, and loading entire
datasets where pagination/filtering is appropriate.

## 10. Frontend / design rules

Use the `frontend-review` and `design-review` skills for UI work. Check:
responsive layout (mobile/tablet/desktop), spacing consistency, typography,
contrast, accessibility, keyboard navigation, semantic HTML, focus/hover/
disabled/error/loading/empty states, and consistent visual language.

Prefer existing project components and design tokens over inventing new
patterns. Do not build massive page components that mix all logic and UI.

## 11. Git rules

- Inspect `git status` before making changes; before any destructive
  operation (`checkout`/`restore`/`reset`/`clean`, `rm -rf`), stash or commit
  anything present first.
- Do not blindly `git add .` when unrelated changes exist — stage only
  relevant files.
- Verify before committing: no accidental generated files, no secrets
  staged, no unrelated edits staged, no leftover debug code, no temp files.

## 12. Commit rules

- Small, focused, internally coherent commits. Do not mix unrelated changes.
- A task touching many concerns should usually be split into logical
  commits.
- Tests belonging directly to a change may be committed with it. Unrelated
  refactors must not be mixed into feature commits.
- For architecture/database/foundation tasks specifically, split along
  these lines where they apply: architecture/domain model, database
  schema/migration, service/API integration, tests/documentation. Do not
  produce one large, opaque commit for a foundational change.
- Use conventional, descriptive commit messages:
  `feat: add traffic intersection model`
  `fix: validate lane direction input`
  `refactor: split traffic analysis service`
  `test: add congestion calculation tests`
  `docs: document city model architecture`
  `chore: configure development tooling`
- Never use vague messages like `update`, `fix stuff`, `changes`, `final`,
  `work`.

## 13. Push rules

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

## 14. Multi-agent compatibility

Claude Code and Codex may work on the same repository.

- Respect existing work; do not revert another agent's changes unless the
  user requires it.
- Inspect `git status` before making changes; preserve unrelated
  uncommitted work you find.
- Do not overwrite unfamiliar modifications.
- Avoid broad formatting changes or mass file rewrites unrelated to the
  task. Keep changes scoped; prefer targeted patches.

## 15. Skill routing

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

## 16. Completion checklist

Before declaring a task complete:

1. Task scope matched the actual change (no unrequested scope creep).
2. Relevant skills were applied (e.g. security review for sensitive
   changes, architecture/database review for foundational changes).
3. Tests added/updated and run (smallest useful set, then broader if needed).
4. Pre-ship checks run: format, lint, typecheck, tests, build, security
   review, dependency audit — as applicable. If a check can't be run, say so
   explicitly.
5. `git status` and diff reviewed; no secrets, no accidental files, no
   unrelated edits.
6. Changes committed in small, logical, well-described commits.
7. Completed work pushed to the remote per the push rules above.
