# AI Agent Instruction Audit — Pixel Lane

Date: 2026-09-13. Scope: every AI-agent-facing instruction/config file in
this repository, and whether Claude Code, Codex, and Gemini would receive
materially equivalent project rules if independently asked to do the same
task.

This document is an audit, not a redesign. It reports what was found, rates
confidence explicitly (VERIFIED / LIKELY / UNVERIFIED), and lists the small
set of fixes actually applied.

## Executive summary

**Verdict: MOSTLY.**

The three agents are pointed at the same canonical source (`AGENTS.md`) and,
as of this audit, that file explicitly declares itself canonical for all
three. Before today's fix, `docs/ai-development.md` (a secondary, non-
canonical explainer) still only mentioned Claude and Codex and omitted
Gemini entirely — a real staleness bug, now fixed. No contradictory policy
values were found between any two files (no case of "PostgreSQL mandatory"
vs. "SQLite is fine," no diverging default-locale claims, etc.).

The reason this isn't a clean YES:

1. **Discovery mechanism is asserted, not provable from inside this
   session.** Codex's and Gemini's actual file-discovery behavior (does
   Codex really auto-read `AGENTS.md`? does Gemini CLI really auto-read
   `GEMINI.md`?) cannot be executed and observed here — neither CLI is
   installed in this environment. This audit relies on documented/public
   convention plus this repo's own design intent, not a live test. See
   "Remaining uncertainties."
2. **Several important rules are documented-only, with no automated
   enforcement** (hardcoded-string detection, "must commit and push,"
   "must not fake a feature"). An agent that ignores instructions — by
   accident or by a weaker read of ambiguous phrasing — would not be
   stopped by tooling in most of these cases. This is a known, accepted
   trade-off per the project's own Part 20 guidance ("do not build a
   fragile lint plugin"), but it means the policy's real strength is
   "well-documented," not "enforced."
3. **No CI exists** (`.github/` does not exist in this repository at all),
   so none of the checks below run automatically on a PR — they only run
   when an agent or developer chooses to run them locally.

None of this means the three agents are likely to diverge in practice today
— the canonical file is genuinely unified and current — but "the setup
would definitely produce consistent behavior" is not something this session
can prove, only make well-founded.

## Agent comparison

| | Claude Code | Codex | Gemini |
|---|---|---|---|
| Entry point | `CLAUDE.md` (repo root; also `frontend/CLAUDE.md` for the frontend subtree) | `AGENTS.md` directly (native convention) | `GEMINI.md` (repo root) |
| Auto-discovered instructions | `CLAUDE.md` — VERIFIED (this session is Claude Code and is reading exactly this file). Nested `CLAUDE.md` under `frontend/` — VERIFIED present, discovery-on-cd behavior is LIKELY (matches documented Claude Code convention) but not independently tested here. | `AGENTS.md` at repo root — LIKELY (documented Codex CLI convention: reads nearest `AGENTS.md` walking up from cwd), UNVERIFIED in this session since the `codex` CLI is not installed here. | `GEMINI.md` at repo root — LIKELY (documented Gemini CLI/Code Assist convention of reading a root `GEMINI.md`), UNVERIFIED, `gemini` CLI not installed here. |
| Explicitly referenced instructions | `AGENTS.md` (via `CLAUDE.md`'s `@AGENTS.md` include and prose pointer) | `AGENTS.md` is itself the instruction file — no indirection needed | `AGENTS.md` (via `GEMINI.md`'s prose pointer, not a special include syntax) |
| Nested-file behavior | `frontend/CLAUDE.md` exists and both includes `frontend/AGENTS.md` (Next.js-generated, framework-only) and explicitly disclaims it as *not* policy, redirecting to root `AGENTS.md`. No nested files under `backend/`/`simulation/`. | Same nested files apply if Codex also honors `frontend/AGENTS.md`-style nesting — UNVERIFIED whether Codex treats `frontend/AGENTS.md` (the Next.js-generated one) as an instruction file the same way it treats the root one. This is a real ambiguity: Codex's stated convention is to read `AGENTS.md` files, and `frontend/AGENTS.md` matches that filename but is *not* project policy. | N/A — Gemini's entry point is `GEMINI.md`, not `AGENTS.md`, so this nested-`AGENTS.md` ambiguity is Codex-specific. |
| Skill support | `.agents/skills/*/SKILL.md` — Claude Code is explicitly told to use them via `CLAUDE.md`/`AGENTS.md` § Skill routing. Format (YAML frontmatter + Markdown body) matches Claude Code's own skill convention. VERIFIED format is readable/valid for all 9 skills. | `AGENTS.md` § 16 tells Codex to "load the relevant skill from `.agents/skills/`" — LIKELY Codex can read these as plain Markdown files (it has no dedicated "skill" primitive the way Claude Code does), so it depends on Codex actually opening the file when told to, rather than a native discovery mechanism. UNVERIFIED. | Not referenced anywhere in `GEMINI.md` or `AGENTS.md` in Gemini-specific terms; Gemini would only see `.agents/skills/` if it reads `AGENTS.md` § 16 and follows the same textual instruction as Codex. LIKELY works the same way as Codex (plain file read), UNVERIFIED. |
| Known limitations | None beyond the nested-discovery assumption above. | The `frontend/AGENTS.md` naming collision (see above) is a real risk specific to Codex, since Codex's discovery is filename-based. | No Gemini-specific config file conventions were found or created beyond `GEMINI.md` itself; Gemini Code Assist's actual support for a root `GEMINI.md` file is asserted from public documentation, not locally verified. |

