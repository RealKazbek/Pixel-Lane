import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MetricCard } from "@/components/ui/MetricCard";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatusCheck } from "@/components/status-check";

/** Landing dashboard for the internal app. Deliberately does not reach
 * into the city-viewer feature's internal hooks (its README limits
 * imports to its `CityViewerApp` entry component) -- live network
 * metrics live on the City Model screen instead of being duplicated
 * here; everything else is an explicit "not connected" state rather
 * than a fabricated number. */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const tStatus = await getTranslations({
    locale,
    namespace: "common.featureStatus",
  });
  const tCommonStatus = await getTranslations({
    locale,
    namespace: "common.status",
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 overflow-y-auto px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t("description")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label={t("metrics.cityModel.label")}
          value={t("metrics.cityModel.value")}
          hint={t("metrics.cityModel.hint")}
        />
        <MetricCard
          label={t("metrics.simulation.label")}
          value={t("metrics.simulation.value")}
          status={<StatusBadge label={tStatus("planned")} tone="planned" />}
          hint={t("metrics.simulation.hint")}
        />
        <MetricCard
          label={t("metrics.incidents.label")}
          value={t("metrics.incidents.value")}
          status={<StatusBadge label={tStatus("planned")} tone="planned" />}
          hint={t("metrics.incidents.hint")}
        />
      </div>

      <Panel title={t("systemStatus.heading")}>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">
              {t("systemStatus.backendApi")}
            </span>
            <StatusCheck
              messages={{
                checking: tCommonStatus("backendApi", {
                  status: tCommonStatus("checking"),
                }),
                reachable: tCommonStatus("backendApi", {
                  status: tCommonStatus("reachable"),
                }),
                unreachable: tCommonStatus("backendApi", {
                  status: tCommonStatus("unreachable"),
                }),
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">
              {t("systemStatus.simulationEngine")}
            </span>
            <StatusBadge label={tCommonStatus("notConnected")} tone="neutral" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">
              {t("systemStatus.incidentFeed")}
            </span>
            <StatusBadge label={tCommonStatus("notConnected")} tone="neutral" />
          </div>
        </div>
      </Panel>

      <Panel title={t("quickActions.heading")}>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/city-model"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
          >
            {t("quickActions.openCityModel")}
          </Link>
          <Link
            href="/app/analytics"
            className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {t("quickActions.viewAnalytics")}
          </Link>
          <Link
            href="/app/emergency-priority"
            className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {t("quickActions.emergencyPreview")}
          </Link>
        </div>
      </Panel>
    </div>
  );
}
