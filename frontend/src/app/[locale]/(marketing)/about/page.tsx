import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.about" });
  return { title: t("heading"), description: t("subheading") };
}

const SECTIONS = ["building", "problem", "approach", "vision"] as const;

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.about" });

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("heading")}</h1>
      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        {t("subheading")}
      </p>

      <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {SECTIONS.map((id) => (
          <section key={id}>
            <h2 className="text-lg font-semibold text-foreground">
              {t(`${id}.heading`)}
            </h2>
            <p className="mt-2">{t(`${id}.body`)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
