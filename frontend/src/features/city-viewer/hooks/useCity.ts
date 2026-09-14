"use client";

import { useCallback, useEffect, useState } from "react";
import { getCityForMap } from "../api/cities";
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
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!cityId) return;
    let cancelled = false;
    getCityForMap(cityId)
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
  }, [cityId, refreshToken]);

  // Re-fetches the current city -- e.g. after a geometry edit is saved,
  // so the map reflects the persisted result rather than an optimistic
  // guess. Since `loadedForId` already matches, this refreshes silently
  // (no loading flicker).
  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  const status: AsyncStatus = !cityId
    ? "ready"
    : erroredForId === cityId
      ? "error"
      : loadedForId === cityId
        ? "ready"
        : "loading";

  return {
    city: cityId && loadedForId === cityId ? city : null,
    status,
    refresh,
  };
}
