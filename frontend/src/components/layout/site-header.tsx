import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          Pixel Lane
        </Link>
        <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/">Home</Link>
          <Link href="/health">Status</Link>
        </nav>
      </div>
    </header>
  );
}
