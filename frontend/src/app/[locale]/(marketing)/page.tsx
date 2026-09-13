import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Hero } from "@/components/marketing/Hero";
import { ProductOverview } from "@/components/marketing/ProductOverview";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { PlatformPreview } from "@/components/marketing/PlatformPreview";
import { Capabilities } from "@/components/marketing/Capabilities";
import { ImpactSection } from "@/components/marketing/ImpactSection";
import { CTASection } from "@/components/marketing/CTASection";
import { routing } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.hero" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  return {
    title: tCommon("siteTitle"),
    description: t("description"),
    alternates: {
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      title: tCommon("siteTitle"),
      description: t("description"),
      type: "website",
    },
  };
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProductOverview />
      <HowItWorks />
      <PlatformPreview />
      <Capabilities />
      <ImpactSection />
      <CTASection />
    </>
  );
}
