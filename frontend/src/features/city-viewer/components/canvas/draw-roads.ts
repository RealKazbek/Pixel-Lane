import { worldToCanvas } from "../../lib/geometry";
import { congestionColor } from "../../lib/congestion";
import { LANE_WIDTH } from "../../lib/lane-offset";
import type { CityScene } from "../../lib/scene";

const ROAD_BASE_COLOR = "#94a3b8"; // slate-400 -- neutral until analysis says otherwise
const ROAD_SELECTED_COLOR = "#2563eb"; // blue-600

export function drawRoads(
  ctx: CanvasRenderingContext2D,
  scene: CityScene,
): void {
  if (!scene.layers.roads) return;

  for (const road of scene.city.roads) {
    const projected = scene.projected.roads.find((r) => r.id === road.id);
    if (!projected || projected.points.length < 2) continue;

    const isSelected =
      scene.selected?.type === "road" && scene.selected.id === road.id;
    const metric = scene.analysis.roadMetrics.get(road.id);
    const showCongestion = scene.layers.trafficAnalysis && metric;

    const widthPx = Math.max(
      2,
      road.lanes.length * LANE_WIDTH * scene.viewport.scale,
    );

    ctx.beginPath();
    projected.points.forEach((point, i) => {
      const canvasPoint = worldToCanvas(point, scene.viewport);
      if (i === 0) ctx.moveTo(canvasPoint.x, canvasPoint.y);
      else ctx.lineTo(canvasPoint.x, canvasPoint.y);
    });
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = widthPx;
    ctx.strokeStyle = showCongestion
      ? congestionColor(metric.congestion_level)
      : ROAD_BASE_COLOR;
    ctx.globalAlpha = showCongestion ? 0.9 : 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (isSelected) {
      ctx.lineWidth = Math.max(1, widthPx + 3);
      ctx.strokeStyle = ROAD_SELECTED_COLOR;
      ctx.globalAlpha = 0.35;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