## Policy matrix

All values below were read directly from `AGENTS.md` (canonical) and cross-
checked against `CLAUDE.md`, `frontend/CLAUDE.md`, and `GEMINI.md` for
contradiction. **No contradictions were found** — the non-canonical files
either say nothing about a topic (deferring silently to AGENTS.md) or
explicitly repeat/point to the same value.

| Area | Canonical value (AGENTS.md) | Restated elsewhere? | Conflict? |
|---|---|---|---|
| Architecture (no god components, boundary isolation) | § 1, § 3 | No restatement; skills reference it | None |
| Database (PostgreSQL mandatory, no SQLite as primary) | § 5, § 6 | Not restated elsewhere | None |
| Security (no secrets, `.env` handling, validation) | § 7 | Not restated elsewhere | None |
| Frontend (strict TS, component boundaries, a11y) | § 11 | Not restated elsewhere | None |
| Backend (API/domain separation) | § 1, backend-review skill | skill doesn't restate values, only checklist | None |
| i18n (`kk`/`ru`/`en`, `kk` default) | § 20 | `CLAUDE.md`, `frontend/CLAUDE.md`, `GEMINI.md` all restate *the same* `kk` default and 3-locale requirement as reinforcement, always pointing back to § 20 | None — all four files agree |
| Testing (lint/typecheck/tests/build/check:i18n) | § 8, pre-ship skill | pre-ship skill lists the same checks | None |
| Git (diff review, logical commits, push, verify remote) | § 12–14, § 17 | Not restated elsewhere | None |
| Commit attribution (`Co-Authored-By`/session trailers) | Not addressed in AGENTS.md at all | **Only exists in root `CLAUDE.md`'s "Claude commit metadata" section** — a Claude-specific rule with no AGENTS.md counterpart | See "Silent weaknesses" below — this is a real gap, not a conflict |
| Documentation upkeep | § 17 point 9 | Not restated elsewhere | None |
| Product honesty (no fake data/features) | Not a numbered AGENTS.md section, but implied throughout § 4 ("avoid disposable architecture") and reinforced ad hoc in recent frontend work | Not codified as an explicit rule anywhere | See "Silent weaknesses" |

## Enforcement matrix

