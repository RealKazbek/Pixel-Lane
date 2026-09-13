import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  tone?: "neutral" | "error";
  action?: ReactNode;
}

/** Consistent empty/loading/error messaging block. Use for "no X loaded",
 * "loading X…", and "failed to load X" states across the app instead of
 * ad hoc `<p>` tags. */
export function EmptyState({
  title,
  description,
  tone = "neutral",
  action,
}: EmptyStateProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-6 py-10 text-center">
      <p
        className={`text-sm font-medium ${
          tone === "error"
            ? "text-severity-critical"
            : "text-zinc-600 dark:text-zinc-300"
        }`}
      >
        {title}
      </p>
      {description && (
        <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
