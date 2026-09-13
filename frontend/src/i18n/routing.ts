import { defineRouting } from "next-intl/routing";

/**
 * Pixel Lane is a trilingual product (see AGENTS.md's "Internationalization
 * — Mandatory" section). `kk` is the default locale because the project is
 * developed in and for Kazakhstan, but all three locales are first-class
 * and always explicit in the URL (`localePrefix: "always"`) so a link is
 * never ambiguous about which language it points to.
 */
export const routing = defineRouting({
  locales: ["kk", "ru", "en"],
  defaultLocale: "kk",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
