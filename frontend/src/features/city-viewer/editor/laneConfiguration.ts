import type {
  Lane,
  LaneBoundaryMarking,
  LaneDirection,
  Road,
  RoadEdgeMarking,
} from "../types/city";

export const MIN_EDITOR_LANE_COUNT = 1;
export const MAX_EDITOR_LANE_COUNT = 12;
export const MIN_EDITOR_LANE_WIDTH_M = 2.5;
export const MAX_EDITOR_LANE_WIDTH_M = 6;
export const MAX_EDITOR_ROAD_WIDTH_M = 60;
export const DEFAULT_EDITOR_LANE_WIDTH_M = 3.5;

export function defaultBoundaryMarking(
  left: LaneDirection,
  right: LaneDirection,
): LaneBoundaryMarking {
  return left === right ? "DASHED_WHITE" : "DOUBLE_SOLID_WHITE";
}

export function defaultBoundaryMarkings(
  road: Pick<Road, "lanes">,
): LaneBoundaryMarking[] {
  return road.lanes
    .slice(0, -1)
    .map((lane, index) =>
      defaultBoundaryMarking(lane.direction, road.lanes[index + 1].direction),
    );
}

export function defaultEdgeMarking(
  marking: RoadEdgeMarking | undefined,
): RoadEdgeMarking {
  return marking ?? "SOLID_YELLOW";
}

export function resizeBoundaryMarkings(
  road: Pick<Road, "lanes" | "lane_boundary_markings">,
  laneCount: number,
): LaneBoundaryMarking[] {
  const defaults = defaultBoundaryMarkings(road);
  return Array.from(
    { length: Math.max(0, laneCount - 1) },
    (_, index) =>
      road.lane_boundary_markings?.[index] ?? defaults[index] ?? "DASHED_WHITE",
  );
}

export function clampLaneWidthMeters(value: number): number {
  return Math.min(
    MAX_EDITOR_LANE_WIDTH_M,
    Math.max(MIN_EDITOR_LANE_WIDTH_M, value),
  );
}

export function laneWidthMeters(road: Pick<Road, "lanes" | "width_m">): number {
  const count = Math.max(MIN_EDITOR_LANE_COUNT, road.lanes.length);
  const width =
    road.width_m && road.width_m > 0
      ? road.width_m / count
      : DEFAULT_EDITOR_LANE_WIDTH_M;
  return clampLaneWidthMeters(width);
}

/** Reconciles the editable uniform-width lane model without reordering lanes.
 * Existing rows retain their IDs and source metadata; only added rows receive
 * deterministic editor IDs and removed rows are truncated from the end. */
export function buildLaneConfiguration(
  road: Road,
  laneCount: number,
  laneWidthM: number,
  directions: LaneDirection[],
): { lanes: Lane[]; width_m: number } | null {
  if (
    !Number.isInteger(laneCount) ||
    laneCount < 1 ||
    laneCount > MAX_EDITOR_LANE_COUNT
  ) {
    return null;
  }
  const width = clampLaneWidthMeters(laneWidthM);
  const totalWidth = laneCount * width;
  if (totalWidth > MAX_EDITOR_ROAD_WIDTH_M) return null;

  const lanes = Array.from({ length: laneCount }, (_, index) => ({
    ...(road.lanes[index] ?? {
      id: `${road.id}-lane-${index}`,
      road_id: road.id,
      allowed_movements: [],
      lane_type: "GENERAL" as const,
      speed_limit_kmh: null,
    }),
    id: road.lanes[index]?.id ?? `${road.id}-lane-${index}`,
    road_id: road.id,
    index,
    direction: directions[index] ?? road.lanes[index]?.direction ?? "FORWARD",
  }));
  return { lanes, width_m: totalWidth };
}
