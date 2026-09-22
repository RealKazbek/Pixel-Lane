import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CityViewerApp } from "@/features/city-viewer/components/CityViewerApp";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return { title: t("siteTitle"), robots: { index: false, follow: false } };
}

/** The localized root is the product workspace, not a marketing landing page. */
export default function HomePage() {
  return <CityViewerApp />;
}
