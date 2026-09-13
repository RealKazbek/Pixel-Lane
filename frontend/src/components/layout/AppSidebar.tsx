"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-config";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="hidden w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border-subtle bg-surface p-2 md:flex"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              isActive
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            <span className="truncate">{item.label}</span>
            {item.status === "planned" && (
              <StatusBadge label="Planned" tone="planned" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
