export const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

/**
 * Optional basemap/reference layer for the 2D map (see
 * frontend/src/features/city-viewer/map/README.md). The Pixel Lane map
 * must stay fully usable with the basemap disabled -- it is reference
 * infrastructure, never a required dependency.
 */
export const mapBasemapEnabledByDefault =
  process.env.NEXT_PUBLIC_MAP_BASEMAP_ENABLED !== "false";

/** A MapLibre style URL/JSON path. No default provider is bundled -- if
 * unset, the basemap simply has nothing to show and stays off (see
 * `map/styles/mapStyle.ts`). No mandatory paid API is required. */
export const mapStyleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? null;
