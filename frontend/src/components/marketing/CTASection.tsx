import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function CTASection() {
  const t = useTranslations("marketing.cta");
  return (
    <section className="border-t border-border-subtle bg-surface-raised">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
        <h2 className="max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("heading")}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/app"
            className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            {t("openPlatform")}
          </Link>
          <Link
            href="/contact"
            className="rounded-md border border-border-subtle px-4 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {t("contactTeam")}
          </Link>
        </div>
      </div>
    </section>
  );
}
