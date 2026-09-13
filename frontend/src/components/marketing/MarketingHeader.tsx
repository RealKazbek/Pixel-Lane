"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

const LINK_HREFS = ["/features", "/features", "/about", "/contact"] as const;
const LINK_KEYS = ["product", "features", "about", "contact"] as const;

/** Public-site header. Deliberately distinct from `layout/AppHeader`:
 * marketing nav links + auth CTAs, no status check, no sidebar toggle. */
export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("marketing.header");
  const tCommon = useTranslations("common");

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary text-[11px] font-bold text-white"
          >
            PL
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Pixel Lane
          </span>
        </Link>

        <nav
          aria-label={t("product")}
          className="hidden items-center gap-6 text-sm text-zinc-600 dark:text-zinc-300 md:flex"
        >
          {LINK_HREFS.map((href, i) => (
            <Link
              key={`${href}-${i}`}
              href={href}
              className={`transition-colors hover:text-foreground ${
                pathname === href ? "font-medium text-foreground" : ""
              }`}
            >
              {t(LINK_KEYS[i])}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {tCommon("actions.signIn")}
          </Link>
          <Link
            href="/app"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            {tCommon("actions.openPlatform")}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="marketing-mobile-nav"
          aria-label={
            open ? tCommon("actions.closeMenu") : tCommon("actions.openMenu")
          }
          className="rounded-md border border-border-subtle px-2.5 py-1.5 text-sm md:hidden"
        >
          {tCommon("actions.openMenu")}
        </button>
      </div>

      {open && (
        <div
          id="marketing-mobile-nav"
          className="flex flex-col gap-1 border-t border-border-subtle bg-surface px-4 py-3 md:hidden"
        >
          {LINK_HREFS.map((href, i) => (
            <Link
              key={`${href}-${i}`}
              href={href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm text-zinc-600 dark:text-zinc-300"
            >
              {t(LINK_KEYS[i])}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-3 border-t border-border-subtle pt-3">
            <LanguageSwitcher variant="full" />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-md border border-border-subtle px-3 py-1.5 text-center text-sm font-medium"
            >
              {tCommon("actions.signIn")}
            </Link>
            <Link
              href="/app"
              onClick={() => setOpen(false)}
              className="rounded-md bg-primary px-3 py-1.5 text-center text-sm font-medium text-white"
            >
              {tCommon("actions.openPlatform")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
