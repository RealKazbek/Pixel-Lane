/**
 * Basemap is optional reference infrastructure -- isolated here so no
 * other module needs to know which (if any) provider is configured (see
 * map/README.md and AGENTS.md's dependency-isolation rule).
 */

import type { StyleSpecification } from "maplibre-gl";

/** A valid, empty MapLibre style -- used whenever the basemap is off or
 * unconfigured, so the map always has *something* to initialize with
 * that isn't a random API and isn't Pixel Lane-branded (Pixel Lane's own
 * layers are added on top regardless of the base style).
 *
 * `glyphs` points at the MapLibre project's own open, free, no-API-key
 * demo font-glyph endpoint -- text rendering needs *some* SDF glyph
 * source and this is part of the mapping library itself, not a
 * commercial basemap/tile provider. Self-hosting glyphs to drop this
 * too is a reasonable future improvement (see map/README.md).
 *
 * The background color is the current theme's `background` token
 * (`styles/mapTheme.ts`) -- a flat, muted canvas rather than MapLibre's
 * default stark white/transparent void, and correct for both Light and
 * Dark. */
export function buildEmptyStyle(backgroundColor: string): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {},
    layers: [
      {
        id: "pixel-lane-empty-background",
        type: "background",
        paint: { "background-color": backgroundColor },
      },
    ],
  };
}

/** Resolves what to hand MapLibre as its `style` -- a configured style
 * URL when the basemap is enabled and one is set, otherwise the empty
 * style (Pixel Lane-only mode). Never hardcodes a specific provider. */
export function resolveMapStyle(
  basemapEnabled: boolean,
  styleUrl: string | null,
  backgroundColor: string,
): string | StyleSpecification {
  if (basemapEnabled && styleUrl) {
    return styleUrl;
  }
  return buildEmptyStyle(backgroundColor);
}
