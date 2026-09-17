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

// MapLibre's worker is a separate browser asset. Ship MapLibre's matching
// worker with this app rather than relying on a sibling asset emitted by the
// bundler, which Next does not retain for dependencies.
setWorkerUrl("/maplibre-gl-worker.mjs");

export interface MapLibreMapOptions {
  style: string | StyleSpecification;
  center: [number, number];
  zoom: number;
  showAttribution?: boolean;
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
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setIsLoaded(true));
    mapRef.current = map;
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      setIsLoaded(false);
    };
  }, [containerRef]);

  return { mapRef, isLoaded };
}
