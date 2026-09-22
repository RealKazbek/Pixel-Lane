import destination from "@turf/destination";
import { point as turfPoint } from "@turf/helpers";
import type { MovementType, TurnLaneType } from "../../types/city";
import type { LngLat } from "./nodeGeometry";

type ManeuverToken = MovementType | TurnLaneType;
type SymbolDirection = "LEFT" | "STRAIGHT" | "RIGHT" | "U_TURN";
type LocalPoint = readonly [rightM: number, forwardM: number];

const DIRECTION_ORDER: readonly SymbolDirection[] = [
  "U_TURN",
  "LEFT",
  "STRAIGHT",
  "RIGHT",
];

const TOKEN_DIRECTION: Record<ManeuverToken, SymbolDirection | null> = {
  LEFT: "LEFT",
  SLIGHT_LEFT: "LEFT",
  MERGE_TO_LEFT: "LEFT",
  STRAIGHT: "STRAIGHT",
  THROUGH: "STRAIGHT",
  SLIGHT_RIGHT: "RIGHT",
  MERGE_TO_RIGHT: "RIGHT",
  RIGHT: "RIGHT",
  REVERSE: "U_TURN",
  U_TURN: "U_TURN",
  NONE: null,
};

function cubicBezier(
  start: LocalPoint,
  control1: LocalPoint,
  control2: LocalPoint,
  end: LocalPoint,
  samples = 10,
): LocalPoint[] {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const t = index / samples;
    const mt = 1 - t;
    return [
      mt ** 3 * start[0] +
        3 * mt ** 2 * t * control1[0] +
        3 * mt * t ** 2 * control2[0] +
        t ** 3 * end[0],
      mt ** 3 * start[1] +
        3 * mt ** 2 * t * control1[1] +
        3 * mt * t ** 2 * control2[1] +
        t ** 3 * end[1],
    ];
  });
}

function arrowhead(path: LocalPoint[], lengthM: number): LocalPoint[] | null {
  if (path.length < 2) return null;
  const tip = path.at(-1)!;
  const previous = path.at(-2)!;
  const dx = tip[0] - previous[0];
  const dy = tip[1] - previous[1];
  const magnitude = Math.hypot(dx, dy);
  if (magnitude < 0.001) return null;
  const ux = dx / magnitude;
  const uy = dy / magnitude;
  const perpendicularX = -uy;
  const perpendicularY = ux;
  const baseX = tip[0] - ux * lengthM;
  const baseY = tip[1] - uy * lengthM;
  const halfWidthM = lengthM * 0.43;
  return [
    [baseX + perpendicularX * halfWidthM, baseY + perpendicularY * halfWidthM],
    tip,
    [baseX - perpendicularX * halfWidthM, baseY - perpendicularY * halfWidthM],
  ];
}

function toLngLat(
  anchor: LngLat,
  travelBearingDeg: number,
  local: LocalPoint,
): LngLat {
  const distanceM = Math.hypot(local[0], local[1]);
  if (distanceM === 0) return anchor;
  const angleFromForwardDeg = (Math.atan2(local[0], local[1]) * 180) / Math.PI;
  return destination(
    turfPoint(anchor),
    distanceM,
    travelBearingDeg + angleFromForwardDeg,
    { units: "meters" },
  ).geometry.coordinates as LngLat;
}

export function normalizeManeuverDirections(
  tokens: readonly ManeuverToken[] | null | undefined,
): SymbolDirection[] {
  if (!tokens) return [];
  const directions = new Set(
    tokens
      .map((token) => TOKEN_DIRECTION[token])
      .filter((direction): direction is SymbolDirection => direction !== null),
  );
  return DIRECTION_ORDER.filter((direction) => directions.has(direction));
}

/**
 * Builds one road-marking symbol for every combination of movements. All
 * branches grow from the same stem, so a multi-movement lane reads as one
 * painted symbol rather than a row of unrelated arrow glyphs.
 */
export function buildManeuverSymbolGeometry(
  anchor: LngLat,
  travelBearingDeg: number,
  tokens: readonly ManeuverToken[] | null | undefined,
): GeoJSON.MultiLineString | null {
  const directions = normalizeManeuverDirections(tokens);
  if (directions.length === 0) return null;

  const stemStart: LocalPoint = [0, -2.8];
  const split: LocalPoint = [0, 0.35];
  const localLines: LocalPoint[][] = [[stemStart, split]];
  const branches: LocalPoint[][] = [];

  for (const direction of directions) {
    let branch: LocalPoint[];
    switch (direction) {
      case "STRAIGHT":
        branch = [split, [0, 3.0]];
        break;
      case "LEFT":
        branch = cubicBezier(split, [0, 1.3], [-0.55, 2.25], [-1.75, 2.25]);
        break;
      case "RIGHT":
        branch = cubicBezier(split, [0, 1.3], [0.55, 2.25], [1.75, 2.25]);
        break;
      case "U_TURN":
        branch = cubicBezier(split, [0, 2.6], [-2.2, 2.55], [-1.75, 0.55], 14);
        break;
    }
    branches.push(branch);
    localLines.push(branch);
  }

  for (const branch of branches) {
    const head = arrowhead(branch, 0.78);
    if (head) localLines.push(head);
  }

  return {
    type: "MultiLineString",
    coordinates: localLines.map((line) =>
      line.map((coordinate) => toLngLat(anchor, travelBearingDeg, coordinate)),
    ),
  };
}
