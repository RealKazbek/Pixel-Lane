/**
 * Road + Lane Representation V1 -- derives per-lane visual geometry from
 * a Road's centerline + real-world width, entirely on the client (no new
 * backend geometry is stored; see docs/city-model.md). This is
 * schematic, not measured: it assumes lanes are evenly spaced across the
 * road's known/estimated width, since Pixel Lane has no per-lane
 * position source data. It must never be presented as authoritative
 * lane placement -- only as a readable, consistent visualization.
 *
 * Lane ordering follows the same convention as `Lane.index` (see
 * `normalization.py`'s docstring on the backend): index 0 is the
 * leftmost lane in the road's own direction of travel. `@turf/line-offset`
 * offsets to the left for positive distances, so leftmost lanes get the
 * largest positive offset.
 *
 * Nothing here fabricates turn/bus/parking/cycleway data -- every one of
 * these features is only drawn when the corresponding source-derived
 * fields (`Lane.allowed_turns` or editor-authored `Lane.allowed_movements`,
 * `Lane.lane_type`, `Road.parking_left/right`, `Road.cycleway_left/right`)
 * are present and not UNKNOWN/absent.
 *
 * IMPORTANT -- `LOCAL_CARTESIAN`-only: every builder below returns an
 * empty collection for `WGS84` (real-world imports, e.g. Almaty). This
 * schematic offset technique assumes clean, gently-curved geometry; real
 * OSM road polylines are not curated for it (sharp angles, very short
 * segments, near-duplicate points), and applying it there produced long
 * spiky self-intersecting offset artifacts, not readable lane markings.
 * `LOCAL_CARTESIAN` is also what Pixel Lane's existing hand-authored
 * example cities already use (see `app/city/examples/`), so this gate is
 * "controlled/synthetic fixture" vs. "real import", not a demo-specific
 * special case -- see docs/city-model.md's Demo City section.
 *
 * Centerlines use shared per-corner derived smoothing (`geometry/curveSmoothing.ts`,
 * same `LOCAL_CARTESIAN`-only gate) before any offsetting, and trimmed
 * back at every real junction end by that junction's node radius
 * (`geometry/nodeGeometry.ts`'s `computeNodeRadius`/`trimLine`, the same
 * calculation `roadSurfaceGeometry.ts`'s junction solver uses) so lane
 * markings follow curved roads and stop before the junction surface
 * instead of running straight through it.
 */

import along from "@turf/along";
import bearing from "@turf/bearing";
import distance from "@turf/distance";
import { point as turfPoint } from "@turf/helpers";
import lineOffset from "@turf/line-offset";
import { toLngLat } from "./coordinates";
import { toRoadLineString, type AnyRoad } from "./roadLineString";
import { roadLaneCount, roadWidthMeters } from "../styles/roadStyle";
import { smoothCenterline } from "../geometry/curveSmoothing";
import {
  computeNodeRadius,
  outwardBearing,
  pointsMatch,
  trimLine,
  type LngLat,
} from "../geometry/nodeGeometry";
import { MERGE_TAPER_LENGTH_M, isMergeCandidate } from "../geometry/mergeTaper";
import type {
  CoordinateSystem,
  CyclewayType,
  Intersection,
  ParkingLaneOrientation,
  TurnLaneType,
  MovementType,
  LaneBoundaryMarking,
  RoadEdgeMarking,
} from "../../types/city";

/** Roads' Intersections, restricted to the fields this module needs --
 * matches what `roadSurfaceGeometry.ts` requires so both adapters can be
 * fed the same `City`/viewport intersection list. */
export type LaneJunctionIntersection = Pick<
  Intersection,
  "position" | "connected_road_ids"
>;

export interface LaneSurfaceProperties {
  road_id: string;
  lane_index: number;
  lane_type: string;
  is_bus: boolean;
  lane_width_m: number;
}

export interface LaneBoundaryProperties {
  road_id: string;
  /** "edge" = outer road boundary; "separator" = adjacent lanes share a
   * direction; "center" = adjacent lanes change direction. */
  kind: "edge" | "separator" | "center";
  marking: LaneBoundaryMarking | RoadEdgeMarking;
}

