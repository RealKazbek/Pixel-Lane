import { toLngLat } from "./adapters/coordinates";
import type { CoordinateSystem, Point } from "../types/city";
import type { EditorWorldBounds } from "../editor/editorWorld";

export type EditorGridFeatureCollection =
  GeoJSON.FeatureCollection<GeoJSON.LineString>;

export function gridIntervalForZoom(zoom: number): number {
  if (zoom < 13) return 200;
  if (zoom < 15) return 100;
  if (zoom < 17) return 50;
  if (zoom < 19) return 20;
  return 10;
}

/** Generates world-anchored grid lines. MapLibre owns their camera scaling. */
export function buildEditorGrid(
  bounds: EditorWorldBounds,
  coordinateSystem: CoordinateSystem,
  zoom: number,
): EditorGridFeatureCollection {
  const interval = gridIntervalForZoom(zoom);
  const majorInterval = interval * 5;
  const features: EditorGridFeatureCollection["features"] = [];
  const addLine = (a: Point, b: Point, major: boolean) => {
    features.push({
      type: "Feature",
      properties: { major },
      geometry: {
        type: "LineString",
        coordinates: [
          toLngLat(coordinateSystem, a),
          toLngLat(coordinateSystem, b),
        ],
      },
    });
  };
  for (
    let x = Math.ceil(bounds.minX / interval) * interval;
    x <= bounds.maxX;
    x += interval
  ) {
    addLine(
      { x, y: bounds.minY },
      { x, y: bounds.maxY },
      x % majorInterval === 0,
    );
  }
  for (
    let y = Math.ceil(bounds.minY / interval) * interval;
    y <= bounds.maxY;
    y += interval
  ) {
    addLine(
      { x: bounds.minX, y },
      { x: bounds.maxX, y },
      y % majorInterval === 0,
    );
  }
  return { type: "FeatureCollection", features };
}
