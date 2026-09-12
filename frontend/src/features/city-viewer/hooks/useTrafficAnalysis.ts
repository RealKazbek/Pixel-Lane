"use client";

import { useCallback, useState } from "react";
import { runTrafficAnalysis } from "../api/cities";
import type { TrafficAnalysisResult } from "../types/traffic-analysis";
import type { AsyncStatus } from "./useCities";

export function useTrafficAnalysis(cityId: string | null) {
  const [result, setResult] = useState<TrafficAnalysisResult | null>(null);
  const [status, setStatus] = useState<AsyncStatus>("ready");

  const run = useCallback(async () => {
    if (!cityId) return;
    setStatus("loading");
    try {
      const analysis = await runTrafficAnalysis(cityId);
      setResult(analysis);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [cityId]);

  const reset = useCallback(() => {
    setResult(null);
    setStatus("ready");
  }, []);

  return { result, status, run, reset };
}