export interface TurnArrowProperties {
  road_id: string;
  lane_index: number;
  arrow: string;
  /** Degrees, MapLibre `text-rotate` convention -- approximated from the
   * road's overall start->end bearing (ignoring intermediate curvature),
   * since Pixel Lane has no per-point heading source data. */
  bearing: number;
}

export interface LaneUseMarkingProperties {
  road_id: string;
  kind: "parking" | "cycleway";
  side: "left" | "right";
  value: string;
}

export type LaneSurfaceFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.LineString,
  LaneSurfaceProperties
>;
export type LaneBoundaryFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.LineString,
  LaneBoundaryProperties
>;
export type TurnArrowFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  TurnArrowProperties
>;
export type LaneUseMarkingFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.LineString,
  LaneUseMarkingProperties
>;

const TURN_ARROW_GLYPHS: Record<TurnLaneType | MovementType, string> = {
  LEFT: "←",
  STRAIGHT: "↑",
  SLIGHT_LEFT: "↖",
  THROUGH: "↑",
  SLIGHT_RIGHT: "↗",
  RIGHT: "→",
  REVERSE: "↺",
  MERGE_TO_LEFT: "⬉",
  MERGE_TO_RIGHT: "⬈",
  NONE: "",
  U_TURN: "↺",
};

/** `null` when there is nothing worth drawing (no data, or the only
 * token is the explicit "no turn indicated" marker) -- never a fabricated
 * default arrow. */
function turnArrowGlyph(
  tokens: (TurnLaneType | MovementType)[] | null | undefined,
): string | null {
  if (!tokens || tokens.length === 0) return null;
  const glyph = tokens.map((t) => TURN_ARROW_GLYPHS[t]).join("");
  return glyph.length > 0 ? glyph : null;
}

const PARKING_SCHEMATIC_WIDTH_M = 2.2;
const CYCLEWAY_SCHEMATIC_WIDTH_M = 1.5;
const LANE_USE_GAP_M = 0.3;
/** Fraction along the road's length where a turn arrow is drawn --
 * near-but-not-at the end, evoking an intersection approach without
 * assuming real stop-line/intersection geometry (see Part 1's rule
 * against deriving intersections from geometry). */
const toLineStringFeature = toRoadLineString;

/** Offsets `line` by `distanceMeters` (positive = left, per
 * `@turf/line-offset`'s convention) -- `null` on any degenerate-geometry
 * failure rather than throwing and breaking the whole map render for one
 * bad road. */
function safeOffset(
  line: GeoJSON.Feature<GeoJSON.LineString>,
  distanceMeters: number,
): GeoJSON.Feature<GeoJSON.LineString> | null {
  if (distanceMeters === 0) return line;
  try {
    const offset = lineOffset(line, distanceMeters, { units: "meters" });
    if (offset.geometry.coordinates.length < 2) return null;
    return offset;
  } catch {
    return null;
  }
}

function laneCenterOffsetM(
  roadWidthM: number,
  laneWidthM: number,
  index: number,
): number {
  return roadWidthM / 2 - laneWidthM * (index + 0.5);
}

function laneBoundaryOffsetsM(
  roadWidthM: number,
  laneWidthM: number,
  laneCount: number,
): number[] {
  // Outer edges plus one offset per internal boundary between lanes.
  const offsets = [roadWidthM / 2, -roadWidthM / 2];
  for (let i = 1; i < laneCount; i++) {
    offsets.push(roadWidthM / 2 - laneWidthM * i);
  }
  return offsets;
}

/** See this file's top-level docstring: schematic per-lane rendering is
 * only safe/reliable for controlled synthetic fixtures, never a raw
 * real-world import. */
function supportsLaneDetailRendering(
  coordinateSystem: CoordinateSystem,
): boolean {
  return coordinateSystem === "LOCAL_CARTESIAN";
}

/** Builds each road's rendering centerline: per-corner smoothed, then
 * trimmed back at any end that's a real (2+ road) junction by that
 * junction's node radius -- the same radius
 * `geometry/junctionSolver.ts` trims road envelopes by, so lane markings
 * stop exactly where the junction surface begins instead of drifting
 * through it or stopping short of it. Empty for `WGS84` (see this file's
 * top-level docstring). */
