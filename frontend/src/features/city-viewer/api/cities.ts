import { apiRequest } from "./client";
import type { City, CitySummary, Polyline, Road } from "../types/city";
import type { TrafficAnalysisResult } from "../types/traffic-analysis";

export function getCities(): Promise<CitySummary[]> {
  return apiRequest<CitySummary[]>("/api/v1/cities");
}

export function getCity(cityId: string): Promise<City> {
  return apiRequest<City>(`/api/v1/cities/${cityId}`);
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
