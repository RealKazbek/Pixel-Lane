"use client";

/**
 * Owns MapLibre's imperative lifecycle (create once, destroy on unmount).
 * Deliberately minimal: style/data updates after creation are the
 * caller's job (via the returned map ref), so this hook never re-creates
 * the map instance and never re-renders React on camera movement (see
 * map/README.md's performance notes).
 */

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapScaleBarMeters, mapScaleDenominator } from "../mapScale";

// MapLibre's worker is a separate browser asset. Ship MapLibre's matching
// worker with this app rather than relying on a sibling asset emitted by the
// bundler, which Next does not retain for dependencies.
setWorkerUrl("/maplibre-gl-worker.mjs");

export interface MapLibreMapOptions {
  style: string | StyleSpecification;
  center: [number, number];
  zoom: number;
  showAttribution?: boolean;
  navigationControlPosition?: "top-right" | "top-left";
  onScaleChange?: (scale: { denominator: number; barMeters: number }) => void;
}

export function useMapLibreMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: MapLibreMapOptions,
) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  // Only the first render's options matter -- style changes afterward go
  // through map.setStyle() explicitly, not through re-creating the map.
  const initialOptions = useRef(options);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      style: initialOptions.current.style,
      center: initialOptions.current.center,
      zoom: initialOptions.current.zoom,
      attributionControl: initialOptions.current.showAttribution ? {} : false,
    });
    const updateScale = () => {
      const denominator = mapScaleDenominator(
        map.getZoom(),
        map.getCenter().lat,
      );
      initialOptions.current.onScaleChange?.({
        denominator,
        barMeters: mapScaleBarMeters(denominator),
      });
    };
    map.on("zoom", updateScale);
    map.on("move", updateScale);
    map.addControl(
      new NavigationControl({ showCompass: false }),
      initialOptions.current.navigationControlPosition ?? "top-right",
    );
    map.on("load", () => setIsLoaded(true));
    map.once("load", updateScale);
    mapRef.current = map;
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.off("zoom", updateScale);
      map.off("move", updateScale);
      map.remove();
      mapRef.current = null;
      setIsLoaded(false);
    };
  }, [containerRef]);

  return { mapRef, isLoaded };
}
