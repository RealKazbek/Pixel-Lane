<!--
Keep this PR scoped to one task. Link the Notion task (PL-XXX) it implements.
See docs/development/project-management.md for the full workflow.
-->

## Task

<!-- Notion Task ID and link, e.g. PL-014 — https://app.notion.com/... -->

## Summary

<!-- One or two sentences: what changed and why. -->

## Changes

<!-- Bullet list of the actual changes. -->

## Why

<!-- The problem/goal this addresses. Link to the task's Goal if it covers this. -->

## Validation

<!-- Exact commands run and their results, e.g. `make frontend-lint`, `make backend-test`. -->

## Screenshots / Demo

<!-- Required if the task's "Demo Required" is set. Before/after screenshots for UI changes. -->

## API / Data Contract Impact

<!-- None, or: which endpoint/schema/City Model/Traffic Engine contract changed, and which consumers were updated. -->

## Known Limitations

<!-- Anything intentionally out of scope or deferred. "None" if none. -->

## Checklist

- [ ] Tests added/updated and passing (`make backend-test` / `make frontend-test` / `make simulation-test` as applicable)
- [ ] Lint passing (`make backend-lint` / `make frontend-lint`)
- [ ] Typecheck passing (`make backend-typecheck` / `make frontend-typecheck`)
- [ ] Build passing (`make frontend-build`)
- [ ] Docs updated (architecture/API/roadmap docs affected by this change)
- [ ] i18n complete for `kk`/`ru`/`en` and `make frontend-check-i18n` passes (user-facing changes only)
- [ ] Migrations included via Alembic, not a hand-edited schema (DB changes only)
- [ ] Visual verification in both Light and Dark (user-facing frontend changes only)
- [ ] No secrets, `.env`, or accidental/generated files in the diff
- [ ] One focused task per PR — no unrelated scope
