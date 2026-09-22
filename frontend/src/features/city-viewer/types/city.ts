/**
 * Mirrors `backend/app/city/schemas/*` (the `CityRead` shape and friends).
 *
 * Field names intentionally match the JSON the API returns byte-for-byte
 * (snake_case) -- there is no camelCase mapping layer for v1, to avoid an
 * extra translation step for a contract that already has one source of
 * truth (the backend Pydantic schemas).
 */

import type { Building } from "../buildings/building";

export type CoordinateSystem = "LOCAL_CARTESIAN" | "WGS84";

export type RoadType =
  "RESIDENTIAL" | "COLLECTOR" | "ARTERIAL" | "HIGHWAY" | "SERVICE";

export type LaneDirection = "FORWARD" | "BACKWARD";
export type LaneBoundaryMarking =
  "NONE" | "DASHED_WHITE" | "SOLID_WHITE" | "DOUBLE_SOLID_WHITE";
export type RoadEdgeMarking = "NONE" | "SOLID_WHITE" | "SOLID_YELLOW";

export type LaneType =
  "GENERAL" | "BUS" | "BICYCLE" | "EMERGENCY" | "PARKING" | "TURN_ONLY";

export type MovementType = "LEFT" | "STRAIGHT" | "RIGHT" | "U_TURN";

export interface LaneConnection {
  id: string;
  city_id: string;
  intersection_id: string;
  from_road_id: string;
  from_lane_id: string;
  to_road_id: string;
  to_lane_id: string;
  maneuver: MovementType;
}

export type IntersectionControlType =
  | "UNCONTROLLED"
  | "STOP_SIGN"
  | "YIELD_SIGN"
  | "ALL_WAY_STOP"
  | "TRAFFIC_LIGHT";

export type ParkingSide = "LEFT" | "RIGHT" | "BOTH";

export type MedianType = "NONE" | "PAINTED" | "PHYSICAL" | "UNKNOWN";

/** Confidence of a Road's own generated lane count -- see backend's
 * app.city.domain.enums.LaneCountQuality / docs/city-model.md Part 2A. */
export type LaneCountQuality = "SOURCE" | "INFERRED" | "FALLBACK" | "UNKNOWN";

/** Normalized OSM `turn:lanes=*` per-lane token. */
export type TurnLaneType =
  | "LEFT"
  | "SLIGHT_LEFT"
  | "THROUGH"
  | "SLIGHT_RIGHT"
  | "RIGHT"
  | "REVERSE"
  | "MERGE_TO_LEFT"
  | "MERGE_TO_RIGHT"
  | "NONE";

/** Normalized OSM `change:lanes=*` per-lane value. */
export type LaneChangePermission =
  "YES" | "NO" | "NOT_LEFT" | "NOT_RIGHT" | "ONLY_LEFT" | "ONLY_RIGHT";

/** Normalized OSM `parking:lane:*` value -- SOURCE only, never guessed. */
export type ParkingLaneOrientation =
  "NONE" | "PARALLEL" | "DIAGONAL" | "PERPENDICULAR" | "MARKED" | "UNKNOWN";

/** Normalized OSM `cycleway*` value. */
export type CyclewayType =
  "NONE" | "LANE" | "TRACK" | "SHARED_LANE" | "UNKNOWN";

export interface Point {
  x: number;
  y: number;
}

export interface Polyline {
  points: Point[];
}

export interface Lane {
  id: string;
  road_id: string;
  index: number;
  direction: LaneDirection;
  allowed_movements: MovementType[];
  lane_type: LaneType;
  speed_limit_kmh: number | null;
  /** Normalized `turn:lanes=*` groups for this lane. `null`/absent = no
   * reliable source data (never fabricated); see docs/city-model.md's
   * Part 2A lane-data audit and the Road+Lane V1 lane-geometry adapter. */
  allowed_turns?: TurnLaneType[] | null;
  lane_change?: LaneChangePermission | null;
}

