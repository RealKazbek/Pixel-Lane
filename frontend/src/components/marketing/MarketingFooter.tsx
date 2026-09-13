import Link from "next/link";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/app", label: "Platform" },
      { href: "/features", label: "Features" },
      { href: "/app/city-model", label: "City Model" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border-subtle bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
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
          <p className="mt-3 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
            A developing smart-city platform for modeling road networks,
            analyzing traffic, and preparing infrastructure for
            simulation-driven urban mobility decisions.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              {col.title}
            </h3>
            <ul className="mt-3 flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-600 hover:text-foreground dark:text-zinc-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border-subtle px-4 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400 sm:px-6">
        © {new Date().getFullYear()} Pixel Lane. An early-stage smart-city
        traffic-management project.
      </div>
    </footer>
  );
}
