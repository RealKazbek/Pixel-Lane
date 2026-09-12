# CLAUDE.md

This is the shared development policy for Pixel Lane.

- Read **[AGENTS.md](AGENTS.md)** first — it is the authoritative policy
  (context efficiency, architecture, code quality, security, testing,
  frontend/design, git, commit, push, and multi-agent rules).
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