function buildLaneRenderingLines(
  roads: AnyRoad[],
  intersections: LaneJunctionIntersection[],
  coordinateSystem: CoordinateSystem,
): Map<string, GeoJSON.Feature<GeoJSON.LineString>> {
  const result = new Map<string, GeoJSON.Feature<GeoJSON.LineString>>();
  if (!supportsLaneDetailRendering(coordinateSystem)) return result;

  const roadById = new Map(roads.map((r) => [r.id, r]));
  const widthByRoadId = new Map<string, number>();
  for (const road of roads) widthByRoadId.set(road.id, roadWidthMeters(road));

  const trimStartByRoadId = new Map<string, number>();
  const trimEndByRoadId = new Map<string, number>();

  for (const intersection of intersections) {
    const memberIds = intersection.connected_road_ids.filter((id) =>
      widthByRoadId.has(id),
    );
    if (memberIds.length < 2) continue;
    const nodeRadius = computeNodeRadius(
      memberIds.map((id) => ({ halfWidthM: widthByRoadId.get(id)! / 2 })),
    );
    const nodePosition = toLngLat(
      coordinateSystem,
      intersection.position,
    ) as LngLat;

    const memberInfo = memberIds
      .map((id) => {
        const road = roadById.get(id);
        if (!road) return null;
        const rawLine = toLineStringFeature(coordinateSystem, road);
        if (!rawLine) return null;
        const coords = rawLine.geometry.coordinates as LngLat[];
        const atEnd = pointsMatch(coords[coords.length - 1], nodePosition);
        const atStart = pointsMatch(coords[0], nodePosition);
        if (!atEnd && !atStart) return null;
        return {
          id,
          atEnd,
          halfWidthM: widthByRoadId.get(id)! / 2,
          outwardBearingDeg: outwardBearing(nodePosition, rawLine, atEnd),
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    // Same detection as geometry/junctionSolver.ts: a road tapering into
    // a much wider one at this node gets its lane markings stopped at
    // the taper's own start distance instead of the node radius, so
    // markings never run into the zone where the physical surface is
    // already narrowing to nothing (see that module's docstring).
    let mergeRoadId: string | null = null;
    outer: for (const narrow of memberInfo) {
      for (const wide of memberInfo) {
        if (narrow === wide || narrow.halfWidthM >= wide.halfWidthM) continue;
        if (
          isMergeCandidate(
            narrow,
            wide,
            narrow.outwardBearingDeg,
            wide.outwardBearingDeg,
          )
        ) {
          mergeRoadId = narrow.id;
          break outer;
        }
      }
    }

    for (const member of memberInfo) {
      const trim =
        member.id === mergeRoadId ? MERGE_TAPER_LENGTH_M : nodeRadius;
      if (member.atEnd) {
        trimEndByRoadId.set(
          member.id,
          Math.max(trimEndByRoadId.get(member.id) ?? 0, trim),
        );
      } else {
        trimStartByRoadId.set(
          member.id,
          Math.max(trimStartByRoadId.get(member.id) ?? 0, trim),
        );
      }
    }
  }

  for (const road of roads) {
    const rawLine = toLineStringFeature(coordinateSystem, road);
    if (!rawLine) continue;
    const smoothedCoords = smoothCenterline(
      rawLine.geometry.coordinates as LngLat[],
      undefined,
      road.smoothing ?? 1,
      road.corner_smoothing,
    );
    const smoothedLine: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: smoothedCoords },
    };
    const start = trimStartByRoadId.get(road.id) ?? 0;
    const end = trimEndByRoadId.get(road.id) ?? 0;
    const trimmed =
      start > 0 || end > 0 ? trimLine(smoothedLine, start, end) : smoothedLine;
    result.set(road.id, trimmed);
  }
  return result;
}

export function buildLaneSurfaceFeatureCollection(
  roads: AnyRoad[],
  coordinateSystem: CoordinateSystem,
  intersections: LaneJunctionIntersection[] = [],
): LaneSurfaceFeatureCollection {
  if (!supportsLaneDetailRendering(coordinateSystem)) {
    return { type: "FeatureCollection", features: [] };
  }
  const renderingLines = buildLaneRenderingLines(
    roads,
    intersections,
    coordinateSystem,
  );
  const features: LaneSurfaceFeatureCollection["features"] = [];
  for (const road of roads) {
    const laneCount = roadLaneCount(road);
    const lanes = "lanes" in road ? road.lanes : undefined;
    if (laneCount < 1) continue;
    const line = renderingLines.get(road.id);
    if (!line) continue;
    const roadWidthM = roadWidthMeters(road);
    const laneWidthM = roadWidthM / laneCount;
    for (let index = 0; index < laneCount; index++) {
      const offset = safeOffset(
        line,
        laneCenterOffsetM(roadWidthM, laneWidthM, index),
      );
      if (!offset) continue;
      const lane = lanes?.find((l) => l.index === index);
      features.push({
        type: "Feature",
        geometry: offset.geometry,
        properties: {
          road_id: road.id,
          lane_index: index,
          lane_type: lane?.lane_type ?? "GENERAL",
          is_bus: lane?.lane_type === "BUS",
          lane_width_m: laneWidthM,
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

export function buildLaneBoundaryFeatureCollection(
  roads: AnyRoad[],
  coordinateSystem: CoordinateSystem,
  intersections: LaneJunctionIntersection[] = [],
): LaneBoundaryFeatureCollection {
  if (!supportsLaneDetailRendering(coordinateSystem)) {
    return { type: "FeatureCollection", features: [] };
  }
  const renderingLines = buildLaneRenderingLines(
    roads,
    intersections,
    coordinateSystem,
  );
  const features: LaneBoundaryFeatureCollection["features"] = [];
  for (const road of roads) {
    const laneCount = roadLaneCount(road);
    const lanes = "lanes" in road ? road.lanes : undefined;
    if (laneCount < 1) continue;
    const line = renderingLines.get(road.id);
    if (!line) continue;
    const roadWidthM = roadWidthMeters(road);
    const laneWidthM = roadWidthM / laneCount;
    const edgeOffsets = new Set([roadWidthM / 2, -roadWidthM / 2]);
    for (const offsetM of laneBoundaryOffsetsM(
      roadWidthM,
      laneWidthM,
      laneCount,
    )) {
      const offset = safeOffset(line, offsetM);
      if (!offset) continue;
      const boundaryIndex = Math.round((roadWidthM / 2 - offsetM) / laneWidthM);
      const leftLane = lanes?.find((lane) => lane.index === boundaryIndex - 1);
      const rightLane = lanes?.find((lane) => lane.index === boundaryIndex);
      const leftDirection =
        leftLane && "direction" in leftLane ? leftLane.direction : null;
      const rightDirection =
        rightLane && "direction" in rightLane ? rightLane.direction : null;
      const isOppositeDirection =
        leftDirection !== null &&
        rightDirection !== null &&
        leftDirection !== rightDirection;
      const isEdge = edgeOffsets.has(offsetM);
      const marking = isEdge
        ? offsetM > 0
          ? (("left_edge_marking" in road
              ? road.left_edge_marking
              : undefined) ?? "SOLID_YELLOW")
          : (("right_edge_marking" in road
              ? road.right_edge_marking
              : undefined) ?? "SOLID_YELLOW")
        : (("lane_boundary_markings" in road
            ? road.lane_boundary_markings?.[boundaryIndex - 1]
            : undefined) ??
          (isOppositeDirection ? "DOUBLE_SOLID_WHITE" : "DASHED_WHITE"));
      if (marking === "NONE") continue;
      const lineFeatures =
        marking === "DOUBLE_SOLID_WHITE"
          ? [safeOffset(line, offsetM - 0.28), safeOffset(line, offsetM + 0.28)]
          : [offset];
      for (const lineFeature of lineFeatures) {
        if (!lineFeature) continue;
        features.push({
          type: "Feature",
          geometry: lineFeature.geometry,
          properties: {
            road_id: road.id,
            kind: isEdge
              ? "edge"
              : marking === "DOUBLE_SOLID_WHITE"
                ? "center"
                : "separator",
            marking,
          },
        });
      }
    }
  }
  return { type: "FeatureCollection", features };
}

export function buildTurnArrowFeatureCollection(
  roads: AnyRoad[],
  coordinateSystem: CoordinateSystem,
  intersections: LaneJunctionIntersection[] = [],
): TurnArrowFeatureCollection {
  if (!supportsLaneDetailRendering(coordinateSystem)) {
    return { type: "FeatureCollection", features: [] };
  }
  const renderingLines = buildLaneRenderingLines(
    roads,
    intersections,
    coordinateSystem,
  );
  const features: TurnArrowFeatureCollection["features"] = [];
  for (const road of roads) {
    const lanes = "lanes" in road ? road.lanes : undefined;
    if (!lanes || lanes.length === 0) continue;
    const laneCount = roadLaneCount(road);
    if (laneCount < 1) continue;
    const line = renderingLines.get(road.id);
    if (!line) continue;
    const roadWidthM = roadWidthMeters(road);
    const laneWidthM = roadWidthM / laneCount;
    const coords = line.geometry.coordinates;
    const lineLengthM = coords
      .slice(0, -1)
      .reduce(
        (total, coordinate, index) =>
          total +
          distance(turfPoint(coordinate), turfPoint(coords[index + 1]), {
            units: "meters",
          }),
        0,
      );
    if (lineLengthM <= 0) continue;
    const connectedIntersection = intersections.find((intersection) => {
      if (!intersection.connected_road_ids.includes(road.id)) return false;
      const first = road.geometry.points[0];
      const last = road.geometry.points.at(-1)!;
      return Math.min(
        Math.hypot(first.x - intersection.position.x, first.y - intersection.position.y),
        Math.hypot(last.x - intersection.position.x, last.y - intersection.position.y),
      ) <= 1.5;
    });
    const roadStart = road.geometry.points[0];
    const roadEnd = road.geometry.points.at(-1)!;
    const intersectionAtEnd = connectedIntersection
      ? Math.hypot(roadEnd.x - connectedIntersection.position.x, roadEnd.y - connectedIntersection.position.y) <=
        Math.hypot(roadStart.x - connectedIntersection.position.x, roadStart.y - connectedIntersection.position.y)
      : null;
    const approachOffsetM = Math.min(
      Math.max(4, laneWidthM * 1.5),
      lineLengthM * 0.4,
    );
    for (const lane of lanes) {
      // Imported turn:lanes data remains the most specific source when it is
      // present. Editor-authored semantic permissions are the fallback; the
      // arrow is never the source of truth for either representation.
      const semanticMovements: MovementType[] =
        "allowed_movements" in lane
          ? (lane as { allowed_movements: MovementType[] }).allowed_movements
          : [];
      const arrow = turnArrowGlyph(
        lane.allowed_turns ??
          (semanticMovements.length > 0 ? semanticMovements : null),
      );
      if (!arrow) continue;
      const laneDirection = "direction" in lane ? lane.direction : "FORWARD";
      const offset = safeOffset(
        line,
        laneCenterOffsetM(roadWidthM, laneWidthM, lane.index),
      );
      if (!offset) continue;
      const travelEndsAtIntersection =
        intersectionAtEnd === null
          ? null
          : laneDirection === "FORWARD"
            ? intersectionAtEnd
            : !intersectionAtEnd;
      const arrowDistanceM =
        travelEndsAtIntersection === null
          ? lineLengthM * 0.7
          : travelEndsAtIntersection
            ? lineLengthM - approachOffsetM
            : approachOffsetM;
      let point: GeoJSON.Feature<GeoJSON.Point>;
      try {
        point = along(
          offset,
          Math.max(0, Math.min(lineLengthM, arrowDistanceM)),
          {
            units: "meters",
          },
        );
      } catch {
        continue;
      }
      features.push({
        type: "Feature",
        geometry: point.geometry,
        properties: {
          road_id: road.id,
          lane_index: lane.index,
          arrow,
          // MapLibre `text-rotate` is clockwise from north; `@turf/bearing`
          // already returns that convention (-180..180, 0 = north).
          bearing: (() => {
            const before = along(offset, Math.max(0, arrowDistanceM - 1), {
              units: "meters",
            }).geometry.coordinates;
            const after = along(
              offset,
              Math.min(lineLengthM, arrowDistanceM + 1),
              { units: "meters" },
            ).geometry.coordinates;
            const direction = bearing(before, after);
            return laneDirection === "BACKWARD" ? (direction + 180) % 360 : direction;
          })(),
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

/** Parking/cycleway are road-level (not per-lane) source fields -- see
 * `Road.parking_left`/`cycleway_left` -- schematically drawn just outside
 * the driving lanes on their real side. Only drawn when the source value
 * is a real presence (`NONE`/`UNKNOWN` draw nothing: absence of a tag is
 * not evidence of absence in reality). */
export function buildLaneUseMarkingFeatureCollection(
  roads: AnyRoad[],
  coordinateSystem: CoordinateSystem,
  intersections: LaneJunctionIntersection[] = [],
): LaneUseMarkingFeatureCollection {
  if (!supportsLaneDetailRendering(coordinateSystem)) {
    return { type: "FeatureCollection", features: [] };
  }
  const renderingLines = buildLaneRenderingLines(
    roads,
    intersections,
    coordinateSystem,
  );
  const features: LaneUseMarkingFeatureCollection["features"] = [];
  for (const road of roads) {
    const laneCount = roadLaneCount(road);
    if (laneCount < 1) continue;
    const line = renderingLines.get(road.id);
    if (!line) continue;
    const roadWidthM = roadWidthMeters(road);
    const halfWidthM = roadWidthM / 2;

    const parkingLeft = road.parking_left as ParkingLaneOrientation | undefined;
    const parkingRight = road.parking_right as
      ParkingLaneOrientation | undefined;
    const cyclewayLeft = road.cycleway_left as CyclewayType | undefined;
    const cyclewayRight = road.cycleway_right as CyclewayType | undefined;

    const hasParkingLeft =
      !!parkingLeft && parkingLeft !== "NONE" && parkingLeft !== "UNKNOWN";
    const hasParkingRight =
      !!parkingRight && parkingRight !== "NONE" && parkingRight !== "UNKNOWN";
    const hasCyclewayLeft =
      !!cyclewayLeft && cyclewayLeft !== "NONE" && cyclewayLeft !== "UNKNOWN";
    const hasCyclewayRight =
      !!cyclewayRight &&
      cyclewayRight !== "NONE" &&
      cyclewayRight !== "UNKNOWN";

    if (hasParkingLeft) {
      const offset = safeOffset(
        line,
        halfWidthM + LANE_USE_GAP_M + PARKING_SCHEMATIC_WIDTH_M / 2,
      );
      if (offset) {
        features.push({
          type: "Feature",
          geometry: offset.geometry,
          properties: {
            road_id: road.id,
            kind: "parking",
            side: "left",
            value: parkingLeft!,
          },
        });
      }
    }
    if (hasParkingRight) {
      const offset = safeOffset(
        line,
        -(halfWidthM + LANE_USE_GAP_M + PARKING_SCHEMATIC_WIDTH_M / 2),
      );
      if (offset) {
        features.push({
          type: "Feature",
          geometry: offset.geometry,
          properties: {
            road_id: road.id,
            kind: "parking",
            side: "right",
            value: parkingRight!,
          },
        });
      }
    }
    if (hasCyclewayLeft) {
      const leftBase =
        halfWidthM +
        (hasParkingLeft ? LANE_USE_GAP_M + PARKING_SCHEMATIC_WIDTH_M : 0);
      const offset = safeOffset(
        line,
        leftBase + LANE_USE_GAP_M + CYCLEWAY_SCHEMATIC_WIDTH_M / 2,
      );
      if (offset) {
        features.push({
          type: "Feature",
          geometry: offset.geometry,
          properties: {
            road_id: road.id,
            kind: "cycleway",
            side: "left",
            value: cyclewayLeft!,
          },
        });
      }
    }
    if (hasCyclewayRight) {
      const rightBase =
        halfWidthM +
        (hasParkingRight ? LANE_USE_GAP_M + PARKING_SCHEMATIC_WIDTH_M : 0);
      const offset = safeOffset(
        line,
        -(rightBase + LANE_USE_GAP_M + CYCLEWAY_SCHEMATIC_WIDTH_M / 2),
      );
      if (offset) {
        features.push({
          type: "Feature",
          geometry: offset.geometry,
          properties: {
            road_id: road.id,
            kind: "cycleway",
            side: "right",
            value: cyclewayRight!,
          },
        });
      }
    }
  }
  return { type: "FeatureCollection", features };
}
