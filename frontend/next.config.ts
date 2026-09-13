import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const MOVED_APP_ROUTES = [
  "city-model",
  "traffic",
  "infrastructure",
  "simulation",
  "analytics",
  "incidents",
  "emergency-priority",
  "settings",
];

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    // Two generations of route moves, both permanent:
    // 1. Pre-i18n: bare `/traffic` -> `/app/traffic` (still needed for the
    //    brief window before next-intl's middleware locale-prefixes it).
    // 2. Post-i18n: `/<locale>/traffic` -> `/<locale>/app/traffic`, so a
    //    locale-prefixed old path also lands on the moved page instead of
    //    404ing.
    return MOVED_APP_ROUTES.flatMap((slug) => [
      {
        source: `/${slug}`,
        destination: `/app/${slug}`,
        permanent: true,
      },
      {
        source: `/:locale(kk|ru|en)/${slug}`,
        destination: `/:locale/app/${slug}`,
        permanent: true,
      },
    ]);
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
