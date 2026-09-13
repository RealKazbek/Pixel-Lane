export type StatusTone =
  "neutral" | "positive" | "warning" | "critical" | "planned";

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
}

const TONE_STYLES: Record<StatusTone, string> = {
  neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  positive: "bg-severity-low-bg text-severity-low",
  warning: "bg-severity-moderate-bg text-severity-moderate",
  critical: "bg-severity-critical-bg text-severity-critical",
  planned:
    "border border-dashed border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400",
};

/** Generic status/state pill. For traffic congestion severity specifically,
 * use `TrafficLevelBadge` instead so the color mapping stays centralized. */
export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-4 ${TONE_STYLES[tone]}`}
    >
      {label}
    </span>
  );
}
