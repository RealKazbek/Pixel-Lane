export type TrafficLevel = "low" | "moderate" | "high" | "critical";

const LEVEL_STYLES: Record<TrafficLevel, string> = {
  low: "bg-severity-low-bg text-severity-low",
  moderate: "bg-severity-moderate-bg text-severity-moderate",
  high: "bg-severity-high-bg text-severity-high",
  critical: "bg-severity-critical-bg text-severity-critical",
};

const LEVEL_LABELS: Record<TrafficLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  critical: "Critical",
};

interface TrafficLevelBadgeProps {
  level: TrafficLevel;
  /** Override the default label, e.g. to show the raw backend enum value. */
  label?: string;
}

/** The single source of truth for traffic-severity coloring. Domain code
 * maps its own enums (congestion level, bottleneck severity, ...) to a
 * `TrafficLevel` before rendering this -- this component has no domain
 * knowledge of its own. */
export function TrafficLevelBadge({ level, label }: TrafficLevelBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-4 ${LEVEL_STYLES[level]}`}
    >
      {label ?? LEVEL_LABELS[level]}
    </span>
  );
}
