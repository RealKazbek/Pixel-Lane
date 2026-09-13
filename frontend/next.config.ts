import type { NextConfig } from "next";

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
    return MOVED_APP_ROUTES.map((slug) => ({
      source: `/${slug}`,
      destination: `/app/${slug}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
