const METERS_PER_CSS_PIXEL_AT_96_DPI = 0.0254 / 96;

/** Approximate printed-map denominator for the current Web Mercator camera. */
export function mapScaleDenominator(zoom: number, latitude: number): number {
  const metersPerPixel =
    (40_075_016.686 * Math.cos((latitude * Math.PI) / 180)) / (512 * 2 ** zoom);
  return Math.max(
    1,
    Math.round(metersPerPixel / METERS_PER_CSS_PIXEL_AT_96_DPI),
  );
}
