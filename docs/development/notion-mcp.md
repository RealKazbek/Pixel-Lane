# Connecting an AI agent to Notion (MCP)

Pixel Lane's task tracking, epics, team roster, and product decisions live
in Notion — see [project-management.md](project-management.md) for the
canonical source-of-truth split. This page is the one-time setup so an AI
coding agent can read (and, within task scope, update) that workspace
directly instead of a human copy-pasting Notion content into every prompt.

**This is optional, not mandatory.** Pixel Lane supports Claude Code,
Codex, Gemini CLI, and other compatible coding agents equally — see
[docs/ai-development.md](../ai-development.md)'s agent capability matrix.
None of them requires Notion MCP to contribute: if it isn't configured (or
isn't supported by your agent/version yet), use the
[No-MCP fallback](#no-mcp-fallback) below. A developer is never required to
install or use Claude Code specifically to work on Pixel Lane.

## Common concept (applies to every agent)

- **Endpoint.** Notion's official, Notion-hosted MCP server:
  `https://mcp.notion.com/mcp`. This is the **official** server — if a
  search turns up a third-party/community Notion MCP package, prefer this
  one unless you have a specific reason not to.
- **You do not need the Notion desktop app.** MCP is a direct, per-user,
  OAuth-authorized API connection. The desktop/web app is where a human
  browses pages; it's irrelevant to an agent's access.
- **OAuth, not a pasted secret.** Every setup below ends in a browser-based
  OAuth approval. No token, key, or credential is ever typed into a
  terminal, a prompt, or a repository file — the resulting authorization is
  held by your coding agent's own local configuration (e.g. `~/.claude/`,
  `~/.codex/`, `~/.gemini/`), outside this repository, and must stay that
  way.
- **Permissions.** OAuth approval is scoped to your own Notion account and
  whatever workspace access you already have — it does not grant the agent
  anything you couldn't already do yourself in Notion.
- **No secrets in the repo, ever.** Don't add a project-scoped MCP config
  file that embeds a token, and don't commit anything from `~/.claude/`,
  `~/.codex/`, or `~/.gemini/`.

## Claude Code

Verified against Notion's current official docs (`developers.notion.com`).

1. Register the server, **run from the Pixel-Line repository root**:
   ```bash
   claude mcp add --transport http notion https://mcp.notion.com/mcp
   ```
   This uses the default `--scope local` — registration is tied to your
   current working directory, so it only takes effect for *this* project
   if you run it from the repo root; running it elsewhere registers the
   server for whatever project you happen to be in instead.

   If you want this connection available in every project regardless of
   which repository you're in, use `--scope user` instead (an officially
   documented, verified alternative — not project-specific):
   ```bash
   claude mcp add --transport http --scope user notion https://mcp.notion.com/mcp
   ```
   **Do not use `--scope project`** for either case — that scope shares
   its config via a `.mcp.json` file committed to the repo, which would
   commit Notion connection configuration into the repository.
2. Restart Claude Code (new MCP servers are only picked up on startup).
3. Run `/mcp` and follow the OAuth flow in your browser.
4. Run `/mcp` again to confirm `notion` is listed as connected.

## Codex

Codex CLI supports MCP servers, configured in `~/.codex/config.toml` (or a
trusted project-local `.codex/config.toml`) under `[mcp_servers.<name>]`
blocks, and an interactive `codex mcp add` command exists for adding one.
Configured servers are verified inside a Codex session with `/mcp`, or from
the shell with `codex mcp list`.

The exact flags `codex mcp add` accepts for a **remote, OAuth-authenticated**
server (as opposed to a local command-based server) are version-dependent
and were not consistently documented at the time of writing — run
`codex mcp add --help` in your installed version, or follow OpenAI's current
official guide, rather than trusting a copied command here:
<https://developers.openai.com/codex/mcp>.

If your Codex CLI version doesn't support a remote OAuth MCP server yet, or
you haven't set it up, use the [No-MCP fallback](#no-mcp-fallback).

