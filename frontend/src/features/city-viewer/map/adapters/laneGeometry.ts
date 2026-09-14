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
 * field (`Lane.allowed_turns`, `Lane.lane_type`, `Road.parking_left/
 * right`, `Road.cycleway_left/right`) is present and not UNKNOWN/absent.
 */

import along from "@turf/along";
import bearing from "@turf/bearing";
import { lineString as turfLineString } from "@turf/helpers";
import lineOffset from "@turf/line-offset";
import { toLngLat } from "./coordinates";
import { roadLengthMeters } from "./geometryLength";
import { roadLaneCount, roadWidthMeters } from "../styles/roadStyle";
import type {
  CoordinateSystem,
  CyclewayType,
  MapRoad,
  ParkingLaneOrientation,
  Road,
  TurnLaneType,
} from "../../types/city";

type AnyRoad = Road | MapRoad;

export interface LaneSurfaceProperties {
  road_id: string;
  lane_index: number;
  lane_type: string;
  is_bus: boolean;
  lane_width_m: number;
}

export interface LaneBoundaryProperties {
  road_id: string;
  /** "edge" = outer road boundary (solid); "separator" = between two
   * lanes. Pixel Lane has no OSM-backed evidence of individual lane-line
   * style (solid/double-solid/dashed) -- see docs/city-model.md's
   * Road+Lane V1 audit -- so every internal separator renders the same
   * (dashed) rather than fabricating a distinction the source data
   * doesn't support. */
  kind: "edge" | "separator";
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

const TURN_ARROW_GLYPHS: Record<TurnLaneType, string> = {
  LEFT: "←",
  SLIGHT_LEFT: "↖",
  THROUGH: "↑",
  SLIGHT_RIGHT: "↗",
  RIGHT: "→",
  REVERSE: "↺",
  MERGE_TO_LEFT: "⬉",
  MERGE_TO_RIGHT: "⬈",
  NONE: "",
};

/** `null` when there is nothing worth drawing (no data, or the only
 * token is the explicit "no turn indicated" marker) -- never a fabricated
 * default arrow. */
function turnArrowGlyph(
  tokens: TurnLaneType[] | null | undefined,
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
const TURN_ARROW_POSITION_FRACTION = 0.85;

function toLineStringFeature(
  coordinateSystem: CoordinateSystem,
  road: AnyRoad,
): GeoJSON.Feature<GeoJSON.LineString> | null {
  const points = road.geometry.points;
  if (points.length < 2) return null;
  const coords = points.map((p) => toLngLat(coordinateSystem, p));
  return turfLineString(coords);
}

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

export function buildLaneSurfaceFeatureCollection(
  roads: AnyRoad[],
  coordinateSystem: CoordinateSystem,
): LaneSurfaceFeatureCollection {
  const features: LaneSurfaceFeatureCollection["features"] = [];
  for (const road of roads) {
    const laneCount = roadLaneCount(road);
    const lanes = "lanes" in road ? road.lanes : undefined;
    if (laneCount < 1) continue;
    const line = toLineStringFeature(coordinateSystem, road);
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
): LaneBoundaryFeatureCollection {
  const features: LaneBoundaryFeatureCollection["features"] = [];
  for (const road of roads) {
    const laneCount = roadLaneCount(road);
    if (laneCount < 1) continue;
    const line = toLineStringFeature(coordinateSystem, road);
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
      features.push({
        type: "Feature",
        geometry: offset.geometry,
        properties: {
          road_id: road.id,
          kind: edgeOffsets.has(offsetM) ? "edge" : "separator",
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

export function buildTurnArrowFeatureCollection(
  roads: AnyRoad[],
  coordinateSystem: CoordinateSystem,
): TurnArrowFeatureCollection {
  const features: TurnArrowFeatureCollection["features"] = [];
  for (const road of roads) {
    const lanes = "lanes" in road ? road.lanes : undefined;
    if (!lanes || lanes.length === 0) continue;
    const laneCount = roadLaneCount(road);
    if (laneCount < 1) continue;
    const line = toLineStringFeature(coordinateSystem, road);
    if (!line) continue;
    const lengthM = roadLengthMeters(road, coordinateSystem);
    if (lengthM <= 0) continue;
    const roadWidthM = roadWidthMeters(road);
    const laneWidthM = roadWidthM / laneCount;
    const coords = line.geometry.coordinates;
    const roadBearing = bearing(coords[0], coords[coords.length - 1]);
    for (const lane of lanes) {
      const arrow = turnArrowGlyph(lane.allowed_turns);
      if (!arrow) continue;
      const offset = safeOffset(
        line,
        laneCenterOffsetM(roadWidthM, laneWidthM, lane.index),
      );
      if (!offset) continue;
      let point: GeoJSON.Feature<GeoJSON.Point>;
      try {
        point = along(offset, lengthM * TURN_ARROW_POSITION_FRACTION, {
          units: "meters",
        });
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
          bearing: roadBearing,
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
): LaneUseMarkingFeatureCollection {
  const features: LaneUseMarkingFeatureCollection["features"] = [];
  for (const road of roads) {
    const laneCount = roadLaneCount(road);
    if (laneCount < 1) continue;
    const line = toLineStringFeature(coordinateSystem, road);
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
