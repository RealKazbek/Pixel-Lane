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
  return { title: t("simulation") };
}

const CONTROL_IDS = ["start", "pause", "stop", "reset"] as const;

export default async function SimulationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "simulation" });
  const tStatus = await getTranslations({
    locale,
    namespace: "common.featureStatus",
  });
  const tCommonStatus = await getTranslations({
    locale,
    namespace: "common.status",
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight">{t("heading")}</h1>
        <StatusBadge label={tStatus("planned")} tone="planned" />
      </div>
      <Panel title={t("statusHeading")}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {t("state")}
          </span>
          <StatusBadge label={tCommonStatus("notStarted")} tone="neutral" />
        </div>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          {t("notice")}
        </p>
        <div className="mt-4 flex gap-2">
          {CONTROL_IDS.map((id) => (
            <button
              key={id}
              type="button"
              disabled
              title={t("controls.disabledTitle")}
              className="cursor-not-allowed rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-600"
            >
              {t(`controls.${id}`)}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
