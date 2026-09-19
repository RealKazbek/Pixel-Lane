"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

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
  void variant;

  function switchTo(nextLocale: string) {
    router.replace(
      // @ts-expect-error -- `pathname` is a locale-agnostic template whose
      // dynamic segments were already resolved by `useParams`.
      { pathname, params },
      { locale: nextLocale },
    );
  }

  const nextLocale = locale === "ru" ? "en" : locale === "en" ? "kk" : "ru";
  return (
    <button
      type="button"
      onClick={() => switchTo(nextLocale)}
      aria-label={t("languageSwitcherLabel")}
      className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-primary"
    >
      <span aria-hidden>
        {locale === "kk" ? "🇰🇿" : locale === "ru" ? "🇷🇺" : "🇬🇧"}
      </span>
      {LOCALE_SHORT[locale]}
    </button>
  );
}
