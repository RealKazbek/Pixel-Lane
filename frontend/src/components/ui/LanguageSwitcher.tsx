"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

const LOCALE_LABELS: Record<string, string> = {
  kk: "Қазақша",
  ru: "Русский",
  en: "English",
};

const LOCALE_SHORT: Record<string, string> = {
  kk: "ҚАЗ",
  ru: "РУС",
  en: "ENG",
};

/**
 * Reusable trilingual switcher (kk/ru/en). Reused in the marketing header,
 * mobile marketing nav, app header/sidebar, and auth pages -- one
 * implementation, not per-surface copies (see AGENTS.md's i18n rules).
 * Switching locale preserves the current route: `/ru/features` ->
 * `/en/features`, never a reset to the homepage.
 */
export function LanguageSwitcher({
  variant = "compact",
}: {
  variant?: "compact" | "full";
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("common");

  function switchTo(nextLocale: string) {
    router.replace(
      // @ts-expect-error -- `pathname` is a locale-agnostic template whose
      // dynamic segments were already resolved by `useParams`.
      { pathname, params },
      { locale: nextLocale },
    );
  }

  return (
    <div
      role="group"
      aria-label={t("languageSwitcherLabel")}
      className="inline-flex items-center gap-0.5 rounded-md border border-border-subtle p-0.5 text-xs"
    >
      {routing.locales.map((loc) => {
        const isActive = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => switchTo(loc)}
            aria-current={isActive ? "true" : undefined}
            aria-label={LOCALE_LABELS[loc]}
            className={`rounded px-2 py-1 font-medium transition-colors ${
              isActive
                ? "bg-primary text-white"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {variant === "full" ? LOCALE_LABELS[loc] : LOCALE_SHORT[loc]}
          </button>
        );
      })}
    </div>
  );
}
