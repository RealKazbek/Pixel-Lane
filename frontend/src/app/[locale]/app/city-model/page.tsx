import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CityViewerApp } from "@/features/city-viewer/components/CityViewerApp";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common.nav" });
  return { title: t("cityModel") };
}

export default function Home() {
  return <CityViewerApp />;
}
