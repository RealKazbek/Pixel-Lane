/** Shared zoom thresholds for progressive road/lane detail (see
 * map/README.md's draw-order notes and docs/city-model.md's Road+Lane V1
 * zoom-behavior section). Kept in one place so `roadLayers.ts` (coarse
 * "multi-lane" hint) and `laneDetailLayers.ts` (real per-lane geometry)
 * hand off at the same zoom instead of drifting independently. */

/** Below this, roads render as a single surface + coarse dashed
 * "multi-lane" hint only -- no per-lane geometry, no markings. */
export const LANE_DETAIL_MIN_ZOOM = 17;

/** Turn arrows and bus-lane/parking/cycleway text labels add more visual
 * weight than plain separators -- gated one step further in so a busy
 * intersection at LANE_DETAIL_MIN_ZOOM isn't immediately cluttered with
 * text. */
export const LANE_LABEL_MIN_ZOOM = 17.5;