| Rule | Documented | Enforcement |
|---|---|---|
| `kk`/`ru`/`en` key parity | Yes (§ 20) | **Fully enforced** — `npm run check:i18n` (`frontend/scripts/check-i18n.mjs`) fails the build step if any namespace's keys diverge across locales. Verified: ran it, passed (12/12 namespaces). |
| No hardcoded English JSX | Yes (§ 20, frontend-review skill) | **Not enforced** — no lint rule, no static check. Purely a review-time human/agent judgment call. |
| PostgreSQL only, no SQLite-as-primary | Yes (§ 5–6) | **Not enforced** by tooling; would only be caught by an agent/human noticing during review. No dependency-level guard prevents `sqlite3`/`aiosqlite` from being added and wired as primary persistence. |
| Secret detection (`.env` never committed) | Yes (§ 7, § 12) | **Partially enforced** — `.gitignore` correctly excludes `.env`/`.env.local`/`.env.*.local` (verified: `git check-ignore -v .env` confirms it's ignored). This prevents *accidental* `git add .` capture but does not prevent a deliberate `git add -f .env`, and there is no secret-scanning tool (gitleaks, trufflehog, etc.) in the repo. |
| Commit + push required after finishing a task | Yes (§ 14, § 17 "mandatory completion gate") | **Not enforced** — no hook, no CI. Entirely dependent on the agent following the instruction. |
| Tests/build before completion | Yes (§ 8, § 17, pre-ship skill) | **Not enforced automatically** — no CI exists in this repo (`.github/` absent) to run these regardless of what an agent claims. Enforcement today is "the agent says it ran them," which this audit cannot independently verify for past sessions either. |
| No fake/planned-as-live features | Implied, not an explicit rule | **Documented only, and only implicitly** — see "Silent weaknesses." |
| Skill existence (referenced skills actually exist) | N/A (meta) | **Now partially enforced** — the new `scripts/check-agents.mjs` (`make check-agents`) checks that every skill directory named in this audit exists, that `CLAUDE.md`/`GEMINI.md`/`frontend/CLAUDE.md` still reference `AGENTS.md`, and that `AGENTS.md` still contains its Codex-canonical and i18n sections. This is filesystem/text presence only — it cannot verify content correctness or agent runtime behavior. |

## Conflicts found

**None** at the policy-value level (no two files assert different values for
the same rule). The one *procedural* gap — commit-attribution rules living
only in Claude-specific `CLAUDE.md` with no AGENTS.md-level statement — is
not a conflict (nothing else states a contradictory value) but is a
**single point of failure**: if a future agent (Codex, Gemini, or a fresh
Claude session working from a different entry point) never opens
`CLAUDE.md`, nothing else in the repository tells it whether attribution
trailers are wanted. See "Silent weaknesses."

## Shadowed / ignored instruction files

- **`frontend/AGENTS.md`** is the one real shadowing risk in this repo: it
  is auto-regenerated by `next dev` and contains only Next.js framework
  notes, not project policy — but its filename exactly matches the pattern
  Codex is documented to search for. An agent that trusts filename
  convention over content could mistake it for policy, or could believe it
  fully represents "the AGENTS.md for the frontend" and stop reading
  further. `frontend/CLAUDE.md` already explicitly warns about this for
  Claude Code; there is no equivalent explicit warning reachable by an
  agent that enters through `frontend/AGENTS.md` directly (there's no way
  to embed a permanent warning in that file since Next.js regenerates it).
- No other file is shadowed. `docs/ai-development.md` was stale (see
  below) but not "shadowing" anything — it simply hadn't been updated.

## Stale configuration

- **`docs/ai-development.md`** (pre-fix): its "Agent entry points" section
  named only Claude Code and Codex, with no mention of Gemini, even though
  `GEMINI.md` already existed in the repository at the time of this audit.
  **Fixed** in this pass — see "Fixes applied."
- No stale routes, removed technology, or dead commands were found in
  `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or the skill files. Every command
  referenced in these files was checked against `frontend/package.json`
  scripts and the root `Makefile` and exists: `npm run lint`, `typecheck`,
  `test`, `format`, `format:check`, `build`, `check:i18n` all exist in
  `frontend/package.json`; `make start-db`, `make start-backend`, `make
  frontend-dev`, etc. all exist in the `Makefile`.
- One **missing convenience mapping**, not staleness: the `Makefile` had no
  target for `npm run check:i18n` even though `AGENTS.md` § 20 and the
  `pre-ship`/`frontend-review` skills instruct agents to run it — an agent
  working from repo root via `make` targets (rather than `cd frontend &&
  npm run ...`) had no equivalent. **Fixed** — added `make
  frontend-check-i18n` and `make check-agents`.

## Silent weaknesses

These are the most important findings — rules that read as protections but
have real gaps:

1. **"No hardcoded English JSX" has no automated backstop.**
   `check:i18n` only proves that keys which exist in translation files are
   present in all three locales; it says nothing about whether a component
   used a translation key at all. A change like
   `<button>Delete</button>` written directly in JSX is **invisible** to
   `check:i18n` — the check has nothing to compare it against, because no
   key was ever added. This is explicitly acknowledged in the project's
   own Part 20 instructions (avoid a fragile lint plugin), so the current
   state — documentation + review-rule only — is a deliberate, accepted
   trade-off, not an oversight. But it should be understood as **WEAK**
   protection in practice, not "handled."

2. **"Do not fake backend functionality / planned features must be
   labeled"** is enforced by nothing except an agent's own judgment and
   whatever a human reviewer catches. There is no lint, no test, no schema
   check that would catch a component silently rendering `Math.random()`
   dashboard numbers as if they were live metrics. This has been handled
   correctly in every session of this project so far by choice/discipline,
   not by any structural guarantee.

3. **Commit-attribution policy lives in exactly one file
   (`CLAUDE.md`)**, addressed only to Claude Code. `AGENTS.md` — the
   file both Codex and Gemini are told is canonical — says nothing about
   whether `Co-Authored-By`/session trailers are wanted. A Codex or Gemini
   session, reading only `AGENTS.md` as instructed, would have **no
   information at all** about this repository's attribution preference and
   might default to whatever its own tool's default behavior is (which
   could be to add trailers, contradicting this repo's evident intent).
   This is the clearest concrete case in the whole audit of "the same task
   run by two agents could produce different, policy-relevant output" —
   not because of a contradiction, but because of an **information gap**
   for two of the three agents. Not fixed in this pass (see "Remaining
   weaknesses") — fixing it means either duplicating the rule into
   AGENTS.md (creates the exact multi-copy drift risk Part 25 warns
   against) or making it genuinely agent-agnostic in AGENTS.md and having
   `CLAUDE.md` merely reference it. The right fix requires knowing whether
   the *intended* policy is Claude-specific or universal — a product
   decision, not something this audit should silently assume. Flagged for
   the user to decide.

4. **"Run tests/build before completion" and "commit and push" are
   entirely self-reported.** With no CI, the only source of truth that
   these steps happened is the agent's own transcript/report. This audit
   cannot verify, and no future audit run purely from inside a coding
   session can verify, that a past agent didn't skip a step and merely
   claim it ran. This is a structural limitation of "no CI," not a
   documentation gap — flagged under Security/Process findings below.

## Security findings

| Finding | Severity | Detail |
|---|---|---|
| No CI/CD pipeline exists (`.github/` absent) | **Medium** | Nothing in this repository enforces any check automatically. All enforcement today is "the agent ran it and says so." This is a process risk, not an active vulnerability, but it means every "fully enforced" claim about local scripts is conditional on someone actually invoking them. |
| No `.claude/`, `.codex/`, or `.gemini/` directory exists anywhere in the repo | **Informational, not a risk** | This means there is no repo-committed permission override, no auto-approval config, no custom hook, and nothing granting elevated/destructive tool access at the repo level. Confirmed by direct filesystem search (`find` for these directory names returned nothing). This is the safe default — nothing to remediate. |
| No secret-scanning tool in the repo or referenced by any instruction file | **Low** | `.gitignore` correctly excludes `.env` variants (verified), which prevents the common accidental-commit case, but there's no automated backstop against a deliberate `git add -f .env` or a secret pasted into a tracked file. AGENTS.md § 7 already tells agents to check for this manually before committing (§ 12, § 17). Given the project's current stage, adding a scanning tool is a reasonable future improvement, not an urgent gap. |
| Commit-attribution information gap (see Silent weaknesses #3) | **Low** | Not a security vulnerability, but a policy-consistency risk with a concrete, identified fix path pending a product decision. |

No secrets, API keys, or credentials were found in any instruction/config
file inspected during this audit (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`,
`frontend/CLAUDE.md`, all 9 `.agents/skills/*/SKILL.md` files, `Makefile`,
`docker-compose.yml`).

