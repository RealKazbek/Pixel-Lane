# Task template

Fields for a new entry in the Notion **Tasks** database (Development
Workspace, under [Pixel Lane — Project Guide](https://app.notion.com/p/3dc56325f84081c79e59ece0a7be12d4)).
A task stays in `Backlog` until every field below is filled in with enough
detail that someone other than the author could pick it up — only then does
it move to `Ready`. See [project-management.md](project-management.md) for
the full lifecycle.

```
Task:                 <short, specific title>
Task ID:              PL-XXX
Status:               Backlog
Priority:             Critical | High | Medium | Low
Epic:                 <linked Epic>
Module:               City Model | Map / Renderer / Editor | Road Geometry |
                       Simulation | Traffic Control | Data Platform |
                       Backend / API | Frontend / Operations UI |
                       Platform / CI | Emergency | Documentation
Assignee:             <filled in on self-pick, not before>
Reviewer:             <usually the maintainer>
Dependencies:         <other tasks/epics this depends on, or "None">
Branch:               feat/fix/docs/refactor/PL-XXX-short-description
Pull Request:         <filled in once opened>
Goal:                 <one or two sentences: why this task exists>
Acceptance Criteria:  <concrete, checkable conditions for "this is done">
Demo Required:        <true if the change is user-visible/demoable>
Notes:                <anything else a picker needs to know>
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
