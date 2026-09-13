import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.privacy" });
  return { title: t("heading") };
}

const SECTIONS = ["status", "collection", "cookies", "contact"] as const;

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.privacy" });

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("heading")}</h1>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {t("lastUpdated", { date: new Date().toISOString().slice(0, 10) })}
      </p>

      <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {SECTIONS.map((id) => (
          <section key={id}>
            <h2 className="text-lg font-semibold text-foreground">
              {t(`${id}.heading`)}
            </h2>
            <p className="mt-2">
              {t.rich(`${id}.body`, {
                l: (chunks) => (
                  <Link
                    href="/contact"
                    className="text-primary hover:underline"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
