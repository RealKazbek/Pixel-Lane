import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

/**
 * Translation namespaces, one JSON file per domain under
 * `messages/<locale>/<namespace>.json` (see `frontend/docs/i18n.md`).
 * Keep this list and each locale's file set in sync — `npm run
 * check:i18n` fails the build if a namespace's keys diverge between
 * locales.
 */
const NAMESPACES = [
  "common",
  "marketing",
  "auth",
  "dashboard",
  "cityModel",
  "traffic",
  "infrastructure",
  "simulation",
  "analytics",
  "incidents",
  "emergency",
  "settings",
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const entries = await Promise.all(
    NAMESPACES.map(async (namespace) => {
      const messages = (
        await import(`../../messages/${locale}/${namespace}.json`)
      ).default;
      return [namespace, messages] as const;
    }),
  );

  return {
    locale,
    messages: Object.fromEntries(entries),
  };
});
