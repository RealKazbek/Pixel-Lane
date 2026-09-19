import { Link } from "@/i18n/navigation";
import { MobileNav } from "./MobileNav";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

/** Header for the internal application shell only. Visually distinct from
 * `marketing/MarketingHeader` (no product nav links, no auth CTAs) --
 * inside the app you're already "in the platform". */
export function AppHeader() {
  return (
    <header className="relative border-b border-border-subtle bg-surface">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <MobileNav />
          <Link
            href="/app"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <span
              aria-hidden
              className="inline-flex h-5 w-5 items-center justify-center rounded bg-primary text-[10px] font-bold text-white"
            >
              PL
            </span>
            Pixel Lane
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
