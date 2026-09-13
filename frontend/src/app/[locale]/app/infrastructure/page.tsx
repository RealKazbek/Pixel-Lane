import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusTone } from "@/components/ui/StatusBadge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common.nav" });
  return { title: t("infrastructure") };
}

const ASSET_IDS = ["roads", "trafficLights", "cameras", "sensors"] as const;

const STATUS_TONE: Record<string, StatusTone> = {
  available: "positive",
  inDevelopment: "warning",
  planned: "planned",
};

export default async function InfrastructurePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "infrastructure" });
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

      <Panel title={t("assetsHeading")}>
        <ul className="flex flex-col divide-y divide-border-subtle">
          {ASSET_IDS.map((id) => {
            const status = t(`assets.${id}.status`);
            return (
              <li key={id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">
                    {t(`assets.${id}.label`)}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t(`assets.${id}.note`)}
                  </p>
                </div>
                <StatusBadge
                  label={tStatus(status)}
                  tone={STATUS_TONE[status]}
                />
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
