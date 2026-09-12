"use client";

import { useEffect, useState } from "react";
import { getCities } from "../api/cities";
import type { CitySummary } from "../types/city";

export type AsyncStatus = "loading" | "ready" | "error";

export function useCities() {
  const [cities, setCities] = useState<CitySummary[]>([]);
  const [status, setStatus] = useState<AsyncStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    // No sync setStatus("loading") here: the initial state is already
    // "loading" and this effect only runs once (empty deps).
    getCities()
      .then((result) => {
        if (cancelled) return;
        setCities(result);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { cities, status };
}
