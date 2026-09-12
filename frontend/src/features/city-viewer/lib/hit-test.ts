import type { Point } from "../types/city";
import { distancePointToPolyline } from "./geometry";
import { laneOffsetDistance, offsetPolyline, LANE_WIDTH } from "./lane-offset";
import type { CityScene } from "./scene";
import type { SelectedEntity } from "../state/selection";

const INTERSECTION_HIT_RADIUS_PX = 10;
const LANE_HIT_TOLERANCE_PX = 5;

/** Finds the topmost entity at `worldPoint` (already canvas->world
 * converted). Intersections take priority over roads/lanes since they
 * render on top; among roads, the closest lane wins, falling back to the
 * road itself if the click lands between lanes but still on the road. */
export function hitTest(
  scene: CityScene,
  worldPoint: Point,
): SelectedEntity | null {
  const { scale } = scene.viewport;
  const intersectionRadius = INTERSECTION_HIT_RADIUS_PX / scale;

  if (scene.layers.intersections) {
    for (const intersection of scene.projected.intersections) {
      const d = Math.hypot(
        worldPoint.x - intersection.position.x,
        worldPoint.y - intersection.position.y,
      );
      if (d <= intersectionRadius) {
        return { type: "intersection", id: intersection.id };
      }
    }
  }

  const laneTolerance = LANE_HIT_TOLERANCE_PX / scale;
  let bestLane: { id: string; distance: number } | null = null;
  let bestRoad: { id: string; distance: number } | null = null;

  for (const road of scene.city.roads) {
    const projected = scene.projected.roads.find((r) => r.id === road.id);
    if (!projected) continue;

    if (scene.layers.lanes) {
      for (const lane of road.lanes) {
        const offset = laneOffsetDistance(lane.direction, lane.index);
        const lanePoints = offsetPolyline(projected.points, offset);
        const distance = distancePointToPolyline(worldPoint, lanePoints);
        const threshold = LANE_WIDTH / 2 + laneTolerance;
        if (
          distance <= threshold &&
          (!bestLane || distance < bestLane.distance)
        ) {
          bestLane = { id: lane.id, distance };
        }
      }
    }

    if (scene.layers.roads) {
      const halfRoadWidth = (Math.max(road.lanes.length, 1) * LANE_WIDTH) / 2;
      const distance = distancePointToPolyline(worldPoint, projected.points);
      if (
        distance <= halfRoadWidth + laneTolerance &&
        (!bestRoad || distance < bestRoad.distance)
      ) {
        bestRoad = { id: road.id, distance };
      }
    }
  }

  if (bestLane) return { type: "lane", id: bestLane.id };
  if (bestRoad) return { type: "road", id: bestRoad.id };
  return null;
}
