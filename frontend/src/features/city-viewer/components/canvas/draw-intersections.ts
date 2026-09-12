import { worldToCanvas } from "../../lib/geometry";
import { congestionColor } from "../../lib/congestion";
import type { CityScene } from "../../lib/scene";

const INTERSECTION_RADIUS_PX = 6;
const SIGNAL_RING_COLOR = "#0f172a"; // slate-900
const SELECTED_COLOR = "#2563eb";
const DEFAULT_FILL = "#e2e8f0"; // slate-200

export function drawIntersections(
  ctx: CanvasRenderingContext2D,
  scene: CityScene,
): void {
  if (!scene.layers.intersections) return;

  for (const intersection of scene.city.intersections) {
    const position = scene.projected.intersections.find(
      (i) => i.id === intersection.id,
    )?.position;
    if (!position) continue;

    const canvasPoint = worldToCanvas(position, scene.viewport);
    const isSelected =
      scene.selected?.type === "intersection" &&
      scene.selected.id === intersection.id;
    const metric = scene.analysis.intersectionMetrics.get(intersection.id);
    const showCongestion = scene.layers.trafficAnalysis && metric;
    const isSignalized = intersection.traffic_light_id !== null;

    const radius = isSelected
      ? INTERSECTION_RADIUS_PX + 2
      : INTERSECTION_RADIUS_PX;

    ctx.beginPath();
    ctx.arc(canvasPoint.x, canvasPoint.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = showCongestion
      ? congestionColor(metric.congestion_level)
      : DEFAULT_FILL;
    ctx.fill();
    ctx.lineWidth = isSignalized ? 2.5 : 1.5;
    ctx.strokeStyle = isSelected ? SELECTED_COLOR : SIGNAL_RING_COLOR;
    ctx.stroke();

    if (isSignalized && scene.layers.trafficLights) {
      drawTrafficLightMarker(ctx, canvasPoint, radius);
    }
  }
}

/** A compact 3-dot marker (red/yellow/green) indicating a traffic light is
 * present -- not a real signal-phase animation (see docs/architecture.md,
 * Traffic Engine v1 does not simulate signal timing). */
function drawTrafficLightMarker(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  intersectionRadius: number,
): void {
  const dotRadius = 1.6;
  const spacing = dotRadius * 2.4;
  const originX = center.x + intersectionRadius + 3;
  const originY = center.y - spacing;
  const colors = ["#ef4444", "#eab308", "#22c55e"];

  colors.forEach((color, i) => {
    ctx.beginPath();
    ctx.arc(originX, originY + i * spacing, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
}
