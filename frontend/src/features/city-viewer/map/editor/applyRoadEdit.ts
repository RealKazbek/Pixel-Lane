/**
 * The editing-adapter boundary from the task's required data flow:
 *
 *   editor geometry -> Pixel Lane editing adapter -> validated City Model
 *   update -> persistent storage
 *
 * This is the only place that turns raw edited points into an API call.
 * Structural validation (minimum point count, coordinate bounds) is
 * ultimately enforced by the backend's `Polyline` schema -- this module
 * does a cheap client-side pre-check so obviously-invalid geometry never
 * makes a request, but never claims to duplicate the server's validation.
 */

import { ApiError } from "../../api/client";
import { updateRoadGeometry } from "../../api/cities";
import type { Point, Road } from "../../types/city";

const MIN_POINTS = 2;

export type ApplyRoadEditResult =
  { ok: true; road: Road } | { ok: false; error: string };

export async function applyRoadEdit(
  cityId: string,
  roadId: string,
  points: Point[],
): Promise<ApplyRoadEditResult> {
  if (points.length < MIN_POINTS) {
    return { ok: false, error: `A road needs at least ${MIN_POINTS} points.` };
  }

  try {
    const road = await updateRoadGeometry(cityId, roadId, { points });
    return { ok: true, road };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to save the edited road geometry.";
    return { ok: false, error: message };
  }
}
