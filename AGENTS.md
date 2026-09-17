# AGENTS.md — Pixel Lane Development Policy

This is the **authoritative, shared development policy** for all AI agents
(Claude Code, Codex, or others) working in this repository. `CLAUDE.md` is a
short entry point that points here; it does not duplicate this content.

Pixel Lane is a smart-city / traffic-management platform. The codebase is
early-stage: prioritize building the system core correctly over adding
platform complexity.

## 0. Priority order

When rules conflict, resolve in this order:

**Correctness > Security > Maintainability > Scalability > Resource efficiency > Context efficiency > Speed**

Never sacrifice correctness or security to save tokens, move faster, or make
something "scale better". Scalability work never justifies weakening
security or correctness — see § 5 for what scalability does and does not
mean here. Resource efficiency (§ 10) never justifies skipping a test that's
actually needed.

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
- **Dependency direction**: lower-level domain/core code must never depend
  on a delivery/infrastructure layer. Correct: FastAPI → service → domain.
  Incorrect: domain → FastAPI. The Traffic Engine specifically must not
  depend on FastAPI, SQLAlchemy, React, Canvas, PostgreSQL, or a SUMO
  adapter (see § 19, "Large codebase navigation," for how this generalizes
  to future subsystems).

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

**Task-scoping algorithm.** Before any non-trivial task, run through this
instead of grepping/reading everything or opening every file:

1. Identify the subsystem the task belongs to (see § 19).
2. Read `AGENTS.md` (this file) and the relevant `docs/architecture.md`
   section.
3. Find the subsystem's public entry points (service/engine API, schema,
   component) before its internals.
4. Find callers/consumers of what you're about to change.
5. Read the tests covering the affected behavior (not the whole suite).
6. Modify the minimum necessary files.
7. Run targeted checks for what changed.
8. Run broader regression checks only if a public boundary changed.

## 3. Code quality and readability

- Prefer simple code over clever code.
- One module has one clear responsibility.
- Avoid god classes, god services, god components.
- Do not create huge generic "utils" files — group by domain. A helper
  lives next to the subsystem it belongs to; it only becomes a genuinely
  shared helper once multiple independent subsystems actually use it —
  premature "common"/"shared" abstractions are not allowed. New logic goes
  into its natural subsystem home (see § 19), never into a catch-all
  `utils.py`/`helpers.py`/`common.py`/`misc.py`.
- Use meaningful names.
- Avoid deeply nested logic; prefer early returns.
- Extract reusable logic only when reuse is real (not speculative).
- Do not create abstractions prematurely.
- Keep business logic outside UI components where practical.
- Keep API/domain logic separated from presentation logic.
- Avoid duplicate logic.
- Comments explain WHY, not WHAT. Do not restate code in prose.
- Fix the root cause of an error; do not suppress, swallow, or silently
  catch-and-ignore it to make a symptom disappear.

**File size guidance:** a file reaching roughly 300–500 lines should trigger
a review of whether it should be split by responsibility/domain boundary.
This is a signal, not a strict rule — never split just to hit a number, and
never let a file grow into a 5,000–10,000 line monolith when it can
reasonably be separated. Watch specifically for: massive route files, huge
React pages that mix all logic and markup, huge service classes, and
generic `utils`-style dumping grounds. Split only along meaningful
responsibility boundaries, never arbitrarily — when a file grows, first
identify its natural responsibilities, don't mechanically cut it into
`part1.py`/`part2.py`.

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

