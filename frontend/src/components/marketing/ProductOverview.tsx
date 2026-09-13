import { useTranslations } from "next-intl";

const ITEM_IDS = [
  "cityModel",
  "trafficAnalysis",
  "infrastructurePlanning",
  "trafficSimulation",
  "incidentMonitoring",
  "emergencyPriority",
] as const;

export function ProductOverview() {
  const t = useTranslations("marketing.productOverview");
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
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ITEM_IDS.map((id) => (
          <div
            key={id}
            className="rounded-lg border border-border-subtle bg-surface p-5 transition-colors hover:border-primary/40"
          >
            <h3 className="text-sm font-semibold">{t(`items.${id}.title`)}</h3>
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              {t(`items.${id}.description`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
