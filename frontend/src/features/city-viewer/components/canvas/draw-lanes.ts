import { worldToCanvas } from "../../lib/geometry";
import { congestionColor, NO_DATA_COLOR } from "../../lib/congestion";
import {
  arrowPlacements,
  laneOffsetDistance,
  offsetPolyline,
  LANE_WIDTH,
} from "../../lib/lane-offset";
import type { CityScene } from "../../lib/scene";

const LANE_SELECTED_COLOR = "#2563eb";
const ARROW_SPACING_M = 40; // meters between direction arrows -- not "every 5px"
const ARROW_SIZE_PX = 5;

export function drawLanes(
  ctx: CanvasRenderingContext2D,
  scene: CityScene,
): void {
  if (!scene.layers.lanes) return;

  for (const road of scene.city.roads) {
    const projected = scene.projected.roads.find((r) => r.id === road.id);
    if (!projected || projected.points.length < 2) continue;

    for (const lane of road.lanes) {
      const offset = laneOffsetDistance(lane.direction, lane.index);
      const lanePoints = offsetPolyline(projected.points, offset);
      const isSelected =
        scene.selected?.type === "lane" && scene.selected.id === lane.id;
      const metric = scene.analysis.laneMetrics.get(lane.id);
      const showCongestion = scene.layers.trafficAnalysis && metric;

      const color = showCongestion
        ? congestionColor(metric.congestion_level)
        : NO_DATA_COLOR;
      const laneWidthPx = Math.max(
        1.5,
        LANE_WIDTH * 0.7 * scene.viewport.scale,
      );

      ctx.beginPath();
      lanePoints.forEach((point, i) => {
        const canvasPoint = worldToCanvas(point, scene.viewport);
        if (i === 0) ctx.moveTo(canvasPoint.x, canvasPoint.y);
        else ctx.lineTo(canvasPoint.x, canvasPoint.y);
      });
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = isSelected ? laneWidthPx + 2 : laneWidthPx;
      ctx.strokeStyle = isSelected ? LANE_SELECTED_COLOR : color;
      ctx.stroke();

      drawDirectionArrows(
        ctx,
        scene,
        lanePoints,
        lane.direction === "BACKWARD",
      );
    }
  }
}

function drawDirectionArrows(
  ctx: CanvasRenderingContext2D,
  scene: CityScene,
  lanePoints: { x: number; y: number }[],
  reverse: boolean,
): void {
  const placements = arrowPlacements(lanePoints, ARROW_SPACING_M, reverse);
  ctx.fillStyle = "rgba(15, 23, 42, 0.55)"; // slate-900 translucent

  for (const { position, direction } of placements) {
    const canvasPoint = worldToCanvas(position, scene.viewport);
    // World Y is flipped on-screen, so flip the arrow's Y component too.
    const angle = Math.atan2(-direction.y, direction.x);
    ctx.save();
    ctx.translate(canvasPoint.x, canvasPoint.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(ARROW_SIZE_PX, 0);
    ctx.lineTo(-ARROW_SIZE_PX * 0.6, ARROW_SIZE_PX * 0.6);
    ctx.lineTo(-ARROW_SIZE_PX * 0.6, -ARROW_SIZE_PX * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
