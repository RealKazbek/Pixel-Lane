# GEMINI.md

This is a short entry point for Gemini CLI / Gemini Code Assist working in
this repository. It does not duplicate policy — read the real source:

- Read **[AGENTS.md](AGENTS.md)** first. It is the authoritative,
  cross-agent development policy for Pixel Lane (architecture, technology
  selection, database, code quality, security, testing, git/commit/push
  rules, and more) and applies to Gemini exactly as it does to Claude Code
  and Codex.
- **Mandatory:** Pixel Lane is a trilingual product — Kazakh (`kk`,
  default), Russian (`ru`), and English (`en`). See AGENTS.md § 20
  "Internationalization — Mandatory" and `docs/i18n.md`. Before
  implementing any user-facing feature, read that section: every new page,
  component, form, or message must ship with complete translations for
  all three locales in the same change, and `npm run check:i18n` (in
  `frontend/`) must pass.
- **Mandatory:** Pixel Lane supports Light, Dark, and System appearance
  modes via a semantic-token theme system. See AGENTS.md § 21 "Appearance
  / Theming — Mandatory" and `docs/theming.md`. Every new/modified
  user-facing frontend component must use the existing tokens and be
  verified correct in both Light and Dark before it's considered done.
