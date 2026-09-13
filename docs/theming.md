# Theming (Light / Dark / System)

Pixel Lane supports Light, Dark, and System appearance modes. This is a
permanent, project-wide requirement — see `AGENTS.md`'s "Appearance /
Theming — Mandatory" section (§ 21) for the policy every agent must
follow. This document is the workflow.

## Supported modes

| Mode     | Behavior                                                        |
| -------- | ---------------------------------------------------------------- |
| `light`  | Always light, regardless of OS preference.                       |
| `dark`   | Always dark, regardless of OS preference.                        |
| `system` | Follows the OS's `prefers-color-scheme` live. **Default.**       |

## Technology

[`next-themes`](https://github.com/pacocoursey/next-themes) v0.4, chosen
because it is a small, actively maintained, framework-agnostic library
purpose-built for exactly this problem (no server/client hydration
mismatch, an inline pre-hydration script, live `prefers-color-scheme`
tracking for System mode) and its documented peer range
(`react: ^16.8 || ^17 || ^18 || ^19`) covers this project's React 19.
There was no existing theme library or partial implementation to extend —
before this, dark styling only ever followed `prefers-color-scheme`
automatically, with no user override and no persistence.

## Architecture

```
frontend/src/components/theme/ThemeProvider.tsx   next-themes config (attribute="data-theme", storageKey)
frontend/src/components/ui/ThemeSwitcher.tsx      the switcher UI (Light/Dark/System)
frontend/src/app/globals.css                      the only place theme colors are defined
```

`next-themes` writes `data-theme="light"` or `data-theme="dark"` on
`<html>` before first paint (its own inline script — no flash of the
wrong theme, no hydration warning beyond the one attribute, which is why
`layout.tsx` has `suppressHydrationWarning` on `<html>` specifically).
`globals.css` defines two things off that attribute:

1. **CSS custom properties** — light values live on `:root` as the
   default (so a pre-hydration/no-JS render is never unstyled); dark
   values live on `[data-theme="dark"]` and override them.
2. **Tailwind's `dark:` variant itself** — repointed with
   `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`
   so every existing `dark:*` utility class already used across the app
   (buttons, borders, hover states, etc.) responds to the explicit
   `data-theme` attribute instead of only `prefers-color-scheme`. This is
   why migrating the current UI needed almost no per-component changes —
   the existing `dark:` classes started working correctly for an explicit
   user choice automatically once this one line changed.

## Semantic tokens

Consume these — never a literal hex/RGB value or a fixed Tailwind color
(`bg-white`, `text-black`) for anything that should adapt to theme:

```
background, foreground
surface, surface-raised, surface-elevated
border-subtle, text-muted
primary, primary-hover, accent-cyan
success, warning, danger
severity-low, severity-moderate, severity-high, severity-critical
  (+ each has a "-bg" pair, e.g. severity-low-bg)
```

Each is a Tailwind utility (`bg-surface`, `text-text-muted`,
`border-border-subtle`, etc.) via `@theme inline` in `globals.css`, backed
by the CSS custom property of the same name. Add a new token only when an
existing one genuinely doesn't cover the case — don't invent a
one-off `--my-component-color`.

## Adding a theme-aware component

1. Reach for an existing semantic token or an already-used `dark:` pair
   first (grep the codebase — most patterns already exist).
2. If truly new, add the property to both `:root` and `[data-theme="dark"]`
   in `globals.css`, and its `@theme inline` mapping, following the
   existing token names' style.
3. Do not add a component-local `useTheme()` branch just to pick a color —
   that's what the tokens are for. `useTheme()` (from `next-themes`) is
   only needed by the switcher itself, or by non-CSS consumers like a
   canvas/WebGL layer that can't read a CSS variable directly.
4. Verify the component in both Light and Dark before considering it
   done (see AGENTS.md § 21's Definition of Done).

## The map / City Model workspace

`frontend/src/features/city-viewer/map/styles/` (`mapStyle.ts`,
`roadStyle.ts`) intentionally keeps its **own** fixed, neutral
"engineering map" palette (a light stone/slate road-surface scale on a
light canvas background) — this is a deliberate, self-contained
visualization convention, like a real GIS tool's map canvas, and was
never theme-reactive even before this system existed; it is unaffected by
the app's Light/Dark toggle by design, not by omission. What *does* use
the shared tokens, and was audited/migrated for the explicit toggle, is
everything around the canvas: the toolbar (`MapToolbar.tsx`), the layer
visibility control (`MapLayersToggle.tsx`), the selected-object details
panel, and the sidebar — these already used `dark:` utilities and now
correctly follow an explicit theme choice via the `@custom-variant`
change above.

## Persistence

`localStorage` only, key `pixel-lane-theme` (`next-themes`'s
`storageKey`). No backend or user-account system is involved — there is
no user-preferences system in this project that owns this concern yet
(see `AGENTS.md` § 21: don't wire this to a backend that doesn't exist).
Reload after choosing Light or Dark keeps that choice; System keeps
following the OS live, including a change made after the page loaded.

## The switcher

`frontend/src/components/ui/ThemeSwitcher.tsx` — one implementation,
reused next to `LanguageSwitcher` in the marketing header (desktop +
mobile) and the app header, following the same compact-control pattern.
Labels come from `common.json`'s `themeSwitcher` key in all three locales
— a theme control is still user-facing UI and follows the i18n rules in
`docs/i18n.md` like anything else.

## Common mistakes to avoid

- Hardcoding a hex/RGB color or a fixed Tailwind color instead of a
  semantic token — it will look right in whichever theme you happened to
  test and wrong in the other.
- Assuming "dark mode" means inverting every color — severity/status
  colors are chosen per theme to stay meaningful, not mechanically
  inverted (see the `severity-*` dark values in `globals.css`).
- Adding a second, parallel theme mechanism (e.g. a component-local
  `isDark` boolean prop) instead of the shared tokens/`data-theme`
  attribute.
- Wiring theme preference to a backend call — it's `localStorage` only.
- Forgetting that a change only checked in one theme is, per AGENTS.md
  § 21, treated the same as a change shipped in only one language.

## Running the validation

There is no dedicated `check:theme` script (unlike `check:i18n`, there is
no cross-file key-parity structure to check mechanically) — theme
correctness is verified by code review (no hardcoded single-theme colors,
tokens used consistently) and, where a browser is available, by actually
toggling Light/Dark/System and checking the affected UI. This is a known,
documented limitation, not a gap papered over — see `docs/ai-agent-audit.md`
for the equivalent honest treatment of i18n's own enforcement gaps.
