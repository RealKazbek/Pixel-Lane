import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  status?: ReactNode;
}

/** Compact stat tile for dashboard/analytics summaries. Value should be a
 * real, already-computed number/string -- this component never fetches or
 * derives data itself. */
export function MetricCard({ label, value, hint, status }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        {status}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
    </div>
  );
}
