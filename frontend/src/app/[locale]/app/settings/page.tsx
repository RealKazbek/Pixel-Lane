import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PlannedFeaturePage } from "@/components/layout/PlannedFeaturePage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common.nav" });
  return { title: t("settings") };
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });

  return (
    <div className="flex flex-1 flex-col">
      <PlannedFeaturePage title={t("heading")} description={t("description")} />
      <p className="pb-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {t.rich("statusPageNotice", {
          l: (chunks) => (
            <Link href="/health" className="underline underline-offset-2">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
