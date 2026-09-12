import type { CityScene } from "../../lib/scene";
import { drawRoads } from "./draw-roads";
import { drawLanes } from "./draw-lanes";
import { drawIntersections } from "./draw-intersections";
import { drawParking } from "./draw-parking";

const BACKGROUND_LIGHT = "#f8fafc"; // slate-50
const BACKGROUND_DARK = "#0b1220";

/** Pure Canvas drawing -- no React, no state, so it can be unit-reasoned
 * about and called only when something actually changed (see
 * useCanvasRenderer). Draw order is back-to-front: roads, parking, lanes,
 * intersections (which sit on top). */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  scene: CityScene,
  isDarkMode: boolean,
): void {
  const { canvasWidth, canvasHeight, devicePixelRatio } = scene;

  ctx.save();
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = isDarkMode ? BACKGROUND_DARK : BACKGROUND_LIGHT;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  drawRoads(ctx, scene);
  drawParking(ctx, scene);
  drawLanes(ctx, scene);
  drawIntersections(ctx, scene);

  ctx.restore();
}