**Never present unfinished work as real.** Do not invent API responses,
backend behavior, or datasets that don't exist — including fabricated
traffic/government/sensor data attributed to a real source that doesn't
actually provide it. Do not claim a planned/future module (§ 19) is
implemented. Do not hardcode city/domain data as if it
were final architecture (see "disposable architecture" above). Measured,
estimated, predicted, and simulated data must stay distinguishable in any
UI/API surface — never blended together as if equally certain
(`docs/product/vision.md`'s non-goals). This extends to task context
itself: if a task references a Notion Task ID and the agent can neither
retrieve it via Notion MCP nor find its fields pasted into the prompt,
**stop and ask** — never invent a goal, scope, acceptance criteria, or
dependencies from the Task ID or a title alone (see
`docs/development/notion-mcp.md` and `docs/ai-development.md`'s startup
protocol).

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
component**, evaluate the checklist in § 18 (Library-first engineering).
Do not add a dependency just because it's popular or "the modern choice,"
and do not write a handwritten replacement for what a mature library
already does well — see § 18 for the full reasoning.

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

**Never delete or disable a test to make a check pass.** A failing test
means either the code or the test is wrong — fix the actual defect (or fix
a genuinely incorrect test's assertion), don't remove/skip/comment it out
to get a green run.

**Tests must reflect the real architecture.** Do not make a test pass by
replacing important infrastructure with a behaviorally different
technology — e.g. if production behavior depends on PostgreSQL semantics,
validate it against PostgreSQL, not by substituting SQLite.

Before finishing a task: run the smallest useful validation set first (e.g.
unit tests for the touched module), then broader validation if the change
warrants it (e.g. full suite, build).

**Shared development database safety.** Do not run backend `pytest` against
the shared development database unless `TEST_DATABASE_URL` is confirmed to
target an isolated test database. Until that isolation is fixed, backend
tests may truncate the development `cities` table; testing must never wipe or
alter the Almaty demo city as a side effect.

## 9. Performance awareness

Do not optimize prematurely, but do not accept obviously poor architecture
either. Performance work should be evidence-driven where possible. For
changes to hot paths (simulation loops, rendering, large data processing),
also run the `performance-review` skill and watch for: O(n²)+ operations on
collections that scale with city size, unnecessary repeated queries, N+1
access patterns, oversized payloads where a smaller query would do, repeated
full-city-graph loads, unnecessary frontend re-renders, and loading entire
datasets where pagination/filtering is appropriate.

## 10. Local resource efficiency

Pixel Lane is developed locally on a machine with 8 GB RAM. Agents must
economize RAM/CPU/Docker resources without weakening correctness — a
skipped necessary test is never an acceptable trade for saved resources.

- Don't run multiple instances of the same dev server at once; check
  whether a service is already running before starting it.
- Don't leave stray background processes running after a task.
- Don't run a frontend production build, the full backend test suite, and
  a Docker rebuild all at once unless the task actually needs all three.
- Use targeted tests while iterating; run the full suite when it's
  actually needed before finishing a task (see § 8, § 17).
- Don't run `docker compose build --no-cache` or rebuild images without a
  reason — only rebuild when the change actually requires it.
- Don't leave temporary containers running once a check is done.
- Don't auto-start heavy future services (e.g. SUMO) or add
  Redis/Kafka/etc. merely for development convenience.
- Avoid unnecessary file watchers.
- Pick the minimal set of services a task actually needs — e.g. only
  `postgres` for a migration (`make start-db`), only the backend for a
  backend-only task (`make start-backend`), or just `make frontend-dev`
  (no Docker) for frontend-only work.
- After a resource-heavy check, return the environment to a reasonable
  state — but never stop the user's primary dev stack without a reason.

## 11. Frontend / design rules

Use the `frontend-review` and `design-review` skills for UI work. Check:
responsive layout (mobile/tablet/desktop), spacing consistency, typography,
contrast, accessibility, keyboard navigation, semantic HTML, focus/hover/
disabled/error/loading/empty states, and consistent visual language.

Prefer existing project components and design tokens over inventing new
patterns. Do not build massive page components that mix all logic and UI.

## 12. Git rules

- **Work happens on a task branch, never on `main`.** If you find yourself
  checked out on `main` at the start of a task, create or switch to the
  appropriate task branch (see `docs/development/project-management.md`'s
  branch-naming convention, e.g. `feat/PL-XXX-short-description`) _before_
  editing or committing anything — do not edit/commit on `main` intending
  to push it or move it to a branch later.
- Inspect `git status` before making changes; before any destructive
  operation (`checkout`/`restore`/`reset`/`clean`, `rm -rf`), stash or commit
  anything present first. If `main` already has uncommitted changes when
  you arrive (yours from an earlier step, or someone else's), stash them
  (`git stash -u` if untracked files are involved) or move them onto the
  correct task branch — never discard them, and never commit them to
  `main`.
- Do not blindly `git add .` when unrelated changes exist — stage only
  relevant files.
- Verify before committing: no accidental generated files, no secrets
  staged, no unrelated edits staged, no leftover debug code, no temp files.

**Local developer environment files.** `.env` is ignored by Git but is
persistent local developer configuration, not a temporary or disposable
file — `untracked ≠ temporary`, `ignored ≠ disposable`.

- Never delete, overwrite, recreate, or reset an existing `.env` — not
  after tests, not after `make stop`/`clean`/`restart`, not "because it's
  untracked" — unless the user explicitly asks for it.
- `.env.example` is the tracked template; never commit `.env` or put real
  secrets in `.env.example`.

## 13. Commit rules

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

### Staged roadmap work

An umbrella task such as `PL-005` names a capability; a staged task such as
`PL-005.04` is one independently reviewable implementation increment. Agents
must identify the next Ready stage, implement only that stage, validate its
acceptance criteria, and wait for project-lead review before starting a
dependent stage.

## 14. Push rules

After completing a user-requested task: run relevant validation, review the
diff, ensure no secrets/accidental files are included, create appropriately
small commit(s) **on the task's branch** (see § 12 — never on `main`), then
**push that branch to the configured remote**, and open (or update) a Pull
Request targeting `main` using `.github/pull_request_template.md` — see
`docs/development/project-management.md` for the full task lifecycle.

Do not accumulate multiple finished tasks locally without pushing. Push
after each completed task unless: there is no configured remote,
authentication fails, the user explicitly said not to push, repository
permissions block it, or the task was explicitly exploratory with an
instruction not to commit.

**Never push directly to `main`, and never merge a Pull Request into
`main`.** Every change lands on `main` only through a Pull Request the
maintainer reviews and merges — this applies to every human contributor
and every AI agent, without exception, regardless of how trivial the
change seems.

If a push fails, report the exact reason. Never force-push, rewrite
published history, or delete remote branches unless the user explicitly
requests it.

**Never merge a Pull Request into `main`.** Push a branch and open a PR;
only the maintainer merges — see
`docs/development/project-management.md` for the full task lifecycle and
who is authorized to merge.

## 15. Multi-agent compatibility

Claude Code, Codex, Gemini, and humans may work on the same repository
around the same time.

- Respect existing work; do not revert another agent's changes unless the
  user requires it.
- Inspect `git status` before making changes; preserve unrelated
  uncommitted work you find. Never assume a dirty/untracked file you
  didn't create belongs to you or is safe to discard.
- Do not overwrite unfamiliar modifications; do not `reset`/`restore`/
  discard changes that aren't part of your current task.
- Avoid broad formatting changes or mass file rewrites unrelated to the
  task. Keep changes scoped; prefer targeted patches.
- One focused task per working branch where practical (see
  `docs/development/project-management.md`) — don't fold a second,
  unrelated task into a branch already in progress.
- An audit/research subagent must not mutate repository state (write
  files, run migrations, commit, push, or edit external systems like
  Notion) unless the task explicitly grants it write permission — treat
  "investigate/audit X" as read-only by default. A subagent must not
  commit/push merely because its parent agent has write access.
- A research-only agent must not commit or push. If its output implies a
  change, that change is a separate, explicitly-scoped follow-up task, not
  something the research agent does itself.
- If you discover a conflict with another agent's or developer's
  in-progress work, report it — do not silently "fix" it by overwriting or
  reconciling on your own judgment.
- Do not modify Notion content outside the current task's explicit scope
  (see `docs/development/notion-mcp.md`'s "what to edit" section), and do
  not create a new Notion page/database for task tracking when the
  existing Development Workspace (Tasks/Epics/Team/Decisions) should be
  used instead.

See `docs/development/project-management.md` for how this applies to the
team's task workflow (self-pick, branch/PR, Notion/GitHub split).

## 16. Skill routing

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

When _writing_ a prompt for an AI agent to work in this repository (rather
than acting as the agent), see `docs/ai-prompting.md` for the canonical
prompt template, required sections, and examples — it is a downstream
guide for prompt authors, not a policy source; this file remains
canonical.

## 17. Completion checklist

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
6. Changes committed in small, logical, well-described commits, on the
   task's branch (never `main` — see § 12).
7. Completed work pushed to the remote per the push rules above, and a
   Pull Request opened or updated targeting `main` (never merged by the
   agent — see § 14).
8. Before changing a public contract (API schema, domain model, DB schema,
   engine result, frontend contract), its consumers/callers/tests/docs
   were found and updated — not just the definition — and a
   backward-compatible change was preferred over breaking it for a small
   refactor's sake.
9. If the task touched architecture in a way `docs/architecture.md`
   describes, that file still matches reality — update it if not (see
   § 19). Documentation that lies is worse than no documentation.

**Mandatory completion gate (including Codex).** A development task is not
complete, and must not be described as done, until implementation, relevant
checks, diff review, and status review are complete; focused logical commits
are created on the task's own branch (never `main` — § 12); those commits
are pushed to that branch's remote; a Pull Request targeting `main` is
opened or updated (never merged by the agent — § 14); and the remote state
is verified. Run `git rev-parse HEAD` and `git rev-parse origin/<task-branch>`
(the actual branch you pushed, **not** `origin/main`) after the push and
ensure they match. Never claim a push succeeded without this check, and
never claim the task is merged unless the maintainer actually merged it.
Preserve unrelated user changes; inspect every untracked file and report
whether it is intentional, generated, or should be ignored. The final report
must state changed modules, architecture/data-flow impact, checks actually
run and results, final git status, commit SHA(s), push/remote verification
(against the task branch), remaining limitations, and a recommended next
task.

## 18. Library-first engineering

Do not write from scratch what a mature, reliable, well-fitted library
already solves. Do not add a dependency for something trivial either.
Prefer, in order:

**reuse a mature library > a small custom adapter around it > a large
handwritten replacement**

**When to look for a library.** Before implementing infrastructure or a
standard/solved problem, check whether a production-grade library already
fits — especially for: HTTP clients, parsing, validation, serialization,
database access, migrations, geometry/GIS, OpenStreetMap, cryptography,
auth, date/time, file formats, caching, retry/backoff, logging, testing
utilities, UI primitives, accessibility, forms, charts, protocol clients,
image/video processing, and scientific algorithms. Do not hand-roll a
parser, protocol implementation, client, or framework when a mature
library does it better.

**When not to add a dependency.** Skip it when: the task is a transparent
function of a few dozen lines; the dependency has a large runtime/memory
cost for what it buys; it's poorly maintained; it covers far more scope
than needed; it creates lock-in without real benefit; it conflicts with
existing architecture; it duplicates a dependency already in the project;
or the language's standard library already handles it well. Never add a
library just because "it's faster to reach for one."

**Evaluation criteria** before adding any new dependency, database,
framework, or infrastructure component:

1. Does the project already have something suitable for this?
2. Is it solving a real, current problem (not a hypothetical one)?
3. Is it actively maintained?
4. What are the security implications?
5. What's its runtime/memory/dependency-weight cost?
6. Is its license compatible with the project?
7. Does it fit the existing architecture, or can it be isolated (see
   below) if it doesn't fully fit?
8. Does it need a lockfile/docs update?

A web search isn't needed for every small, obvious dependency choice —
reserve deeper research for infrastructural or hard-to-reverse choices.

**Core Pixel Lane logic stays ours.** Libraries may help inside an
implementation, but must never become or hide the core of the system.
Under our control, always: City Model contracts, Traffic Engine domain
logic, traffic metrics, bottleneck logic, future optimization logic,
recommendation rules, and integration boundaries. Example: OSMnx is fine
for importing OpenStreetMap data; OSMnx must never become Pixel Lane's
Traffic Engine.

**Dependency isolation.** A new heavy dependency should be scoped to where
it's actually needed, not pulled into the whole system by default. An OSM
importer dependency, for example, must not automatically become a required
dependency of the frontend, the Traffic Engine, or the core backend
runtime unless it genuinely is one. Prefer optional extras, tooling/dev
dependency groups, or an isolated adapter module over a blanket new
top-level dependency — but don't build a bespoke package-management
framework just to isolate one library; use the packaging ecosystem's
normal mechanisms (extras, dev groups, a dedicated sub-package).

**Resource cost matters.** Per § 10's 8 GB RAM constraint, factor
memory/runtime cost into the choice itself — e.g. don't add Electron-like
tooling, a heavy GIS stack in the core backend, or multiple competing
visualization frameworks unless the task genuinely requires it.

## 19. Large codebase navigation

Pixel Lane will keep growing. Agents must not try to hold the whole
repository in context — use hierarchical navigation instead.

**Source of truth hierarchy**, most general to most specific:

```
AGENTS.md
    ↓
docs/architecture.md
    ↓
module-level README / architecture notes
    ↓
actual code
    ↓
tests
```

`AGENTS.md` holds general rules; `docs/architecture.md` holds high-level
architecture and dependency boundaries. Every large subsystem should be
understandable without reading the entire repository.

**Public interfaces first.** Find and read a subsystem's public entry
point before its internals: `TrafficEngine.analyze(...)` for the Traffic
Engine; the city service/repository/API schema for City; the API layer,
renderer, and feature entry component for the Viewer. Don't read a
module's internals when its public API is enough for the task.

**Module architecture notes.** Once a subsystem is large enough that a
newcomer (human or AI) can't quickly understand it from its code alone,
give it a short local `README.md` (e.g. `backend/app/city/README.md`,
`simulation/pixel_lane_simulation/traffic/README.md`,
`frontend/src/features/city-viewer/README.md`). Do not create one for
every small folder — only where it genuinely helps. Keep it short:

```
Purpose
Public API
Main modules
Dependency direction
Important invariants
Where to add new code
What must not depend on this module
```

A subsystem-level `ARCHITECTURE.md` is also acceptable in place of/beside
a README for this purpose. Either way: describe architecture, don't
restate the code; no generated dumps; stay short; stay current; don't
duplicate `AGENTS.md`.

**Code ownership by subsystem.** Every feature has a clear home, e.g.
city-domain logic → `backend/app/city`, traffic analysis →
`simulation/.../traffic`, the backend adapter → `backend/app/traffic`,
viewer logic → `frontend/.../city-viewer`, a future OSM importer →
something like `city/importers/osm`. New logic goes into its natural
subsystem, never into a catch-all utils file (see § 3).

**Dependency boundary review.** Before changing a public contract (schema,
service interface, domain object, DB model, API, shared type), find its
consumers, callers, tests, and docs _first_ — this matters more than
saving context (see § 2's task-scoping algorithm and § 17's completion
checklist).

**Tests as navigation.** Use tests to understand existing behavior: when
touching a subsystem, read the tests covering the affected behavior before
the rest of the suite. Name tests so the behavior they check is obvious
from the name alone.

**Architecture map.** `docs/architecture.md` keeps a compact, current map
of subsystems and the dependency flow between them (frontend → backend API
→ services → City Model/adapters → Traffic Engine → PostgreSQL, etc.).
When a new large subsystem is added, update that map — don't let it drift
from reality (see § 17). Don't add a future subsystem to the map as if it
already exists; use a separate "Planned" section for those.

## 20. Internationalization — Mandatory

Pixel Lane is a **trilingual product**. Every user-facing feature must
support:

- Kazakh (`kk`) — default locale
- Russian (`ru`)
- English (`en`)

This is a permanent architectural requirement, not a one-off feature —
see `docs/i18n.md` for the full workflow (routing, translation file
structure, how to add a key/page, `check:i18n`). The i18n system is
`next-intl`, with locale-prefixed routing (`/kk/...`, `/ru/...`,
`/en/...`) and namespaced JSON files under `frontend/messages/<locale>/`.

**Agents MUST NOT:**

- hardcode user-facing strings directly in components;
- implement new pages in only one language;
- add English-only buttons, tooltips, empty states, form errors, dialogs,
  notifications, metadata, or accessibility labels;
- introduce backend error messages that are directly shown to users
  without localization;
- add a new translation key to only one locale;
- merge a user-facing feature with missing translations.

**Agents MUST:**

- use the project i18n system (`next-intl`, `frontend/src/i18n/*`,
  `frontend/messages/`) — never an improvised ad hoc string table;
- add translation keys for all 3 locales (`kk`, `ru`, `en`) in the same
  change;
- preserve translations when refactoring;
- check responsive layouts across languages (Russian and Kazakh strings
  often run longer than English — prefer flexible layout over fixed
  widths or shrinking text to fit);
- localize metadata (title/description, and `hreflang` alternates on
  public routes) when adding a public route;
- localize validation/error messages;
- keep terminology consistent with the project glossary in
  `docs/i18n.md` / `frontend/messages/*/cityModel.json`'s domain terms;
- run `npm run check:i18n` (from `frontend/`) before completing work.

**Definition of Done** for any user-facing change includes complete `kk`,
`ru`, and `en` translations — not "English now, translations later."

**Code review rule.** A user-facing change is incomplete — treat it like a
failing test, not a nice-to-have — if any of the following is true:

- one locale is missing a translation;
- untranslated (English, or any single language) text is visible in the
  UI where the other locales show something different;
- a translation key exists in one locale's JSON file but not another's
  (this is exactly what `npm run check:i18n` catches);
- English text is hardcoded directly in JSX instead of a translation key;
- metadata (title/description/OG) is only available in one language on a
  public route;
- accessibility labels (`aria-label`, `alt`, etc.) are not localized.

This section is canonical policy for **every** agent working on this
repository — Claude Code, Codex, Gemini, or otherwise. `AGENTS.md` is the
canonical instruction set for Codex and any other agent that reads it
directly; `CLAUDE.md` and `GEMINI.md` are short entry points that point
back here rather than duplicating this section.

## 21. Appearance / Theming — Mandatory

Pixel Lane supports **Light**, **Dark**, and **System** appearance modes.
This is a permanent architectural requirement, not a one-off feature —
see `docs/theming.md` for the full workflow (token list, where the
switcher lives, how to add a theme-aware component). The theme system is
`next-themes`, writing `data-theme="light"|"dark"` on `<html>`; both that
attribute and Tailwind's `dark:` variant read from the same semantic CSS
custom properties defined once in `frontend/src/app/globals.css`.

**Agents MUST NOT:**

- hardcode a color that only looks correct in one theme (e.g. a literal
  hex/RGB value, or a Tailwind color like `bg-white`/`text-black`)
  instead of a semantic token or an existing `dark:` pair;
- ship a new or modified user-facing component that was only checked
  against one theme;
- introduce a second, competing theme/token system alongside the
  existing one;
- assume "dark mode" means inverting every color — status/severity colors
  must stay semantically meaningful in both themes, not just inverted;
- wire theme preference to the backend/a user-accounts system that
  doesn't exist yet — it is a local (`localStorage`) UI preference only.

**Agents MUST:**

- use the existing semantic tokens (`background`, `foreground`,
  `surface`, `surface-elevated`, `border-subtle`, `text-muted`,
  `primary`, `success`, `warning`, `danger`, the `severity-*` scale) or
  paired `dark:`/`data-theme` Tailwind utilities — never a new one-off
  color;
- verify (by code inspection, and visually when a browser is available)
  that a UI change reads correctly in both Light and Dark before calling
  it done;
- keep the map/City Model workspace's own canvas styling (a
  self-contained engineering-map palette with its own Light/Dark tokens
  in `map/styles/mapTheme.ts`, not the shared app tokens) and the
  surrounding overlay/toolbar/panel chrome (which _does_ use the shared
  `globals.css` tokens) conceptually distinct, while both must still read
  correctly in both Light and Dark — see `docs/theming.md`;
- localize any new theme-switcher-adjacent labels through the existing
  i18n system for `kk`/`ru`/`en`, per § 20 — a theme feature is still a
  user-facing feature.

**Definition of Done** for any user-facing frontend change includes
verified correctness in both Light and Dark appearance — not "looks fine
in whichever theme I happened to test."

**Code review rule.** A user-facing frontend change is incomplete if any
of the following is true:

- it is visibly broken, low-contrast, or unreadable in either Light or
  Dark mode;
- it introduces a hardcoded single-theme color where a semantic token
  already covers that case;
- a new component skips the existing token system entirely.

This section is canonical policy for **every** agent working on this
repository, exactly as § 20 is — `CLAUDE.md` and `GEMINI.md` point back
here rather than duplicating it.
