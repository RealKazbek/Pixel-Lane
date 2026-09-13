import { useTranslations } from "next-intl";

const CAPABILITY_IDS = [
  "digitalCityModel",
  "roadEditor",
  "severityVisualization",
  "simulationArchitecture",
  "analytics",
  "emergencyPriority",
  "computerVision",
] as const;

const STATUS_STYLE: Record<string, string> = {
  available: "bg-severity-low-bg text-severity-low",
  inDevelopment: "bg-severity-moderate-bg text-severity-moderate",
  planned:
    "border border-dashed border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400",
};

export function Capabilities() {
  const t = useTranslations("marketing.capabilities");
  const tStatus = useTranslations("common.featureStatus");

  return (
    <section className="border-y border-border-subtle bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("heading")}
        </h2>
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CAPABILITY_IDS.map((id) => {
            const status = t(`items.${id}.status`);
            return (
              <li
                key={id}
                className="flex items-center justify-between rounded-lg border border-border-subtle px-4 py-3"
              >
                <span className="text-sm">{t(`items.${id}.title`)}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[status]}`}
                >
                  {tStatus(status)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
