#!/usr/bin/env node
/**
 * Copies MapLibre GL JS's worker bundle into public/ so it can be served
 * as a same-origin static asset (see map/hooks/useMapLibreMap.ts's
 * `setWorkerUrl` call and map/README.md).
 *
 * MapLibre GL JS 5+ splits its worker into two files -- a small worker
 * entry (`maplibre-gl-worker.mjs`) that ES-module-imports a much larger
 * shared chunk (`maplibre-gl-shared.mjs`) relative to itself. Copying
 * only the first file (as a pre-v5 setup would) leaves the worker's own
 * import 404ing: the worker fails to initialize, every GeoJSON source
 * silently never produces tile data, and the map renders as an empty
 * canvas with no console error on the main thread (see docs/map-editor.md
 * or the commit that introduced this script for the full incident). This
 * script always copies the exact pair the installed maplibre-gl version
 * ships, so an upgrade can't silently reintroduce that gap.
 */

import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(frontendRoot, "node_modules/maplibre-gl/dist");
const publicDir = join(frontendRoot, "public");

const REQUIRED_FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

for (const name of REQUIRED_FILES) {
  const source = join(distDir, name);
  if (!existsSync(source)) {
    console.error(
      `sync-maplibre-worker: ${source} not found -- is maplibre-gl installed?`,
    );
    process.exit(1);
  }
  copyFileSync(source, join(publicDir, name));
}

console.log(
  `sync-maplibre-worker: synced ${REQUIRED_FILES.join(", ")} from maplibre-gl into public/`,
);
