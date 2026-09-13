@AGENTS.md

Note: `frontend/AGENTS.md` (included above) is an auto-generated Next.js
file about framework conventions, not project policy. The project's
actual policy is the repository-root `../AGENTS.md` — read it, especially
§ 20 "Internationalization — Mandatory": Pixel Lane is trilingual
(`kk`/`ru`/`en`); any user-facing frontend change must add/keep
translations for all three locales in `frontend/messages/` and pass
`npm run check:i18n` (see `../docs/i18n.md`). Also see § 21 "Appearance /
Theming — Mandatory": any new/modified user-facing UI must use the
semantic tokens in `src/app/globals.css` and work correctly in both Light
and Dark (see `../docs/theming.md`).