## Scoping scenarios

- **A — agent working in `frontend/` only**: still receives root policy.
  `frontend/CLAUDE.md` explicitly includes `@AGENTS.md` (the root file, via
  its relative path resolution) and its prose points to `../AGENTS.md` and
  `../docs/i18n.md`. VERIFIED by reading the file's literal content.
- **B — agent working in `backend/`**: no `backend/CLAUDE.md` or
  `backend/AGENTS.md` exists, so an agent that opens a file *inside*
  `backend/` first (rather than starting from repo root) has no local
  pointer back to root `AGENTS.md` unless its tool's discovery walks
  *up* the directory tree automatically. Claude Code's own documented
  convention does walk up; Codex's documented convention also walks up
  from cwd. This is LIKELY fine for both, but it is asserted from known
  tool convention, not tested in this session (no way to spawn a Codex
  session scoped to `backend/` from here).
- **C — agent starts at root, then edits nested files**: effective policy
  doesn't change — root `AGENTS.md`/`CLAUDE.md` were already loaded and
  nothing in `frontend/CLAUDE.md` overrides them; it only adds a scope note
  and a warning about `frontend/AGENTS.md` not being policy.
- **D — agent starts directly inside `frontend/`**: same as scenario A;
  covered because `frontend/CLAUDE.md` exists and both Claude Code's and
  (by documented convention) Codex's discovery would find it without
  needing to start at root.
