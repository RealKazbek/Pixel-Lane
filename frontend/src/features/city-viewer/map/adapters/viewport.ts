/**
 * Pure helpers for viewport-driven data loading -- turning a MapLibre
 * camera position into the bbox the backend's `?bbox=` query param
 * expects, with a small buffer so panning doesn't immediately clip
 * roads at the previous viewport's edge (see map/README.md's
 * viewport-loading section).
 */

import type { LngLatBounds } from "maplibre-gl";

export interface BBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

/** Expands `bounds` by `bufferRatio` of its own width/height on every
 * side. A fixed *ratio* (not a fixed meters/degrees value) keeps the
 * buffer proportionate at any zoom level -- zoomed out over a wide area,
 * the buffer is correspondingly wide; zoomed in close, it stays small,
 * so this never overfetches by a fixed real-world amount regardless of
 * zoom. 0.25 (a quarter of the viewport on each side) is a deliberately
 * simple, small constant -- see PHASE 8 in the task this was built for
 * ("keep it simple, do not massively overfetch"), not a tuned/measured
 * value. */
const BUFFER_RATIO = 0.25;

export function boundsToBufferedBBox(bounds: LngLatBounds): BBox {
  const west = bounds.getWest();
  const east = bounds.getEast();
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const lonBuffer = (east - west) * BUFFER_RATIO;
  const latBuffer = (north - south) * BUFFER_RATIO;
  return {
    minLon: Math.max(-180, west - lonBuffer),
    minLat: Math.max(-90, south - latBuffer),
    maxLon: Math.min(180, east + lonBuffer),
    maxLat: Math.min(90, north + latBuffer),
  };
}

/** Whether `inner` is fully covered by `outer` -- used to skip a refetch
 * when the newly-requested (buffered) viewport is already contained in
 * the last one actually fetched (e.g. a small pan/zoom-in that stays
 * within the existing buffer). A small, safe optimization: it only ever
 * *avoids* a redundant fetch, never serves stale data outside what was
 * already loaded. */
export function isBBoxContained(inner: BBox, outer: BBox): boolean {
  return (
    inner.minLon >= outer.minLon &&
    inner.maxLon <= outer.maxLon &&
    inner.minLat >= outer.minLat &&
    inner.maxLat <= outer.maxLat
  );
}
