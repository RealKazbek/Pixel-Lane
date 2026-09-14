/**
 * Canvas-drawn road-marking badges (bus lane, parking) registered once
 * via `map.addImage` -- replaces the previous repeated plain-text
 * `"A"`/`"P"` symbol layers (see laneDetailLayers.ts), which produced a
 * cluttered "A A A A A A..." every ~80m with no minimum on-screen
 * spacing control. An `icon-image` symbol gets `symbol-spacing` in
 * *screen* pixels (roughly constant on-screen density across zoom) plus
 * MapLibre's built-in icon collision detection (`icon-allow-overlap:
 * false`), which a `text-field` symbol sharing the same source didn't
 * get as cleanly.
 *
 * Drawn with the Canvas 2D API (a browser built-in) rather than shipping
 * raster/SVG assets -- no new dependency, and the badge can be re-drawn
 * per theme (see `styles/mapTheme.ts`) without a sprite-sheet build step.
 *
 * Must be re-registered after every `map.setStyle()` swap, same as
 * `layers/setupLayers.ts`'s sources/layers -- `ensurePixelLaneIcons` is
 * called from the same place (`PixelLaneMap.tsx`'s `ensurePixelLaneLayers`).
 */

import type { Map as MapLibreMap } from "maplibre-gl";

export const ICON_IDS = {
  busLaneBadge: "pixel-lane-icon-bus-lane",
  parkingBadge: "pixel-lane-icon-parking",
  busStopBadge: "pixel-lane-icon-bus-stop",
  crosswalkBadge: "pixel-lane-icon-crosswalk",
} as const;

const BADGE_SIZE_PX = 28;
const DEVICE_PIXEL_SCALE = 2; // draw at 2x for crisp rendering when zoomed

export interface BadgeTheme {
  fill: string;
  text: string;
  border: string;
}

function drawBadge(
  glyph: string,
  theme: BadgeTheme,
): { data: Uint8ClampedArray; width: number; height: number } {
  const size = BADGE_SIZE_PX * DEVICE_PIXEL_SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const radius = size * 0.28;
  const inset = size * 0.08;

  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.moveTo(inset + radius, inset);
  ctx.arcTo(size - inset, inset, size - inset, size - inset, radius);
  ctx.arcTo(size - inset, size - inset, inset, size - inset, radius);
  ctx.arcTo(inset, size - inset, inset, inset, radius);
  ctx.arcTo(inset, inset, size - inset, inset, radius);
  ctx.closePath();
  ctx.fillStyle = theme.fill;
  ctx.fill();
  ctx.lineWidth = size * 0.07;
  ctx.strokeStyle = theme.border;
  ctx.stroke();

  ctx.fillStyle = theme.text;
  ctx.font = `700 ${size * 0.55}px "Noto Sans", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, size / 2, size / 2 + size * 0.02);

  const imageData = ctx.getImageData(0, 0, size, size);
  return { data: imageData.data, width: size, height: size };
}

/** A circular "stop sign" badge -- visually distinct from the rounded-
 * square lane-marking badges (a point amenity marker, not a repeated
 * road-surface stencil), same "A" glyph convention (CIS bus-stop/bus-lane
 * signage both use "A", short for "Автобус"). */
function drawCircleBadge(
  glyph: string,
  theme: BadgeTheme,
): { data: Uint8ClampedArray; width: number; height: number } {
  const size = BADGE_SIZE_PX * DEVICE_PIXEL_SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const center = size / 2;
  const radius = size * 0.42;

  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fillStyle = theme.fill;
  ctx.fill();
  ctx.lineWidth = size * 0.08;
  ctx.strokeStyle = theme.border;
  ctx.stroke();

  ctx.fillStyle = theme.text;
  ctx.font = `700 ${size * 0.5}px "Noto Sans", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, center, center + size * 0.02);

  const imageData = ctx.getImageData(0, 0, size, size);
  return { data: imageData.data, width: size, height: size };
}

/** A small striped square (alternating theme colors), the standard
 * cartographic shorthand for a pedestrian crossing -- schematic, not a
 * to-scale zebra pattern (crosswalks have no stored geometry beyond a
 * point along their road, see `adapters/cityAmenitiesToGeoJson.ts`). */
function drawStripeBadge(
  stripeA: string,
  stripeB: string,
): { data: Uint8ClampedArray; width: number; height: number } {
  const size = BADGE_SIZE_PX * DEVICE_PIXEL_SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const stripeCount = 5;
  const stripeWidth = size / stripeCount;

  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? stripeA : stripeB;
    ctx.fillRect(i * stripeWidth, 0, stripeWidth, size);
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  return { data: imageData.data, width: size, height: size };
}

/** Registers (or re-registers, if the theme changed) every badge icon.
 * Idempotent per theme -- call freely from layer setup without tracking
 * registration state elsewhere. */
export function ensurePixelLaneIcons(
  map: MapLibreMap,
  busTheme: BadgeTheme,
  parkingTheme: BadgeTheme,
  crosswalkStripes: [string, string],
): void {
  for (const [id, glyph, theme] of [
    [ICON_IDS.busLaneBadge, "A", busTheme],
    [ICON_IDS.parkingBadge, "P", parkingTheme],
  ] as const) {
    if (map.hasImage(id)) map.removeImage(id);
    const { data, width, height } = drawBadge(glyph, theme);
    map.addImage(id, { width, height, data }, { pixelRatio: DEVICE_PIXEL_SCALE });
  }

  if (map.hasImage(ICON_IDS.busStopBadge)) map.removeImage(ICON_IDS.busStopBadge);
  {
    const { data, width, height } = drawCircleBadge("A", busTheme);
    map.addImage(ICON_IDS.busStopBadge, { width, height, data }, {
      pixelRatio: DEVICE_PIXEL_SCALE,
    });
  }

  if (map.hasImage(ICON_IDS.crosswalkBadge)) map.removeImage(ICON_IDS.crosswalkBadge);
  {
    const { data, width, height } = drawStripeBadge(...crosswalkStripes);
    map.addImage(ICON_IDS.crosswalkBadge, { width, height, data }, {
      pixelRatio: DEVICE_PIXEL_SCALE,
    });
  }
}
