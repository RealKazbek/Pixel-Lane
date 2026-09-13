import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common.nav" });
  return { title: t("emergencyPriority") };
}

const WORKFLOW_IDS = [
  "request",
  "routeAnalysis",
  "affectedIntersections",
  "signalPriority",
  "routeNormalization",
] as const;

export default async function EmergencyPriorityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "emergency" });
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
        {t("description")}
      </p>

      <Panel title={t("workflowHeading")}>
        <ol className="flex flex-col gap-0">
          {WORKFLOW_IDS.map((id, i) => (
            <li key={id} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-raised text-[11px] font-medium">
                  {i + 1}
                </span>
                {i < WORKFLOW_IDS.length - 1 && (
                  <span className="h-6 w-px bg-border-subtle" />
                )}
              </div>
              <span className="pb-6 pt-0.5 text-sm">{t(`workflow.${id}`)}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel
        title={t("sample.heading")}
        actions={
          <StatusBadge label={t("sample.previewBadge")} tone="planned" />
        }
      >
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">
            {t("sample.vehicle")}
          </dt>
          <dd className="text-right font-medium">{t("sample.vehicleValue")}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">
            {t("sample.route")}
          </dt>
          <dd className="text-right font-medium">{t("sample.routeValue")}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">
            {t("sample.status")}
          </dt>
          <dd className="text-right">
            <StatusBadge label={t("sample.statusValue")} tone="warning" />
          </dd>
          <dt className="text-zinc-500 dark:text-zinc-400">
            {t("sample.lightsAffected")}
          </dt>
          <dd className="text-right font-medium">4</dd>
        </dl>
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          {t("sample.note")}
        </p>
      </Panel>
    </div>
  );
}
