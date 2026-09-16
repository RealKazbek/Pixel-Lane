# Task template

Fields for a new entry in the Notion **Tasks** database (Development
Workspace, under [Pixel Lane — Project Guide](https://app.notion.com/p/3dc56325f84081c79e59ece0a7be12d4)).
See [project-management.md](project-management.md) for the full lifecycle.

## What must exist before a task can move to Ready

A task stays in `Backlog` until all of the following are filled in with
enough detail that someone other than the author could pick it up:

- **Task** — short, specific title.
- **Task ID** — `PL-XXX`.
- **Priority** — Critical | High | Medium | Low, where applicable.
- **Module** — one of: City Model | Map / Renderer / Editor | Road Geometry
  | Simulation | Traffic Control | Data Platform | Backend / API |
  Frontend / Operations UI | Platform / CI | Emergency | Documentation.
- **Epic** — the linked Epic, where one applies.
- **Dependencies** — other tasks/epics this depends on, or "None".
- **Goal** — one or two sentences: why this task exists, and its scope
  (what it touches). If scope creep is a real risk, say explicitly what is
  *out of scope* here too — a picker should never have to guess the
  boundary.
- **Acceptance Criteria** — concrete, checkable conditions for "this is
  done," including any required validation or demo (see "Demo Required"
  below and [project-management.md](project-management.md)'s Definition of
  Done).
- **Demo Required** — whether the change is user-visible/demoable.

Only once all of the above are in place does the task move to `Ready`. A
task missing any of these stays in `Backlog`, not `Ready` — self-picking
requires knowing the goal, module, and acceptance criteria up front, not
discovering them mid-implementation.

## Filled in later, during the task's lifecycle — not required for Ready

These fields are legitimately populated as the task moves through
`In Progress → Review → Done`, never before someone self-picks it, and
their absence does **not** block moving the task to `Ready`:

- **Status** — moves through the lifecycle itself.
- **Assignee** — set when someone self-picks the task, moving it to
  `In Progress` — never filled in before that.
- **Branch** — set once the implementer creates their branch.
- **Reviewer** — usually the maintainer; may be set at self-pick time or
  left until Review.
- **Pull Request** — set once the PR is opened.
- **Notes** — may be added at any point in the lifecycle.

## The field reference

```
Task:                 <short, specific title>                        [before Ready]
Task ID:              PL-XXX                                         [before Ready]
Status:               Backlog                                        [lifecycle]
Priority:             Critical | High | Medium | Low                 [before Ready]
Epic:                 <linked Epic>                                  [before Ready]
Module:               City Model | Map / Renderer / Editor | Road Geometry |
                       Simulation | Traffic Control | Data Platform |
                       Backend / API | Frontend / Operations UI |
                       Platform / CI | Emergency | Documentation      [before Ready]
Assignee:             <filled in on self-pick, not before>            [lifecycle]
Reviewer:             <usually the maintainer>                       [lifecycle]
Dependencies:         <other tasks/epics this depends on, or "None">  [before Ready]
Branch:               feat/fix/docs/refactor/PL-XXX-short-description [lifecycle]
Pull Request:         <filled in once opened>                        [lifecycle]
Goal:                 <one or two sentences: why this task exists,
                       its scope, and out-of-scope if relevant>       [before Ready]
Acceptance Criteria:  <concrete, checkable conditions for "this is done">
                                                                       [before Ready]
Demo Required:        <true if the change is user-visible/demoable>   [before Ready]
Notes:                <anything else a picker needs to know>          [lifecycle]
```

## Writing good acceptance criteria

- Concrete and checkable, not aspirational ("renders X" not "improves UX").
- Scoped to exactly this task — do not fold in unrelated cleanup.
- If the change is user-facing, include: `kk`/`ru`/`en` translations
  complete, verified in Light and Dark (see AGENTS.md §20–21).
- If the change touches a public contract (API, schema, City Model,
  Traffic Engine result), name the consumers that must still work.

## Isolated tasks for temporary/external contributors

Prefer tasks that:

- touch one module (see the Module list above);
- have no dependency on an in-flight, unmerged task;
- can be validated without special local setup beyond what
  [docs/development.md](../development.md) already documents;
- have a clear "done" a reviewer can check without deep project context.
