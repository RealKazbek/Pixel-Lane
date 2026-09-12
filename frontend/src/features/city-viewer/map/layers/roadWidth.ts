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
 * for a single-city map). The outer interpolate is intentional: MapLibre
 * requires a zoom expression to be the input of a top-level camera
 * expression, while each stop can still combine feature data and a
 * hierarchy-specific minimum width. */
export function roadWidthPixelsExpression(
  referenceLatitudeDeg: number,
  widthProperty: string,
  minPixelsExpression: ExpressionSpecification,
  additionalPixels = 0,
): ExpressionSpecification {
  const stops = REFERENCE_ZOOMS.flatMap((zoom) => [
    zoom,
    additionalPixels > 0
      ? [
          "+",
          [
            "max",
            [
              "*",
              ["get", widthProperty],
              1 / metersPerPixel(zoom, referenceLatitudeDeg),
            ],
            minPixelsExpression,
          ],
          additionalPixels,
        ]
      : [
          "max",
          [
            "*",
            ["get", widthProperty],
            1 / metersPerPixel(zoom, referenceLatitudeDeg),
          ],
          minPixelsExpression,
        ],
  ]);
  return [
    "interpolate",
    ["exponential", 2],
    ["zoom"],
    ...stops,
  ] as ExpressionSpecification;
}
