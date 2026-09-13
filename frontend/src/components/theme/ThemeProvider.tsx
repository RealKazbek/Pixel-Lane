"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Wraps `next-themes`: writes `data-theme="light"|"dark"` on `<html>`
 * before first paint (via an inline script it injects itself, so there
 * is no hydration flash) and resolves "system" to the OS preference.
 * `globals.css`'s `[data-theme="dark"]` block and `@custom-variant dark`
 * are the only consumers of that attribute -- see docs/theming.md.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      storageKey="pixel-lane-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
