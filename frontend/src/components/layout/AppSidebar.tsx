"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "./nav-config";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="hidden w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border-subtle bg-surface p-3 md:flex"
    >
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <h3 className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {group.label}
          </h3>
          {group.items.map((item) => {
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-between gap-2 rounded-md border-l-2 px-2.5 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-transparent text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
                }`}
              >
                <span className="truncate">{item.label}</span>
                {item.status === "planned" && (
                  <StatusBadge label="Planned" tone="planned" />
                )}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="mt-auto flex items-center gap-2 rounded-md border border-border-subtle bg-surface-raised px-2.5 py-2">
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
        >
          G
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">Guest session</p>
          <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            Sign-in not yet available
          </p>
        </div>
      </div>
    </nav>
  );
}
