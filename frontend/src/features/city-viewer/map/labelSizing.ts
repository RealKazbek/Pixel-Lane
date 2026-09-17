export const LABEL_MIN_FONT_SIZE = 8;
export const LABEL_MAX_FONT_SIZE = 13;
export const LABEL_GLYPH_WIDTH_FACTOR = 0.62;
export const LABEL_ENDPOINT_PADDING_PX = 12;

/** Returns a fitted MapLibre text size for a rendered road length. Zero means
 * the label cannot fit without crossing the rounded endpoint safety zone. */
export function labelFontSizeForRenderedLength(
  roadLengthPx: number,
  characterCount: number,
): number {
  if (characterCount <= 0) return 0;
  const usableLength = roadLengthPx - LABEL_ENDPOINT_PADDING_PX * 2;
  const fittedSize = usableLength / (characterCount * LABEL_GLYPH_WIDTH_FACTOR);
  if (fittedSize < LABEL_MIN_FONT_SIZE) return 0;
  return Math.min(LABEL_MAX_FONT_SIZE, fittedSize);
}
