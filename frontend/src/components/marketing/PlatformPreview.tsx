import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const STAT_IDS = ["roads", "intersections", "bottlenecks"] as const;

/** Static "browser mockup" preview of the internal dashboard shape --
 * not a live embed of the real app (that would either leak internal
 * chrome into the public site or require faking data). Values shown are
 * illustrative labels, never presented as production numbers. */
export function PlatformPreview() {
  const t = useTranslations("marketing.platformPreview");
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("heading")}
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {t("description")}
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-border-subtle bg-surface-raised px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          <span className="ml-3 truncate rounded bg-surface px-2 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            {t("urlLabel")}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
          {STAT_IDS.map((id) => (
            <div
              key={id}
              className="rounded-lg border border-border-subtle p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t(`stats.${id}.label`)}
              </p>
              <p className="mt-2 text-lg font-semibold">
                {t(`stats.${id}.value`)}
              </p>
            </div>
          ))}
        </div>
        <div className="border-t border-border-subtle p-5">
          <Link
            href="/app/city-model"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
