import type { HTMLAttributes, ReactNode } from "react";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Consistent bordered surface container used across dashboard, map and
 * placeholder screens. Not a layout primitive -- callers own spacing
 * between panels. */
export function Panel({
  title,
  actions,
  children,
  className = "",
  ...rest
}: PanelProps) {
  return (
    <div
      className={`rounded-lg border border-border-subtle bg-surface ${className}`}
      {...rest}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-2.5">
          {title && (
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
