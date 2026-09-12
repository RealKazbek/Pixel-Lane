import { worldToCanvas } from "../../lib/geometry";
import {
  laneOffsetDistance,
  offsetPolyline,
  LANE_WIDTH,
} from "../../lib/lane-offset";
import type { Point } from "../../types/city";
import type { CityScene } from "../../lib/scene";

const PARKING_COLOR = "rgba(99, 102, 241, 0.55)"; // indigo-500, translucent -- a distinct visual layer
const PARKING_DISALLOWED_COLOR = "rgba(148, 163, 184, 0.35)";

/** ParkingZone has no geometry of its own in the City Model -- it only
 * references a road (and optionally a lane/side). This approximates its
 * extent as the middle third of the referenced road/lane, which is enough
 * to show "parking exists here" without inventing fields the domain model
 * doesn't have. */
function middleSegment(points: Point[]): Point[] {
  if (points.length < 2) return points;
  const start = Math.floor(points.length * (1 / 3));
  const end = Math.ceil(points.length * (2 / 3));
  const slice = points.slice(
    Math.max(0, start),
    Math.min(points.length, end + 1),
  );
  return slice.length >= 2 ? slice : points;
}

export function drawParking(
  ctx: CanvasRenderingContext2D,
  scene: CityScene,
): void {
  if (!scene.layers.parking) return;

  for (const zone of scene.city.parking_zones) {
    const road = scene.city.roads.find((r) => r.id === zone.road_id);
    const projected = scene.projected.roads.find((r) => r.id === zone.road_id);
    if (!road || !projected || projected.points.length < 2) continue;

    let offset: number;
    if (zone.lane_id) {
      const lane = road.lanes.find((l) => l.id === zone.lane_id);
      offset = lane ? laneOffsetDistance(lane.direction, lane.index) : 0;
    } else {
      const halfWidth = (Math.max(road.lanes.length, 1) * LANE_WIDTH) / 2;
      offset =
        zone.side === "LEFT"
          ? halfWidth + LANE_WIDTH / 2
          : -(halfWidth + LANE_WIDTH / 2);
    }

    const zonePoints = middleSegment(offsetPolyline(projected.points, offset));

    ctx.beginPath();
    zonePoints.forEach((point, i) => {
      const canvasPoint = worldToCanvas(point, scene.viewport);
      if (i === 0) ctx.moveTo(canvasPoint.x, canvasPoint.y);
      else ctx.lineTo(canvasPoint.x, canvasPoint.y);
    });
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(3, LANE_WIDTH * 0.9 * scene.viewport.scale);
    ctx.strokeStyle = zone.allowed ? PARKING_COLOR : PARKING_DISALLOWED_COLOR;
    ctx.setLineDash(zone.allowed ? [] : [4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
