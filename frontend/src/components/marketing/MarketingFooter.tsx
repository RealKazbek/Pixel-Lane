import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function MarketingFooter() {
  const t = useTranslations("common.footer");

  const columns = [
    {
      titleKey: "productHeading",
      links: [
        { href: "/app", labelKey: "platform" },
        { href: "/features", labelKey: "features" },
        { href: "/app/city-model", labelKey: "cityModel" },
      ],
    },
    {
      titleKey: "companyHeading",
      links: [
        { href: "/about", labelKey: "about" },
        { href: "/contact", labelKey: "contact" },
      ],
    },
    {
      titleKey: "legalHeading",
      links: [
        { href: "/privacy", labelKey: "privacy" },
        { href: "/terms", labelKey: "terms" },
      ],
    },
  ] as const;

  return (
    <footer className="border-t border-border-subtle bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
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
          <p className="mt-3 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
            {t("tagline")}
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.titleKey}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              {t(col.titleKey)}
            </h3>
            <ul className="mt-3 flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-600 hover:text-foreground dark:text-zinc-400"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border-subtle px-4 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400 sm:px-6">
        {t("copyright", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
