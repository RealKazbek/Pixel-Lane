"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_GROUPS } from "./nav-config";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function AppSidebar() {
  const pathname = usePathname();
  const t = useTranslations("common");

  return (
    <nav
      aria-label="Primary"
      className="hidden w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border-subtle bg-surface p-3 md:flex"
    >
      {NAV_GROUPS.map((group) => (
        <div key={group.labelKey} className="flex flex-col gap-0.5">
          <h3 className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {t(`nav.${group.labelKey}`)}
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
                <span className="truncate">{t(`nav.${item.labelKey}`)}</span>
                {item.status === "planned" && (
                  <StatusBadge
                    label={t("featureStatus.planned")}
                    tone="planned"
                  />
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
          <p className="truncate text-xs font-medium">
            {t("actions.guestSession")}
          </p>
          <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {t("actions.signInNotAvailable")}
          </p>
        </div>
      </div>
    </nav>
  );
}
