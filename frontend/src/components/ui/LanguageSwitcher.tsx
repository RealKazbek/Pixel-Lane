"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { routing } from "@/i18n/routing";
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function switchTo(nextLocale: string) {
    router.replace(
      // @ts-expect-error -- `pathname` is a locale-agnostic template whose
      // dynamic segments were already resolved by `useParams`.
      { pathname, params },
      { locale: nextLocale },
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("languageSwitcherLabel")}
        className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span aria-hidden>
          {locale === "kk" ? "🇰🇿" : locale === "ru" ? "🇷🇺" : "🇬🇧"}
        </span>
        {LOCALE_SHORT[locale]}
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 min-w-32 rounded-md border border-border-subtle bg-surface p-1 shadow-lg"
        >
          {routing.locales.map((loc) => (
            <button
              key={loc}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                switchTo(loc);
              }}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${loc === locale ? "bg-primary/10 text-primary" : "text-foreground hover:bg-surface-raised"}`}
            >
              <span aria-hidden>
                {loc === "kk" ? "🇰🇿" : loc === "ru" ? "🇷🇺" : "🇬🇧"}
              </span>
              {LOCALE_SHORT[loc]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
