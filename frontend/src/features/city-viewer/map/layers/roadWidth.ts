/**
 * Converts a road's real-world width (meters, see styles/roadStyle.ts)
 * into a MapLibre zoom-interpolated pixel-width expression, using the
 * standard Web Mercator meters-per-pixel formula. Kept as its own small,
 * testable function so the "meters -> screen pixels" strategy lives in
 * exactly one place.
 */

import type { ExpressionSpecification } from "maplibre-gl";

const WEB_MERCATOR_CONSTANT = 156543.03392;
const REFERENCE_ZOOMS = [10, 13, 16, 19, 22];

export function metersPerPixel(zoom: number, latitudeDeg: number): number {
  return (
    (WEB_MERCATOR_CONSTANT * Math.cos((latitudeDeg * Math.PI) / 180)) /
    Math.pow(2, zoom)
  );
}

/** A MapLibre `line-width` expression that reads `widthProperty` (meters)
 * off each feature and scales it to pixels at the current zoom, anchored
 * to `referenceLatitudeDeg` (roads far from that latitude will be very
 * slightly off since true meters-per-pixel varies with latitude -- fine
 * for a single-city map). */
export function roadWidthPixelsExpression(
  referenceLatitudeDeg: number,
  widthProperty = "width_m",
): ExpressionSpecification {
  const stops = REFERENCE_ZOOMS.flatMap((zoom) => [
    zoom,
    [
      "*",
      ["get", widthProperty],
      1 / metersPerPixel(zoom, referenceLatitudeDeg),
    ],
  ]);
  return [
    "interpolate",
    ["exponential", 2],
    ["zoom"],
    ...stops,
  ] as ExpressionSpecification;
}

/** Wraps a pixel-width expression with a per-feature minimum, via
 * `minPixelsExpression` (typically a `match` on hierarchy). Real-world
 * road widths collapse to sub-pixel size at city-overview zoom levels;
 * without a floor, a highway and a footpath render identically and the
 * whole map reads as a bare graph rather than a road network (see
 * styles/roadStyle.ts's ROAD_MIN_PIXEL_WIDTH). */
export function withMinPixelWidth(
  widthExpression: ExpressionSpecification,
  minPixelsExpression: ExpressionSpecification,
): ExpressionSpecification {
  return ["max", widthExpression, minPixelsExpression] as ExpressionSpecification;
}
