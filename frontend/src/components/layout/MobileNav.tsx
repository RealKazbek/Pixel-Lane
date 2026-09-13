"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS } from "./nav-config";
import { StatusBadge } from "@/components/ui/StatusBadge";

/** Small-screen equivalent of `AppSidebar`: a collapsible drawer, not a
 * cut-down editor experience (see AGENTS.md's responsive-priority rules --
 * desktop stays the primary target). */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        className="rounded-md border border-border-subtle px-2.5 py-1.5 text-sm text-zinc-600 dark:text-zinc-300"
      >
        Menu
      </button>

      {open && (
        <div
          id="mobile-nav-drawer"
          className="absolute inset-x-0 top-full z-20 border-b border-border-subtle bg-surface p-2 shadow-sm"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-300"
                }`}
              >
                <span>{item.label}</span>
                {item.status === "planned" && (
                  <StatusBadge label="Planned" tone="planned" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
