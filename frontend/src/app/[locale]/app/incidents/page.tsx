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
  return { title: t("incidents") };
}

const TYPE_IDS = [
  "accident",
  "roadClosure",
  "congestion",
  "signalFailure",
  "roadworks",
] as const;

export default async function IncidentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "incidents" });
  const tStatus = await getTranslations({
    locale,
    namespace: "common.featureStatus",
  });
  const tCommonStatus = await getTranslations({
    locale,
    namespace: "common.status",
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

      <Panel
        title={t("feedHeading")}
        actions={
          <StatusBadge label={tCommonStatus("noLiveFeed")} tone="neutral" />
        }
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {TYPE_IDS.map((id) => (
            <span
              key={id}
              className="rounded border border-border-subtle px-2 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400"
            >
              {t(`types.${id}`)}
            </span>
          ))}
        </div>
        <div className="rounded-md border border-dashed border-border-subtle p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {t("emptyFeed")}
        </div>
      </Panel>
    </div>
  );
}
