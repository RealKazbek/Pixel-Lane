import type {
  LaneBoundaryMarking,
  LaneDirection,
  Road,
  RoadEdgeMarking,
} from "../types/city";
import {
  buildLaneConfiguration,
  DEFAULT_EDITOR_LANE_WIDTH_M,
  defaultBoundaryMarkings,
  defaultEdgeMarking,
  MAX_EDITOR_LANE_COUNT,
  MAX_EDITOR_LANE_WIDTH_M,
  MAX_EDITOR_ROAD_WIDTH_M,
  MIN_EDITOR_LANE_COUNT,
  MIN_EDITOR_LANE_WIDTH_M,
} from "./laneConfiguration";

export type RoadPresetId =
  "two-way-2-lane" | "two-way-4-lane" | "one-way-2-lane" | "one-way-3-lane";

export interface RoadPreset {
  id: RoadPresetId;
  label: "twoWay2" | "twoWay4" | "oneWay2" | "oneWay3";
  description:
    | "twoWay2Description"
    | "twoWay4Description"
    | "oneWay2Description"
    | "oneWay3Description";
  laneWidthM: number;
  laneDirections: readonly LaneDirection[];
  laneBoundaryMarkings: readonly LaneBoundaryMarking[];
  leftEdgeMarking: RoadEdgeMarking;
  rightEdgeMarking: RoadEdgeMarking;
}

export const ROAD_PRESETS: readonly RoadPreset[] = [
  {
    id: "two-way-2-lane",
    label: "twoWay2",
    description: "twoWay2Description",
    laneWidthM: DEFAULT_EDITOR_LANE_WIDTH_M,
    laneDirections: ["FORWARD", "BACKWARD"],
    laneBoundaryMarkings: ["DOUBLE_SOLID_WHITE"],
    leftEdgeMarking: "SOLID_YELLOW",
    rightEdgeMarking: "SOLID_YELLOW",
  },
  {
    id: "two-way-4-lane",
    label: "twoWay4",
    description: "twoWay4Description",
    laneWidthM: DEFAULT_EDITOR_LANE_WIDTH_M,
    laneDirections: ["FORWARD", "FORWARD", "BACKWARD", "BACKWARD"],
    laneBoundaryMarkings: [
      "DASHED_WHITE",
      "DOUBLE_SOLID_WHITE",
      "DASHED_WHITE",
    ],
    leftEdgeMarking: "SOLID_YELLOW",
    rightEdgeMarking: "SOLID_YELLOW",
  },
  {
    id: "one-way-2-lane",
    label: "oneWay2",
    description: "oneWay2Description",
    laneWidthM: DEFAULT_EDITOR_LANE_WIDTH_M,
    laneDirections: ["FORWARD", "FORWARD"],
    laneBoundaryMarkings: ["DASHED_WHITE"],
    leftEdgeMarking: "SOLID_YELLOW",
    rightEdgeMarking: "SOLID_YELLOW",
  },
  {
    id: "one-way-3-lane",
    label: "oneWay3",
    description: "oneWay3Description",
    laneWidthM: DEFAULT_EDITOR_LANE_WIDTH_M,
    laneDirections: ["FORWARD", "FORWARD", "FORWARD"],
    laneBoundaryMarkings: ["DASHED_WHITE", "DASHED_WHITE"],
    leftEdgeMarking: "SOLID_YELLOW",
    rightEdgeMarking: "SOLID_YELLOW",
  },
] as const;

export function isValidRoadPreset(preset: RoadPreset): boolean {
  const laneCount = preset.laneDirections.length;
  return (
    laneCount >= MIN_EDITOR_LANE_COUNT &&
    laneCount <= MAX_EDITOR_LANE_COUNT &&
    preset.laneBoundaryMarkings.length === laneCount - 1 &&
    preset.laneWidthM >= MIN_EDITOR_LANE_WIDTH_M &&
    preset.laneWidthM <= MAX_EDITOR_LANE_WIDTH_M &&
    laneCount * preset.laneWidthM <= MAX_EDITOR_ROAD_WIDTH_M
  );
}

export function getRoadPreset(id: RoadPresetId): RoadPreset {
  const preset = ROAD_PRESETS.find((candidate) => candidate.id === id);
  if (!preset || !isValidRoadPreset(preset)) {
    throw new Error(`Invalid road preset: ${id}`);
  }
  return preset;
}

export function applyRoadPreset(road: Road, preset: RoadPreset): Road | null {
  if (!isValidRoadPreset(preset)) return null;
  const laneConfiguration = buildLaneConfiguration(
    road,
    preset.laneDirections.length,
    preset.laneWidthM,
    Array.from(
      { length: preset.laneDirections.length },
      (_, index) =>
        road.lanes[index]?.direction ??
        road.lanes.at(-1)?.direction ??
        preset.laneDirections[index],
    ),
  );
  if (!laneConfiguration) return null;

  return {
    ...road,
    ...laneConfiguration,
    left_edge_marking: preset.leftEdgeMarking,
    right_edge_marking: preset.rightEdgeMarking,
    lane_boundary_markings: [...preset.laneBoundaryMarkings],
  };
}

export function matchRoadPreset(road: Road): RoadPreset | null {
  const boundaryMarkings =
    road.lane_boundary_markings?.length === road.lanes.length - 1
      ? road.lane_boundary_markings
      : defaultBoundaryMarkings(road);

  return (
    ROAD_PRESETS.find((preset) => {
      const expectedWidth = preset.laneDirections.length * preset.laneWidthM;
      return (
        road.lanes.length === preset.laneDirections.length &&
        Math.abs((road.width_m ?? 0) - expectedWidth) < 0.001 &&
        road.lanes.every(
          (lane, index) => lane.direction === preset.laneDirections[index],
        ) &&
        boundaryMarkings.every(
          (marking, index) => marking === preset.laneBoundaryMarkings[index],
        ) &&
        defaultEdgeMarking(road.left_edge_marking) === preset.leftEdgeMarking &&
        defaultEdgeMarking(road.right_edge_marking) === preset.rightEdgeMarking
      );
    }) ?? null
  );
}