- **E — multiple nested instruction files for the same file**: the only
  case in this repo is `frontend/CLAUDE.md` + `frontend/AGENTS.md`
  co-existing. `frontend/CLAUDE.md` wins for Claude Code by definition (a
  Claude-specific file). For Codex, which reads `AGENTS.md` by filename
  convention, `frontend/AGENTS.md`'s auto-generated content could be read
  *instead of or in addition to* the real policy — this is the same risk
  already named under "Shadowed instruction files."

## Failure-case ratings

| Failure case | Current protection |
|---|---|
| Agent ships `<button>Save</button>` untranslated | **WEAK** — documented (§ 20, frontend-review skill), but `check:i18n` cannot detect a string that was never turned into a key at all. Only human/agent review catches it. |
| Agent introduces SQLite as primary persistence | **WEAK** — documented (§ 5–6), no dependency/config guard prevents it. |
| Agent fabricates fake analytics numbers presented as live | **WEAK** — no explicit numbered rule even exists for this beyond the general "avoid disposable architecture" framing in § 4; purely relies on agent judgment and human review. Recommend making this an explicit rule (see Remaining weaknesses). |
| Agent finishes work but doesn't commit/push | **MEDIUM** — § 14 and § 17's "mandatory completion gate" are explicit and specific (including the `git rev-parse HEAD` == `origin/main` self-check), which is stronger than a vague reminder, but there is still no external enforcement — it depends on the agent actually following through, which is a documentation-level, not tooling-level, guarantee. |
| Agent adds its own attribution trailers despite policy | **MEDIUM for Claude specifically** (explicit rule in `CLAUDE.md`, and this rule has been correctly honored in this project's actual git history — verified by inspecting recent commits, none carry `Co-Authored-By`/session trailers). **WEAK/NONE for Codex or Gemini** — see Silent weaknesses #3; those agents have no repo-level instruction on this at all. |
| Agent produces a 1200-line component | **WEAK** — § 3 gives a 300–500 line *guidance* threshold, explicitly "a signal, not a strict rule," with no line-count lint/CI check. |
| Agent commits `.env` | **MEDIUM** — `.gitignore` blocks the common accidental path (verified); no protection against a forced/deliberate add. |
| Backend returns raw English error text, frontend displays it directly | **MEDIUM-STRONG for the one path already audited** — a prior session already found and fixed exactly this bug in the city-viewer road-geometry editor (raw `ApiError.message` was being shown; now uses error codes localized on the frontend). § 20 documents the general rule. No systematic guarantee exists for *future* API integrations, though — this is case-by-case discipline, not a structural backend contract (e.g. no shared "all API errors must be `{code}` shaped" schema/type enforced at the API-client boundary). |
| Agent presents an unfinished feature as fully live | **WEAK**, same as the fake-analytics case above — no explicit named rule, relies on the discipline observed in actual project history (Simulation/Analytics/Incidents/Emergency Priority pages are honestly marked "planned," which is good precedent) rather than an enforceable rule. |

## Recommended architecture

This matches what the repository already does — no restructure recommended,
only the two gaps named below:

```
AGENTS.md                — canonical cross-agent policy (all rule values live here)
CLAUDE.md                — Claude Code bootstrap + Claude-specific integration
  frontend/CLAUDE.md      — same pattern, scoped, with the frontend/AGENTS.md warning
GEMINI.md                 — Gemini bootstrap + reinforcement, mirrors CLAUDE.md's pattern
Codex                     — native AGENTS.md discovery, no dedicated file (correct, avoids
                            an unnecessary duplicate file per the project's own Part 25 rule)
.agents/skills/           — task-specific checklists, assume AGENTS.md already read
docs/ai-development.md    — workflow explainer, links back to AGENTS.md sections
docs/ai-agent-audit.md    — this document; periodically re-run as policy evolves
scripts/check-agents.mjs  — cheap filesystem/text guard against silent drift
```

Two gaps worth a deliberate decision (not fixed automatically in this pass,
since both require a product-level judgment call rather than a mechanical
fix):

1. Decide whether the commit-attribution rule is meant to be
   Claude-specific or universal, and either state it in `AGENTS.md`
   (universal) or explicitly note in `AGENTS.md` that it's Claude-specific
   by design and other agents should use their own default (so Codex/Gemini
   aren't left silently uninformed).
2. Consider adding one explicit numbered rule to `AGENTS.md` for "no
   fabricated data/features presented as live" — today it's implied but
   never stated as its own rule the way i18n and database choice are.

## Fixes applied

1. `docs/ai-development.md` — added Gemini to the "Agent entry points"
   list (previously silently omitted), and added the "Agent instruction
   hierarchy" section required by this repo's own audit process, including
   the `frontend/AGENTS.md`-is-not-policy note and a pointer to this audit
   document.
2. `Makefile` — added `frontend-check-i18n` and `check-agents` targets so
   `npm run check:i18n` and the new config-integrity check are reachable
   the same way other frontend checks already are (`make frontend-lint`,
   etc.), and added both to the `.PHONY` list.
3. `scripts/check-agents.mjs` (new) — a small, honestly-scoped filesystem
   check: confirms `AGENTS.md`/`CLAUDE.md`/`GEMINI.md`/`frontend/CLAUDE.md`
   exist and still cross-reference `AGENTS.md`; confirms `AGENTS.md` still
   declares itself canonical for Codex and still contains its
   Internationalization section; confirms every skill directory referenced
   in this audit still exists; confirms `frontend/scripts/check-i18n.mjs`,
   `docs/i18n.md`, `docs/ai-development.md`, and this audit doc exist. It
   explicitly logs that it cannot prove runtime agent behavior — see its
   header comment.
4. This document.

No changes were made to `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or any skill
file — none of them contained a confirmed conflict or stale reference that
needed correction. The two policy gaps identified above (attribution scope,
explicit anti-fabrication rule) are intentionally left for the user to
decide rather than resolved unilaterally.

## Remaining weaknesses

- Hardcoded-JSX-string detection remains documentation-only (accepted
  trade-off per the project's own guidance, but still a real gap).
- "No fabricated live data" has no dedicated rule statement.
- Commit-attribution policy is Claude-only; Codex/Gemini have no repo-level
  guidance on this specific point.
- No CI exists, so every "enforced" claim in the enforcement matrix is
  conditional on a human or agent actually running the check locally.
- No secret-scanning tool beyond `.gitignore` coverage.

## Remaining uncertainties

- Whether Codex's actual file-discovery walks up the directory tree the way
  documented, and whether it would treat `frontend/AGENTS.md` (Next.js-
  generated) as policy — **UNVERIFIED**, no Codex CLI available in this
  environment to test directly.
- Whether Gemini CLI/Code Assist actually auto-discovers a root `GEMINI.md`
  file in this repository's exact setup — **UNVERIFIED**, no Gemini CLI
  available in this environment to test directly.
- Whether `.agents/skills/*/SKILL.md` is ever *automatically* surfaced to
  Codex or Gemini (as opposed to being read only because `AGENTS.md` § 16
  tells the agent, in prose, to go open the file) — **UNVERIFIED**, likely
  the latter (a plain-text instruction followed manually) for both, since
  neither has a documented native "skill" primitive the way Claude Code
  does.
- Whether any of this repository's past AI sessions that claimed to run
  tests/builds/checks actually did so faithfully — **UNVERIFIABLE from
  inside a future session**, since there is no CI trail independent of the
  agent's own transcript.

## Validation run for this audit

- `node scripts/check-agents.mjs` (new script): passes after this audit's
  fixes (fails correctly beforehand, when `docs/ai-agent-audit.md` didn't
  exist yet — confirmed the failure path works).
- `cd frontend && npm run check:i18n`: passes, 12/12 namespaces consistent
  across `kk`/`ru`/`en` (no frontend code was touched in this audit, so this
  merely reconfirms existing state).
- No frontend/backend code was modified in this audit, so `lint`,
  `typecheck`, `test`, and `build` were not re-run — only the two
  documentation files, the `Makefile`, and the new script were touched.
  `format`/`format:check` were not run against the new script; it was
  hand-written to match this repo's existing style (2-space indent, double
  quotes, semicolons) but has not been passed through Prettier since no
  root-level Prettier config targets `scripts/`. Flagged rather than
  silently assumed clean.
