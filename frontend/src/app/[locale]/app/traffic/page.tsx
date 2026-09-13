import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TrafficLevelBadge } from "@/components/ui/TrafficLevelBadge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common.nav" });
  return { title: t("traffic") };
}

const METRIC_IDS = [
  "trafficFlow",
  "signalState",
  "congestion",
  "activeVehicles",
] as const;

/** Honest preview: explains the module's intended scope instead of a
 * blank "not implemented" screen. No live data is faked -- see
 * AGENTS.md's no-fake-backend-behavior rule. */
export default async function TrafficPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "traffic" });
  const tStatus = await getTranslations({
    locale,
    namespace: "common.featureStatus",
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 overflow-y-auto px-6 py-8">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t("heading")}</h1>
        <StatusBadge label={tStatus("planned")} tone="planned" />
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {t.rich("description", {
          l: (chunks) => (
            <Link
              href="/app/city-model"
              className="underline underline-offset-2"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>

      <Panel title={t("liveMonitoring.heading")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {METRIC_IDS.map((id) => (
            <div
              key={id}
              className="rounded-md border border-dashed border-border-subtle p-3"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t(`liveMonitoring.metrics.${id}.label`)}
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-400 dark:text-zinc-600">
                —
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
                {t("liveMonitoring.requires", {
                  needs: t(`liveMonitoring.metrics.${id}.needs`),
                })}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title={t("severityLegend.heading")}>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          {t("severityLegend.description")}
        </p>
        <div className="flex flex-wrap gap-2">
          <TrafficLevelBadge level="low" />
          <TrafficLevelBadge level="moderate" />
          <TrafficLevelBadge level="high" />
          <TrafficLevelBadge level="critical" />
        </div>
      </Panel>
    </div>
  );
}
