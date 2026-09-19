import { toLngLat } from "./coordinates";
import type { City } from "../../types/city";
import type { LngLatBoundsLike } from "maplibre-gl";
import type { EditorWorldBounds } from "../../editor/editorWorld";

export function computeEditorWorldBounds(
  world: EditorWorldBounds,
  coordinateSystem: City["coordinate_system"],
): LngLatBoundsLike {
  const [minLng, minLat] = toLngLat(coordinateSystem, {
    x: world.minX,
    y: world.minY,
  });
  const [maxLng, maxLat] = toLngLat(coordinateSystem, {
    x: world.maxX,
    y: world.maxY,
  });
  return [
    [Math.min(minLng, maxLng), Math.min(minLat, maxLat)],
    [Math.max(minLng, maxLng), Math.max(minLat, maxLat)],
  ];
}

/** Bounding box covering every road/intersection in the city, in
 * [lng, lat] order -- for `map.fitBounds()` (MapLibre's own "fit to
 * view", not a hand-rolled one; see AGENTS.md's library-first rule). */
export function computeCityBounds(city: City): LngLatBoundsLike | null {
  if (city.bounds) {
    const [west, south, east, north] = city.bounds;
    return [
      [west, south],
      [east, north],
    ];
  }
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const visit = (lng: number, lat: number) => {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  };

  for (const road of city.roads) {
    for (const point of road.geometry.points) {
      const [lng, lat] = toLngLat(city.coordinate_system, point);
      visit(lng, lat);
    }
  }
  for (const intersection of city.intersections) {
    const [lng, lat] = toLngLat(city.coordinate_system, intersection.position);
    visit(lng, lat);
  }

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/** A representative latitude for the map (used by the road-width
 * meters-to-pixels expression, see layers/roadWidth.ts). */
export function computeReferenceLatitude(city: City): number {
  const bounds = computeCityBounds(city);
  if (!bounds) return 0;
  const [[, minLat], [, maxLat]] = bounds as [
    [number, number],
    [number, number],
  ];
  return (minLat + maxLat) / 2;
}
