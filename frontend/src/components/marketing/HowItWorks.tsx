import { useTranslations } from "next-intl";

const STEP_IDS = ["model", "analyze", "simulate", "optimize"] as const;

export function HowItWorks() {
  const t = useTranslations("marketing.howItWorks");
  return (
    <section className="border-y border-border-subtle bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("heading")}
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEP_IDS.map((id, i) => (
            <div key={id} className="relative">
              <span className="text-3xl font-semibold text-primary/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-sm font-semibold">
                {t(`steps.${id}.title`)}
              </h3>
              <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                {t(`steps.${id}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