## Gemini CLI

Gemini CLI supports MCP servers via a `mcpServers` object in `settings.json`
(`~/.gemini/settings.json` for all projects, or `.gemini/settings.json`
project-scoped). As of this writing there is no `gemini mcp add` CLI
command — servers are added by editing `settings.json` directly. Connected
servers are verified inside a Gemini CLI session with `/mcp`.

The exact JSON shape for a remote, OAuth-authenticated server varies across
recent Gemini CLI versions/docs sources (field names like `httpUrl` vs.
`url`, and how much of the OAuth flow is auto-discovered, differ by
version) — follow Google's current official docs for the exact syntax
rather than a copied snippet here: <https://geminicli.com/docs/tools/mcp-server/>.

If your Gemini CLI version doesn't support this yet, or you haven't set it
up, use the [No-MCP fallback](#no-mcp-fallback).

## No-MCP fallback

If Notion MCP is unavailable, unsupported, not authenticated, or simply not
configured in your session, the workflow still works — a human copies the
**required task fields** into the prompt instead of the agent fetching them:

- Copy exactly the fields in
  [task-template.md](task-template.md) (Task ID, Goal, Module, Acceptance
  Criteria, Dependencies, at minimum) — see the Form B prompt example in
  [ai-prompting.md](../ai-prompting.md).
- **Do not** copy unrelated Notion content into the prompt "just in case"
  — not other tasks, not Epics/Team/Decisions records, not private
  workspace content beyond what this one task needs.
- An agent that was told to work on a Task ID but has neither MCP access
  nor pasted task fields **must stop and ask** for the task content — it
  must never invent a goal, scope, acceptance criteria, dependencies, or
  module from the Task ID or title alone. See
  [docs/ai-development.md](../ai-development.md)'s startup protocol.
- Task status transitions (`Ready` → `In Progress` → `Review` → `Done`,
  etc.) are then a **manual, human responsibility** in Notion — an agent
  without write access to Notion cannot and must not claim to have updated
  task status.

The absence of Notion MCP must never block code work once the task has
been fully specified some other way.

## Where things live

- **[Pixel Lane — Project Guide](https://app.notion.com/p/3dc56325f84081c79e59ece0a7be12d4)**
  — product vision, users, roadmap narrative (Notion pages 00–10).
- **[Development Workspace](https://app.notion.com/p/3dc56325f840814e9c2fdc672f18d5d7)**
  (a child page of the Project Guide above) — the operational databases:
  **Tasks**, **Epics**, **Team**, **Decisions**. This is where you self-pick
  work — see [project-management.md](project-management.md) for the full
  lifecycle.

If you land on the Project Guide and don't see "Development Workspace"
listed among its child pages, ask the maintainer for access — don't
recreate it.

## What developers (and their AI agents) should and should not edit

**Safe to edit, within your task's scope, when you have write access:**

- Your own Task's `Status`, `Assignee`, `Branch`, `Pull Request`, and
  `Notes` fields as you move it through the lifecycle.
- Creating a new Task in the Tasks database (as Backlog, with a real Goal
  and Acceptance Criteria) to propose new work.

**Do not edit without the maintainer's explicit sign-off:**

- Epics, Team, or Decisions records — these represent product-level
  ownership and architecture calls, not implementation detail.
- Any task other than the one you're actively assigned to.
- The Project Guide's numbered pages (00–10) — product vision content.
- The Development Workspace page's own structure, or its databases'
  schemas (columns/options) — propose a change to the maintainer instead of
  changing it directly.

**Never:**

- Create a new, parallel Notion page or database for task tracking when the
  Development Workspace already exists — use its Tasks database.
- Put Notion tokens, OAuth credentials, cookies, or any other secret in a
  prompt, a commit, or any repository file.

An AI agent doing read-only research/audit work must not write to Notion at
all unless the task explicitly grants it write permission — see
`AGENTS.md` §15 and [project-management.md](project-management.md)'s
"AI agents and subagents" section.
