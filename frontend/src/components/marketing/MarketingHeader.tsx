"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/features", label: "Product" },
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/** Public-site header. Deliberately distinct from `layout/AppHeader`:
 * marketing nav links + auth CTAs, no status check, no sidebar toggle. */
export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary text-[11px] font-bold text-white"
          >
            PL
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Pixel Lane
          </span>
        </Link>

        <nav
          aria-label="Product"
          className="hidden items-center gap-6 text-sm text-zinc-600 dark:text-zinc-300 md:flex"
        >
          {LINKS.map((link, i) => (
            <Link
              key={`${link.href}-${i}`}
              href={link.href}
              className={`transition-colors hover:text-foreground ${
                pathname === link.href ? "font-medium text-foreground" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign In
          </Link>
          <Link
            href="/app"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Open Platform
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="marketing-mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-md border border-border-subtle px-2.5 py-1.5 text-sm md:hidden"
        >
          Menu
        </button>
      </div>

      {open && (
        <div
          id="marketing-mobile-nav"
          className="flex flex-col gap-1 border-t border-border-subtle bg-surface px-4 py-3 md:hidden"
        >
          {LINKS.map((link, i) => (
            <Link
              key={`${link.href}-${i}`}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm text-zinc-600 dark:text-zinc-300"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-border-subtle pt-2">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-md border border-border-subtle px-3 py-1.5 text-center text-sm font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/app"
              onClick={() => setOpen(false)}
              className="rounded-md bg-primary px-3 py-1.5 text-center text-sm font-medium text-white"
            >
              Open Platform
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