export interface Road {
  id: string;
  city_id: string;
  name: string;
  road_type: RoadType;
  geometry: Polyline;
  /** Derived rendering smoothness; source geometry remains the polyline. */
  smoothing?: number | null;
  corner_smoothing?: number[] | null;
  default_speed_limit_kmh: number | null;
  source_id?: string | null;
  source_road_type?: string | null;
  one_way?: boolean | null;
  source_lane_count?: number | null;
  /** Physical carriageway width in meters -- explicit source value if
   * known, otherwise a centrally-computed fallback (see backend's
   * app.city.domain.road_geometry). Optional/nullable for backward
   * compatibility with roads imported before this field existed. */
  width_m?: number | null;
  /** True when `width_m` is a fallback estimate rather than a real
   * source measurement. Defaults to true (unknown/legacy data should not
   * be presented as measured). */
  is_width_estimated?: boolean;
  /** 1 = single shared surface for both directions, 2 = this Road is one
   * of a pair of physically separated carriageways (e.g. divided
   * arterial). Individual lanes are a later roadmap part. */
  carriageway_count?: number;
  median?: MedianType;
  /** Vertical level relative to ground: 0 = ground, positive = overpass/
   * bridge, negative = underpass/tunnel. A geometric crossing between
   * roads at different levels is never assumed to be an intersection. */
  level?: number;
  is_bridge?: boolean;
  is_tunnel?: boolean;
  /** Raw OSM `lanes:forward`/`lanes:backward`/`lanes:both_ways` tag
   * values for the original way this Road was derived from (regardless
   * of which direction this Road represents) -- `null`/absent = the tag
   * was not present, never an inferred split. See docs/city-model.md's
   * Part 2A lane-data audit. */
  forward_lane_count?: number | null;
  backward_lane_count?: number | null;
  both_ways_lane_count?: number | null;
  /** Confidence of this Road's own generated lane count (`lanes.length`). */
  lane_count_quality?: LaneCountQuality;
  /** Parking/cycleway presence at the road's left/right edge, from OSM
   * `parking:lane:*`/`cycleway*` -- SOURCE only, never guessed. `UNKNOWN`
   * (not `NONE`) is the default: an absent tag says nothing about reality. */
  parking_left?: ParkingLaneOrientation;
  parking_right?: ParkingLaneOrientation;
  cycleway_left?: CyclewayType;
  cycleway_right?: CyclewayType;
  lanes: Lane[];
  left_edge_marking?: RoadEdgeMarking;
  right_edge_marking?: RoadEdgeMarking;
  lane_boundary_markings?: LaneBoundaryMarking[] | null;
}

export interface Intersection {
  id: string;
  city_id: string;
  position: Point;
  connected_road_ids: string[];
  connected_lane_ids: string[];
  control_type: IntersectionControlType;
  traffic_light_id: string | null;
  /** Derived-junction presentation setting; topology remains authoritative. */
  junction_corner_radius_m?: number;
}

export interface SignalGroup {
  id: string;
  name: string;
  controlled_lane_ids: string[];
}

export interface Phase {
  id: string;
  name: string;
  duration_seconds: number;
  green_signal_group_ids: string[];
}

export interface TrafficLight {
  id: string;
  city_id: string;
  intersection_id: string;
  signal_groups: SignalGroup[];
  phases: Phase[];
}

export interface ParkingZone {
  id: string;
  city_id: string;
  road_id: string;
  lane_id: string | null;
  allowed: boolean;
  side: ParkingSide | null;
  capacity: number | null;
}

export interface BusStop {
  id: string;
  city_id: string;
  road_id: string;
  position_x: number;
  position_y: number;
  name: string | null;
}

export interface Crosswalk {
  id: string;
  city_id: string;
  road_id: string;
  /** Position along the road's centerline, 0 (first point) to 1 (last). */
  position_ratio: number;
}

export interface TrafficRule {
  id: string;
  city_id: string;
  rule_type:
    | "YIELD"
    | "STOP"
    | "PRIORITY_ROAD"
    | "NO_ENTRY"
    | "TURN_RESTRICTION"
    | "SPEED_LIMIT";
  target_type: "ROAD" | "LANE" | "INTERSECTION" | "MOVEMENT";
  target_id: string;
  movement: MovementType | null;
  speed_limit_kmh: number | null;
}

export interface City {
  bounds?: [number, number, number, number] | null;
  road_count?: number;
  id: string;
  name: string;
  description: string | null;
  coordinate_system: CoordinateSystem;
  created_at: string;
  updated_at: string;
  roads: Road[];
  intersections: Intersection[];
  traffic_lights: TrafficLight[];
  parking_zones: ParkingZone[];
  bus_stops: BusStop[];
  crosswalks: Crosswalk[];
  traffic_rules?: TrafficRule[];
  lane_connections?: LaneConnection[];
  /** Optional until the backend City Model exposes persisted buildings. */
  buildings?: Building[];
}

export interface CitySummary {
  id: string;
  name: string;
  coordinate_system: CoordinateSystem;
  created_at: string;
  updated_at: string;
}

/** Lane-level detail for viewport rendering only -- mirrors the backend's
 * `MapLaneSummary` (deliberately smaller than `Lane`: no id/road_id/
 * speed_limit/direction). */
export interface MapLaneSummary {
  index: number;
  lane_type: LaneType;
  allowed_turns?: TurnLaneType[] | null;
  lane_change?: LaneChangePermission | null;
}

export type MapRoad = Pick<
  Road,
  | "id"
  | "name"
  | "road_type"
  | "geometry"
  | "smoothing"
  | "corner_smoothing"
  | "width_m"
  | "is_width_estimated"
  | "carriageway_count"
  | "median"
  | "level"
  | "is_bridge"
  | "is_tunnel"
  | "forward_lane_count"
  | "backward_lane_count"
  | "both_ways_lane_count"
  | "lane_count_quality"
  | "parking_left"
  | "parking_right"
  | "cycleway_left"
  | "cycleway_right"
> & {
  lane_count: number;
  lanes?: MapLaneSummary[];
};
