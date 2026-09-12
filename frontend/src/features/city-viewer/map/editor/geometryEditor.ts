/**
 * The only module allowed to import terra-draw / terra-draw-maplibre-gl-
 * adapter -- everything else talks to this small, Pixel Lane-specific
 * interface (see map/README.md and AGENTS.md's library-first rule: a
 * mature vertex-editing library behind a thin adapter, not a hand-rolled
 * one).
 *
 * CRITICAL: Terra Draw's internal store is temporary UI state, never the
 * source of truth. `apply()` reads the edited geometry out and hands back
 * plain City Model `Point`s; the caller is responsible for validating and
 * persisting them through the City Model API (see editor/applyRoadEdit.ts).
 */

import { TerraDraw, TerraDrawSelectMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import type { Map as MapLibreMap } from "maplibre-gl";
import { fromLngLat, toLngLat, type LngLat } from "../adapters/coordinates";
import type { CoordinateSystem, Point, Road } from "../../types/city";

export interface GeometryEditor {
  /** Loads `road`'s geometry into the editor as an editable, draggable
   * linestring (vertices draggable, midpoints add new vertices, keyboard
   * delete removes them -- all Terra Draw's built-in select-mode
   * behavior, not custom vertex-manipulation code). */
  beginEditingRoad(road: Road, coordinateSystem: CoordinateSystem): void;
  /** Discards the in-progress edit without touching the City Model. */
  cancel(): void;
  /** Reads the current edited geometry back out as City Model points, and
   * clears the editor. Returns null if nothing was being edited or the
   * feature is gone. */
  apply(coordinateSystem: CoordinateSystem): Point[] | null;
  /** Releases Terra Draw's map resources (call on unmount / when the
   * editor is no longer needed). */
  destroy(): void;
}

export function createGeometryEditor(map: MapLibreMap): GeometryEditor {
  const draw = new TerraDraw({
    adapter: new TerraDrawMapLibreGLAdapter({ map }),
    modes: [
      new TerraDrawSelectMode({
        flags: {
          linestring: {
            feature: {
              draggable: false,
              coordinates: {
                midpoints: true,
                draggable: true,
                deletable: true,
              },
            },
          },
        },
      }),
    ],
  });

  let started = false;
  let editingFeatureId: string | number | null = null;

  function ensureStarted(): void {
    if (!started) {
      draw.start();
      started = true;
    }
  }

  return {
    beginEditingRoad(road, coordinateSystem) {
      ensureStarted();
      draw.clear();
      draw.setMode("select");

      const coordinates: LngLat[] = road.geometry.points.map((point) =>
        toLngLat(coordinateSystem, point),
      );
      const [result] = draw.addFeatures([
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates },
          properties: { mode: "linestring" },
        },
      ]);

      editingFeatureId =
        result?.valid && result.id !== undefined ? result.id : null;
      if (editingFeatureId !== null) {
        draw.selectFeature(editingFeatureId);
      }
    },

    cancel() {
      draw.clear();
      editingFeatureId = null;
    },

    apply(coordinateSystem) {
      if (editingFeatureId === null) return null;
      const feature = draw.getSnapshotFeature(editingFeatureId);
      draw.clear();
      editingFeatureId = null;

      if (!feature || feature.geometry.type !== "LineString") return null;
      return feature.geometry.coordinates.map((coordinate) =>
        fromLngLat(coordinateSystem, coordinate as LngLat),
      );
    },

    destroy() {
      if (started) {
        draw.clear();
        draw.stop();
      }
    },
  };
}
