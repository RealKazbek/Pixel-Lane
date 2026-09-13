import type { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero";
import { ProductOverview } from "@/components/marketing/ProductOverview";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { PlatformPreview } from "@/components/marketing/PlatformPreview";
import { Capabilities } from "@/components/marketing/Capabilities";
import { ImpactSection } from "@/components/marketing/ImpactSection";
import { CTASection } from "@/components/marketing/CTASection";

export const metadata: Metadata = {
  title: "Pixel Lane — Intelligent Urban Traffic Management",
  description:
    "Pixel Lane helps cities model road infrastructure, analyze traffic, and prepare for simulation-driven improvements to urban mobility.",
  openGraph: {
    title: "Pixel Lane — Intelligent Urban Traffic Management",
    description:
      "Model road infrastructure, analyze traffic, and prepare for simulation-driven urban mobility improvements.",
    type: "website",
  },
};

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
