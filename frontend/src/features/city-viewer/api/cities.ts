import { apiRequest } from "./client";
import type { City, CitySummary } from "../types/city";
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
