import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.features" });
  return { title: t("heading"), description: t("description") };
}

const FEATURE_IDS = [
  "cityModel",
  "trafficMonitoring",
  "infrastructureManagement",
  "simulation",
  "analytics",
  "incidentManagement",
  "emergencyPriority",
  "computerVision",
] as const;

const STATUS_STYLE: Record<string, string> = {
  available: "bg-severity-low-bg text-severity-low",
  inDevelopment: "bg-severity-moderate-bg text-severity-moderate",
  planned:
    "border border-dashed border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400",
};

export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.features" });
  const tStatus = await getTranslations({
    locale,
    namespace: "common.featureStatus",
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("heading")}</h1>
      <p className="mt-3 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        {t("description")}
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FEATURE_IDS.map((id) => {
          const status = t(`items.${id}.status`);
          return (
            <div
              key={id}
              className="rounded-lg border border-border-subtle bg-surface p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">
                  {t(`items.${id}.title`)}
                </h2>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[status]}`}
                >
                  {tStatus(status)}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {t(`items.${id}.description`)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
