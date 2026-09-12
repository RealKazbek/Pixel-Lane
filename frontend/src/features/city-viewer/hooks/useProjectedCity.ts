"use client";

import { useMemo } from "react";
import { computeBounds, type Bounds } from "../lib/geometry";
import { projectCity, type ProjectedCity } from "../lib/project-city";
import type { City } from "../types/city";

export function useProjectedCity(city: City): {
  projected: ProjectedCity;
  bounds: Bounds;
} {
  const projected = useMemo(() => projectCity(city), [city]);
  const bounds = useMemo(() => computeBounds(projected.allPoints), [projected]);
  return { projected, bounds };
}
