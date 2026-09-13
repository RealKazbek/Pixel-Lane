"use client";

/**
 * Loads only the roads/intersections needed for the current MapLibre
 * viewport, instead of the whole city -- see map/README.md's
 * viewport-loading section and docs/city-model.md's spatial schema
 * section for why. Fetches on initial map load and again on `moveend`/
 * `zoomend` (never on every drag frame), debounced, with in-flight
 * requests cancelled via `AbortController` so a fast pan can't have an
 * older response overwrite a newer one.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { getIntersectionsInBbox, getRoadsInBbox } from "../../api/cities";
import type { Intersection, Road } from "../../types/city";
import {
  boundsToBufferedBBox,
  isBBoxContained,
  type BBox,
} from "../adapters/viewport";

const DEBOUNCE_MS = 300;

export type ViewportDataStatus = "idle" | "loading" | "ready" | "error";

export interface ViewportCityData {
  roads: Road[];
  intersections: Intersection[];
  status: ViewportDataStatus;
}

export function useViewportCityData(
  mapRef: React.RefObject<MapLibreMap | null>,
  isLoaded: boolean,
  cityId: string | null,
): ViewportCityData {
  const [roads, setRoads] = useState<Road[]>([]);
  const [intersections, setIntersections] = useState<Intersection[]>([]);
  const [status, setStatus] = useState<ViewportDataStatus>("idle");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchedBBoxRef = useRef<BBox | null>(null);

  const fetchViewport = useCallback(
    (map: MapLibreMap, currentCityId: string) => {
      const bbox = boundsToBufferedBBox(map.getBounds());
      const lastFetched = lastFetchedBBoxRef.current;
      if (lastFetched && isBBoxContained(bbox, lastFetched)) {
        // Already have everything this viewport needs -- e.g. a small
        // pan/zoom-in that stays inside the previous buffer.
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      lastFetchedBBoxRef.current = bbox;
      setStatus("loading");

      Promise.all([
        getRoadsInBbox(currentCityId, bbox, controller.signal),
        getIntersectionsInBbox(currentCityId, bbox, controller.signal),
      ])
        .then(([nextRoads, nextIntersections]) => {
          if (controller.signal.aborted) return;
          setRoads(nextRoads);
          setIntersections(nextIntersections);
          setStatus("ready");
        })
        .catch(() => {
          // A deliberate `abort()` above (superseded by a newer viewport
          // request) is not a real error -- only report a failure for a
          // request that actually ran to completion and failed.
          if (controller.signal.aborted) return;
          setStatus("error");
        });
    },
    [],
  );

  const scheduleFetch = useCallback(
    (map: MapLibreMap, currentCityId: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(
        () => fetchViewport(map, currentCityId),
        DEBOUNCE_MS,
      );
    },
    [fetchViewport],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !cityId) return;

    // Reset when switching cities -- the previous city's data/bbox no
    // longer applies.
    setRoads([]);
    setIntersections([]);
    lastFetchedBBoxRef.current = null;

    // Initial load: fetch immediately (no debounce -- there's no rapid
    // sequence of events to coalesce yet).
    fetchViewport(map, cityId);

    const handleMoveEnd = () => scheduleFetch(map, cityId);
    map.on("moveend", handleMoveEnd);
    map.on("zoomend", handleMoveEnd);

    return () => {
      map.off("moveend", handleMoveEnd);
      map.off("zoomend", handleMoveEnd);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchViewport/scheduleFetch are stable (empty-dep useCallback)
  }, [mapRef, isLoaded, cityId]);

  return { roads, intersections, status };
}
