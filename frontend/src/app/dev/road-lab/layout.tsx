import "../../globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

/**
 * `/dev/road-lab` is an internal developer tool outside the localized
 * `[locale]` tree (see `src/middleware.ts`'s matcher, same pattern as
 * `/health`) -- it needs its own root layout (Next.js "multiple root
 * layouts"). Deliberately English-only and unlinked from product
 * navigation: it is a geometry-verification fixture for engineers, not a
 * user-facing product surface, so it is out of scope for AGENTS.md's
 * i18n Definition of Done (see docs/road-geometry.md).
 */
export default function RoadLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="h-dvh bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
