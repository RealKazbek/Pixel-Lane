/**
 * Public surface of the pure-geometry module -- the only exports
 * `adapters/` should import from. Internal helpers (bearing/trim/radius
 * math, Bezier sampling) stay module-private; see README.md for the
 * module's boundary rules.
 */

export { buildRoadEnvelope, type PolygonFeature } from "./roadEnvelope";
export { solveJunction, junctionNodeRadius, type JunctionResult } from "./junctionSolver";
export { buildMergeTaperEnvelope, isMergeCandidate } from "./mergeTaper";
export {
  smoothCenterline,
  DEFAULT_SMOOTHING_OPTIONS,
  type SmoothingOptions,
} from "./curveSmoothing";
export {
  computeNodeRadius,
  cornerRadiusForPair,
  pointsMatch,
  trimLine,
  outwardBearing,
  edgePointsAt,
  type IncidentRoad,
  type LngLat,
} from "./nodeGeometry";
