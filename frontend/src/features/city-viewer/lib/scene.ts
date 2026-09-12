import type { City, Point } from "../types/city";
import type { AnalysisLookup } from "./analysis-lookup";
import type { LayerVisibility } from "../state/layers";
import type { SelectedEntity } from "../state/selection";
import type { ProjectedCity } from "./project-city";
import type { Viewport } from "./geometry";

/** Everything the renderer (and hit-testing) needs to draw one frame.
 * Built once per relevant change (city/analysis/viewport/selection/layers/
 * resize) -- never on a timer (see AGENTS.md resource-efficiency rules). */
export interface CityScene {
  city: City;
  projected: ProjectedCity;
  analysis: AnalysisLookup;
  viewport: Viewport;
  layers: LayerVisibility;
  selected: SelectedEntity | null;
  canvasWidth: number;
  canvasHeight: number;
  devicePixelRatio: number;
}

export function findProjectedRoad(
  scene: CityScene,
  roadId: string,
): Point[] | undefined {
  return scene.projected.roads.find((r) => r.id === roadId)?.points;
}

export function findProjectedIntersection(
  scene: CityScene,
  intersectionId: string,
): Point | undefined {
  return scene.projected.intersections.find((i) => i.id === intersectionId)
    ?.position;
}

function midpoint(points: Point[]): Point {
  return points[Math.floor(points.length / 2)];
}

/** A representative world point for centering the viewport on a selected
 * (or bottleneck-highlighted) entity: the intersection's own position, or
 * the midpoint of the road/lane's road centerline. */
export function entityCenterPoint(
  city: City,
  projected: ProjectedCity,
  entity: { type: "road" | "lane" | "intersection"; id: string },
): Point | null {
  if (entity.type === "intersection") {
    return (
      projected.intersections.find((i) => i.id === entity.id)?.position ?? null
    );
  }
  const roadId =
    entity.type === "road"
      ? entity.id
      : city.roads.find((r) => r.lanes.some((l) => l.id === entity.id))?.id;
  if (!roadId) return null;
  const points = projected.roads.find((r) => r.id === roadId)?.points;
  return points && points.length > 0 ? midpoint(points) : null;
}
