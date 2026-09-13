#!/usr/bin/env node
// Filesystem/text validation only — this does NOT prove that any AI agent
// actually reads or obeys these files at runtime. It only catches the
// cheap, mechanical failure mode: a required instruction file goes
// missing, or an entry-point file stops pointing back at AGENTS.md.
// See docs/ai-agent-audit.md for what this can't verify.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function read(relPath) {
  return readFileSync(path.join(root, relPath), "utf8");
}

function requireFile(relPath) {
  if (!existsSync(path.join(root, relPath))) {
    errors.push(`missing required file: ${relPath}`);
    return null;
  }
  return read(relPath);
}

function requireContains(relPath, content, needle, label) {
  if (content !== null && !content.includes(needle)) {
    errors.push(`${relPath} no longer ${label} (expected to find ${JSON.stringify(needle)})`);
  }
}

const agents = requireFile("AGENTS.md");
const claude = requireFile("CLAUDE.md");
const gemini = requireFile("GEMINI.md");
const frontendClaude = requireFile("frontend/CLAUDE.md");

requireContains("CLAUDE.md", claude, "AGENTS.md", "points back to AGENTS.md");
requireContains("GEMINI.md", gemini, "AGENTS.md", "points back to AGENTS.md");
requireContains(
  "frontend/CLAUDE.md",
  frontendClaude,
  "AGENTS.md",
  "points back to AGENTS.md",
);
requireContains(
  "AGENTS.md",
  agents,
  "canonical instruction set for Codex",
  "declares itself canonical for Codex",
);
requireContains(
  "AGENTS.md",
  agents,
  "Internationalization",
  "still contains the Internationalization section",
);

const skillDirs = [
  "architecture-review",
  "backend-review",
  "database-review",
  "design-review",
  "frontend-review",
  "performance-review",
  "pre-ship",
  "security-review",
  "testing",
];
for (const skill of skillDirs) {
  const skillPath = `.agents/skills/${skill}/SKILL.md`;
  if (!existsSync(path.join(root, skillPath))) {
    errors.push(`missing skill referenced by AGENTS.md: ${skillPath}`);
  }
}

requireFile("frontend/scripts/check-i18n.mjs");
requireFile("docs/i18n.md");
requireFile("docs/ai-development.md");
requireFile("docs/ai-agent-audit.md");

if (errors.length > 0) {
  console.error("✗ check:agents failed:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error(
    "\nNote: this only checks file presence and cross-references — it cannot prove\n" +
      "that Claude, Codex, or Gemini actually load or follow these files at runtime.",
  );
  process.exit(1);
}

console.log(
  "✓ check:agents passed — required instruction files and cross-references present\n" +
    "  (filesystem/text check only — does not prove runtime agent behavior)",
);
