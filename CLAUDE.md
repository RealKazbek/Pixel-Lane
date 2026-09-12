# CLAUDE.md

This is the shared development policy for Pixel Lane.

- Read **[AGENTS.md](AGENTS.md)** first — it is the authoritative policy
  (context efficiency, architecture, scalability, technology/library
  selection, database, code quality, security, testing, local resource
  efficiency, frontend/design, git, commit, push, multi-agent, and
  large-codebase-navigation rules).
- Architecture and technology-selection decisions (new dependencies,
  databases, frameworks, module boundaries) always follow AGENTS.md — do
  not make ad hoc calls.
- For a large or unfamiliar subsystem, follow AGENTS.md's task-scoping
  algorithm and source-of-truth hierarchy (§ 2, § 19) instead of reading
  the whole repository.
- Read only the documentation relevant to the current task
  (`docs/architecture.md`, `docs/ai-development.md`) — not both up front.
- Use the appropriate local skill from `.agents/skills/` for the task type
  (see AGENTS.md § Skill routing).
- Do not repeatedly re-read unchanged files during the same task.
- Inspect `git status` before editing; respect other agents' in-progress or
  uncommitted work.
- Run the `pre-ship` skill's checks before finishing a task.
- Commit and push completed user tasks according to AGENTS.md's Git/Commit/
  Push rules.

## Claude commit metadata

When creating a Git commit, use only the repository's configured Git author.
Keep the conventional commit message limited to the actual project change.
Do not add `Co-Authored-By:`, `Claude-Session:`, Claude/Anthropic/AI
attribution, or any other session metadata. Do not modify repository or
global `user.name`/`user.email` unless the user explicitly requests it. This
applies only to future commits; never rewrite existing history.
