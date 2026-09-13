import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common.nav" });
  return { title: t("analytics") };
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "analytics" });
  const tStatus = await getTranslations({
    locale,
    namespace: "common.featureStatus",
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight">{t("heading")}</h1>
        <StatusBadge label={tStatus("planned")} tone="planned" />
      </div>
      <EmptyState
        title={t("emptyState.title")}
        description={t("emptyState.description")}
        action={
          <Link
            href="/app/city-model"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            {t("emptyState.action")}
          </Link>
        }
      />
    </div>
  );
}
