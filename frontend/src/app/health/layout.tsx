import "../globals.css";

/**
 * `/health` is a technical status page outside the localized `[locale]`
 * tree (see `src/middleware.ts`'s matcher) -- it needs its own root
 * layout (Next.js "multiple root layouts" pattern) since there is no
 * shared `app/layout.tsx` above `[locale]` and `health`.
 */
export default function HealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-dvh bg-background text-foreground">{children}</body>
    </html>
  );
}
