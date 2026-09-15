# Project management: Notion ↔ GitHub

This page defines how team collaboration works across the two systems Pixel
Lane uses, and which one is canonical for what. It does not duplicate task
content — Notion is the live source for that; this page is the stable
process description linked from both sides.

- **Notion — [Pixel Lane — Project Guide](https://app.notion.com/p/3dc56325f84081c79e59ece0a7be12d4)**
  → **[Development Workspace](https://app.notion.com/p/3dc56325f840814e9c2fdc672f18d5d7)**
  (Tasks / Epics / Team / Decisions databases).
- **GitHub — this repository.**

## Canonical source-of-truth split

| Owned by **Notion** | Owned by **GitHub** |
| --- | --- |
| Current task state | Source code |
| Ownership / assignment | Branches |
| Epics | Pull Request history and review |
| Team structure | Technical architecture (`docs/architecture.md`) |
| Product-level planning / roadmap priorities | API / schema / data contracts |
| Product decisions | Tests |
| Future ideas | Implementation-specific docs (`docs/*`) |

Neither system re-hosts the other's detailed content. A Notion task links to
its branch and PR instead of copying the diff; a repo doc links to the
Development Workspace instead of re-describing product vision. If a product
decision recorded in Notion has a technical consequence, that consequence is
reflected in the relevant repo doc/code (e.g. `docs/architecture.md`) — the
decision itself is not copied into the repo, and the repo's technical detail
is not copied into Notion.

For product vision, roadmap phases, and long-term direction, read
[docs/product/vision.md](../product/vision.md) and
[docs/roadmap.md](../roadmap.md) — Notion's Project Guide covers the same
ground at product altitude, in more narrative form, for non-engineering
audiences (government/academic reviewers, new team members). Don't maintain
both in lockstep line-by-line; keep them directionally consistent instead.

## Task lifecycle

```
Backlog -> Ready -> In Progress -> Review -> Changes Requested -> Approved -> Done
```

`Blocked` is a separate status for anything stuck on an external dependency.

A task only moves to **Ready** once it has a clear goal, module, and
acceptance criteria — see
[docs/development/task-template.md](task-template.md). Tasks without that
are left in **Backlog** rather than picked.

1. **Self-pick** a task with Status = `Ready` in the Notion Tasks database.
   Assign yourself; move Status to `In Progress`.
2. **Branch** off `main` using the naming convention below.
3. **Implement** only that task's scope. Keep the branch/PR focused — one
   task per branch/PR where practical.
4. **Validate.** Run the checks relevant to what you touched — see
   [docs/development.md](../development.md) and
   [docs/developer-onboarding.md](../developer-onboarding.md) §6.
5. **Push** the branch and **open a Pull Request** against `main` using
   `.github/pull_request_template.md`. Paste the PR URL into the task's
   **Pull Request** property in Notion. Move Status to `Review`.
6. **Maintainer review.** Kazbek reviews every PR.
   - Needs work → `Changes Requested`; address it, push more commits, back
     to `Review`.
   - Accepted → `Approved`.
7. **Merge and verify.** After the maintainer merges, confirm the merged
   result matches the task's acceptance criteria (and demo it if the task
   requires one), then move Status to `Done`. `Approved` is not `Done` —
   `Done` requires the merge and its verification.

No contributor — human or AI agent — pushes directly to `main`. Every change
lands through a reviewed Pull Request, without exception.

## Branch naming

```
feat/PL-XXX-short-description
fix/PL-XXX-short-description
docs/PL-XXX-short-description
refactor/PL-XXX-short-description
```

`PL-XXX` is the task's **Task ID** from the Notion Tasks database (e.g.
`PL-014`). This keeps every branch traceable back to the task that
authorized it.

## Parallel development over sequential phases

Work is not sequenced as "finish the map, then build simulation, then build
control." Modules depend on **stable contracts**, not on each other's
completion — see the subsystem table and dependency-flow diagram in
[docs/architecture.md](../architecture.md):

```
City Model contract
  -> Map / Renderer / Editor consumes it
  -> Simulation consumes it
  -> Control algorithms consume traffic-state / simulation interfaces
```

When a module is unfinished, another module should still be testable
against Demo City, synthetic fixtures, schemas/contracts, mocked data, or
test doubles where practical, instead of blocking on the unfinished module.

## Contributor scope by type

- **Core developers** — broad module ownership over time, can take
  foundational/architectural tasks.
- **Temporary contributors / one-off helpers** — given isolated,
  self-contained tasks with clear acceptance criteria and minimal blast
  radius (e.g. a single bounded bug fix, a single UI component, a single
  documented endpoint) rather than foundational work.
- **External helpers** — same as temporary contributors; no elevated repo
  access beyond opening PRs from a fork or branch as agreed with the
  maintainer.

Access level for each person is tracked in the Notion Team database
(`Maintainer` / `Contributor` / `Isolated / Limited`).

## AI agents and subagents

The rules in `AGENTS.md` apply to every agent working in this repository,
with two additions specific to multi-agent/subagent setups:

- An **audit or research subagent must not mutate repository state**
  (write files, run migrations, commit, push, or edit Notion) unless it has
  been explicitly granted write permission for that task. Read-only
  investigation is always safe to delegate; state changes are not.
- A **research-only agent must not commit or push.** If a task is framed as
  "investigate X" or "audit Y," its output is a report, not a diff — a
  separate, explicitly-scoped follow-up implements any resulting change.

See `AGENTS.md` §15 (Multi-agent compatibility) for the full multi-agent
policy this extends.

## What "Done" means

A task is **Done** only after: it is merged to `main`, the merge is
verified, and — for anything demoable — the result can actually be shown
against the task's acceptance criteria. This matches the Definition of Done
in [docs/developer-onboarding.md](../developer-onboarding.md) §10.
