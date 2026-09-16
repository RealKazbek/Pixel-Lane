# Connecting Claude Code to Notion (MCP)

Pixel Lane's task tracking, epics, team roster, and product decisions live
in Notion — see [project-management.md](project-management.md) for the
canonical source-of-truth split. This page is the one-time setup so your
AI agent (Claude Code, or any other MCP-capable agent) can read and, within
task scope, update that workspace directly instead of you copy-pasting
Notion content into prompts by hand.

This uses Notion's **official, Notion-hosted** MCP server — not a
third-party/community server. If a search turns up an alternative Notion
MCP package, prefer the official one described here unless you have a
specific reason not to.

## You do not need the Notion desktop app

Claude Code talks to Notion over MCP (Model Context Protocol), a direct
API-level connection authorized per-user via OAuth in your browser. The
Notion desktop/web app is where a human browses pages; it is not required
for Claude Code's access and installing it changes nothing about this setup.

## 1. Add the official Notion MCP server

Run once, from anywhere (this registers the server for Claude Code, it is
not repository-specific):

```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

This is Notion's official hosted endpoint (`https://mcp.notion.com/mcp`),
using HTTP transport — the recommended transport for a remote MCP server.
No token, key, or credential is typed into this command; nothing here goes
into the repository.

`--scope` controls where this registration applies (`local` is the
default — current project only; `project` shares it via a `.mcp.json` file
committed to the repo; `user` makes it available across all your projects).
**Do not use `--scope project`** for this server — that would commit
Notion connection configuration into the repository. Use the default
(`local`) or `--scope user`.

## 2. Authorize with OAuth

Claude Code only picks up newly registered MCP servers on startup — restart
your session if you just ran the command above. Then:

1. Run `/mcp` inside Claude Code.
2. Follow the OAuth flow that opens in your browser.
3. Approve access for your Notion account/workspace.

No secret ever needs to be pasted into the terminal, a prompt, or a repo
file — the authorization token is held by Claude Code's own MCP client
configuration outside this repository.

## 3. Verify the connection

Run `/mcp` again. You should see `notion` listed as a connected server with
its tool count. This confirms the connection without touching any Notion
content yet.

## 4. Test read access safely

Ask your agent to do a **read-only** check before ever asking it to write
anything, e.g.:

> Use the Notion MCP connection. Find the page "Pixel Lane — Project
> Guide". Do not modify anything. Report whether you can access it, its
> exact title, its child pages, and whether you have read/write access.

This confirms access without risking an accidental edit. Only after this
succeeds should you ask the agent to act on a specific task.

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

**Safe to edit, within your task's scope:**

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
