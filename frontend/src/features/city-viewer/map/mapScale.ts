const METERS_PER_CSS_PIXEL_AT_96_DPI = 0.0254 / 96;

/** Approximate printed-map denominator for the current Web Mercator camera. */
export function mapScaleDenominator(zoom: number, latitude: number): number {
  const metersPerPixel =
    (40_075_016.686 * Math.cos((latitude * Math.PI) / 180)) / (512 * 2 ** zoom);
  return roundScale(
    Math.max(1, metersPerPixel / METERS_PER_CSS_PIXEL_AT_96_DPI),
  );
}

export function mapScaleBarMeters(denominator: number): number {
  const target = denominator * METERS_PER_CSS_PIXEL_AT_96_DPI * 80;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, target)));
  const normalized = target / magnitude;
  const nice = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  return nice * magnitude;
}

function roundScale(value: number): number {
  const step =
    value >= 10_000 ? 1000 : value >= 1000 ? 100 : value >= 100 ? 50 : 10;
  return Math.max(step, Math.round(value / step) * step);
}
