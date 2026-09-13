import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware `Link`/`redirect`/`usePathname`/`useRouter`, built from the
 * shared `routing` config. Use these instead of `next/link` and
 * `next/navigation` anywhere inside `[locale]` routes so links and
 * redirects automatically keep the current locale prefix (e.g. switching
 * language on `/ru/features` produces `/en/features`, not `/en`).
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
