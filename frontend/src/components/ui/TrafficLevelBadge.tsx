import { useTranslations } from "next-intl";

export type TrafficLevel = "low" | "moderate" | "high" | "critical";

const LEVEL_STYLES: Record<TrafficLevel, string> = {
  low: "bg-severity-low-bg text-severity-low",
  moderate: "bg-severity-moderate-bg text-severity-moderate",
  high: "bg-severity-high-bg text-severity-high",
  critical: "bg-severity-critical-bg text-severity-critical",
};

interface TrafficLevelBadgeProps {
  level: TrafficLevel;
}

/** The single source of truth for traffic-severity coloring AND labeling.
 * Domain code maps its own enums (congestion level, bottleneck severity,
 * ...) to a `TrafficLevel` before rendering this -- this component has no
 * domain knowledge of its own. Labels come from the `cityModel.severity`
 * translation namespace so a raw backend enum value is never shown
 * directly to users in one language (see AGENTS.md's i18n rules). */
export function TrafficLevelBadge({ level }: TrafficLevelBadgeProps) {
  const t = useTranslations("cityModel.severity");
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-4 ${LEVEL_STYLES[level]}`}
    >
      {t(level)}
    </span>
  );
}
