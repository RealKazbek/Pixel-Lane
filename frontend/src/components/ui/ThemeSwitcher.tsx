"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

const MODES = ["light", "dark", "system"] as const;
type Mode = (typeof MODES)[number];

// Icons, not first-letter abbreviations: initials collide across
// locales (e.g. Kazakh "Жарық"/"Жүйелік" both start with "Ж").
const MODE_ICON: Record<Mode, React.ReactNode> = {
  light: (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none">
      <circle cx="8" cy="8" r="3.2" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <path d="M8 1.2v1.6M8 13.2v1.6M14.8 8h-1.6M2.8 8H1.2M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1M12.7 12.7l-1.1-1.1M4.4 4.4 3.3 3.3" />
      </g>
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none">
      <path
        d="M13.5 9.8A5.6 5.6 0 0 1 6.2 2.5 5.6 5.6 0 1 0 13.5 9.8Z"
        fill="currentColor"
      />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none">
      <rect
        x="1.5"
        y="2.8"
        width="13"
        height="8.4"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M5.5 14h5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  ),
};

/**
 * Reusable Light/Dark/System switcher -- the theme counterpart of
 * `LanguageSwitcher`, following the same compact-control pattern (see
 * AGENTS.md's theme-support rule and docs/theming.md). One
 * implementation, reused in the marketing header, its mobile nav, and
 * the app header.
 */
export function ThemeSwitcher({
  variant = "compact",
}: {
  variant?: "compact" | "full";
}) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("common.themeSwitcher");

  // `theme` is undefined on the server and on the very first client
  // render (next-themes reads localStorage after mount); both render
  // "system" as the active choice, so there is no hydration mismatch --
  // only a harmless one-frame highlight update once the real value is
  // known (see docs/theming.md).
  const active: Mode = (theme as Mode) ?? "system";

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="inline-flex items-center gap-0.5 rounded-md border border-border-subtle p-0.5 text-xs"
    >
      {MODES.map((mode) => {
        const isActive = mode === active;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setTheme(mode)}
            aria-current={isActive ? "true" : undefined}
            aria-label={t(mode)}
            title={t(mode)}
            className={`rounded px-2 py-1 font-medium transition-colors ${
              isActive
                ? "bg-primary text-white"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {variant === "full" ? (
              t(mode)
            ) : (
              <span className="flex h-3.5 w-3.5 items-center justify-center">
                {MODE_ICON[mode]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
