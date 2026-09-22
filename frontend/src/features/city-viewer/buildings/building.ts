import type { CoordinateSystem, Point } from "../types/city";

export type BuildingUseType =
  | "RESIDENTIAL"
  | "COMMERCIAL"
  | "INDUSTRIAL"
  | "CIVIC"
  | "EDUCATIONAL"
  | "HEALTHCARE"
  | "MIXED_USE"
  | "OTHER";

export interface Building {
  id: string;
  footprint: Point[];
  height_m: number | null;
  levels: number | null;
  use_type: BuildingUseType;
  name?: string | null;
  base_elevation_m?: number | null;
  elevation_strategy?: "TERRAIN" | "ABSOLUTE" | "UNKNOWN";
  metadata?: Record<string, unknown> | null;
}

export interface BuildingCollectionInput {
  buildings: Building[];
  coordinate_system: CoordinateSystem;
}

export function validateBuilding(building: Building): void {
  if (!building.id) throw new Error("Building id is required");
  if (building.footprint.length < 4) {
    throw new Error("Building footprint must contain at least four points");
  }
  const first = building.footprint[0];
  const last = building.footprint.at(-1);
  if (!last || first.x !== last.x || first.y !== last.y) {
    throw new Error("Building footprint must be a closed polygon");
  }
  if (building.height_m !== null && building.height_m < 0) {
    throw new Error("Building height cannot be negative");
  }
  if (building.levels !== null && (!Number.isInteger(building.levels) || building.levels < 1)) {
    throw new Error("Building levels must be a positive integer");
  }
}

export function buildingHeightMeters(building: Pick<Building, "height_m" | "levels">): number {
  if (building.height_m !== null && building.height_m !== undefined) return building.height_m;
  if (building.levels !== null && building.levels !== undefined) return building.levels * 3;
  return 0;
}
