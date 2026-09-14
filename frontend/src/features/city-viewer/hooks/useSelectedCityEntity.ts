"use client";

import { useEffect, useState } from "react";
import { getIntersection, getRoad } from "../api/cities";
import type { City, Intersection, Road } from "../types/city";
import type { MapSelection } from "../map/types";

/** Retain just the selected entity; panning never requires a city-wide fetch. */
export function useSelectedCityEntity(
  city: City | null,
  selected: MapSelection | null,
) {
  const [detail, setDetail] = useState<Road | Intersection | null>(null);
  useEffect(() => {
    if (!city || !selected) return;
    const controller = new AbortController();
    const request =
      selected.type === "road"
        ? getRoad(city.id, selected.id, controller.signal)
        : getIntersection(city.id, selected.id, controller.signal);
    request
      .then((result) => {
        if (!controller.signal.aborted) setDetail(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setDetail(null);
      });
    return () => controller.abort();
  }, [city, selected]);
  if (
    !city ||
    !detail ||
    detail.city_id !== city.id ||
    detail.id !== selected?.id
  )
    return city;
  return {
    ...city,
    roads: "geometry" in detail ? [detail] : city.roads,
    intersections: "position" in detail ? [detail] : city.intersections,
  };
}
