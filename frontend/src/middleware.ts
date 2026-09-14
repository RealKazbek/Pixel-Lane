import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Run on every path except Next internals, static assets, the
  // unlocalized `/health` status page, and the unlocalized `/dev/*`
  // internal developer tools (e.g. `/dev/road-lab` -- see
  // docs/road-geometry.md).
  matcher: ["/((?!api|_next|_vercel|health|dev|.*\\..*).*)"],
};
