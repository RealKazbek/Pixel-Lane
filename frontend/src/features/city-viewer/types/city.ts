/**
 * Mirrors `backend/app/city/schemas/*` (the `CityRead` shape and friends).
 *
 * Field names intentionally match the JSON the API returns byte-for-byte
 * (snake_case) -- there is no camelCase mapping layer for v1, to avoid an
 * extra translation step for a contract that already has one source of
 * truth (the backend Pydantic schemas).
 */

export type CoordinateSystem = "LOCAL_CARTESIAN" | "WGS84";

export type RoadType =
  "RESIDENTIAL" | "COLLECTOR" | "ARTERIAL" | "HIGHWAY" | "SERVICE";

export type LaneDirection = "FORWARD" | "BACKWARD";

export type LaneType =
  "GENERAL" | "BUS" | "BICYCLE" | "EMERGENCY" | "PARKING" | "TURN_ONLY";

export type MovementType = "LEFT" | "STRAIGHT" | "RIGHT" | "U_TURN";

export type IntersectionControlType =
  | "UNCONTROLLED"
  | "STOP_SIGN"
  | "YIELD_SIGN"
  | "ALL_WAY_STOP"
  | "TRAFFIC_LIGHT";

export type ParkingSide = "LEFT" | "RIGHT" | "BOTH";

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
}

export interface Road {
  id: string;
  city_id: string;
  name: string;
  road_type: RoadType;
  geometry: Polyline;
  default_speed_limit_kmh: number;
  lanes: Lane[];
}

export interface Intersection {
  id: string;
  city_id: string;
  position: Point;
  connected_road_ids: string[];
  connected_lane_ids: string[];
  control_type: IntersectionControlType;
  traffic_light_id: string | null;
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

export interface City {
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
}

export interface CitySummary {
  id: string;
  name: string;
  coordinate_system: CoordinateSystem;
  created_at: string;
  updated_at: string;
}
