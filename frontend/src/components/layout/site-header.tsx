import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { StatusCheck } from "@/components/status-check";

export function SiteHeader() {
  return (
    <header className="relative border-b border-border-subtle bg-surface">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <MobileNav />
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Pixel Lane
          </Link>
        </div>
        <StatusCheck />
      </div>
    </header>
  );
}
