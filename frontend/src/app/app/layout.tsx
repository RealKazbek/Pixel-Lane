import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";

export const metadata: Metadata = {
  title: {
    default: "Platform — Pixel Lane",
    template: "%s — Pixel Lane",
  },
  robots: { index: false, follow: false },
};

/** Internal operational shell (sidebar + app header). Kept structurally
 * separate from the public marketing layout -- see
 * `src/app/(marketing)/layout.tsx`. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
