import { apiRequest } from "./client";
import type {
  City,
  CitySummary,
  Intersection,
  Polyline,
  Road,
} from "../types/city";
import type { TrafficAnalysisResult } from "../types/traffic-analysis";
import type { BBox } from "../map/adapters/viewport";

export function getCities(): Promise<CitySummary[]> {
  return apiRequest<CitySummary[]>("/api/v1/cities");
}

export function getCity(cityId: string): Promise<City> {
  return apiRequest<City>(`/api/v1/cities/${cityId}`);
}

function bboxQueryParam(bbox: BBox): string {
  return `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
}

/** Roads intersecting `bbox` -- the viewport-driven map's data source
 * (see map/hooks/useViewportCityData.ts). Only ever non-empty for WGS84
 * cities; see the backend's `GET /cities/{id}/roads` docstring. */
export function getRoadsInBbox(
  cityId: string,
  bbox: BBox,
  signal?: AbortSignal,
): Promise<Road[]> {
  return apiRequest<Road[]>(
    `/api/v1/cities/${cityId}/roads?bbox=${bboxQueryParam(bbox)}`,
    { signal },
  );
}

/** Intersections within `bbox` -- see `getRoadsInBbox`. */
export function getIntersectionsInBbox(
  cityId: string,
  bbox: BBox,
  signal?: AbortSignal,
): Promise<Intersection[]> {
  return apiRequest<Intersection[]>(
    `/api/v1/cities/${cityId}/intersections?bbox=${bboxQueryParam(bbox)}`,
    { signal },
  );
}

export function runTrafficAnalysis(
  cityId: string,
): Promise<TrafficAnalysisResult> {
  return apiRequest<TrafficAnalysisResult>(
    `/api/v1/cities/${cityId}/traffic-analysis`,
    {
      method: "POST",
    },
  );
}

/** Persists an edited road polyline -- the "apply edits" step of the map
 * editor. See `map/editor/` for the Terra Draw -> Polyline conversion. */
export function updateRoadGeometry(
  cityId: string,
  roadId: string,
  geometry: Polyline,
): Promise<Road> {
  return apiRequest<Road>(`/api/v1/cities/${cityId}/roads/${roadId}/geometry`, {
    method: "PATCH",
    body: JSON.stringify({ geometry }),
  });
}
