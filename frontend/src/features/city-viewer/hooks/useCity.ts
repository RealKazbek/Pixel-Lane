"use client";

import { useEffect, useState } from "react";
import { getCity } from "../api/cities";
import type { City } from "../types/city";
import type { AsyncStatus } from "./useCities";

/** Status/city are derived from comparing `cityId` against the id the
 * last successful/failed fetch was for -- avoids ever setting "loading"
 * synchronously in the effect body (it's already implied whenever
 * `cityId` doesn't match `loadedForId`/`erroredForId` yet). */
export function useCity(cityId: string | null) {
  const [city, setCity] = useState<City | null>(null);
  const [loadedForId, setLoadedForId] = useState<string | null>(null);
  const [erroredForId, setErroredForId] = useState<string | null>(null);

  useEffect(() => {
    if (!cityId) return;
    let cancelled = false;
    getCity(cityId)
      .then((result) => {
        if (cancelled) return;
        setCity(result);
        setLoadedForId(cityId);
      })
      .catch(() => {
        if (cancelled) return;
        setErroredForId(cityId);
      });
    return () => {
      cancelled = true;
    };
  }, [cityId]);

  const status: AsyncStatus = !cityId
    ? "ready"
    : erroredForId === cityId
      ? "error"
      : loadedForId === cityId
        ? "ready"
        : "loading";

  return { city: cityId && loadedForId === cityId ? city : null, status };
}
