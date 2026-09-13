import { useTranslations } from "next-intl";

const OUTCOME_IDS = [
  "congestion",
  "planning",
  "emergency",
  "dataDriven",
] as const;

/** No numeric impact claims -- Pixel Lane has no production deployments
 * yet, so outcomes are described qualitatively (see AGENTS.md's honesty
 * rules and the task's "avoid fake numeric claims" instruction). */
export function ImpactSection() {
  const t = useTranslations("marketing.impact");
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {t("heading")}
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {OUTCOME_IDS.map((id) => (
          <div key={id} className="flex gap-3">
            <span
              aria-hidden
              className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
            />
            <div>
              <h3 className="text-sm font-semibold">
                {t(`outcomes.${id}.title`)}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t(`outcomes.${id}.description`)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
