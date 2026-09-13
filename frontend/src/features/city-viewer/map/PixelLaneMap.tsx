"use client";

/**
 * Pixel Lane's MapLibre-based 2D map. Orchestrates *when* things happen
 * (city changed -> update data, basemap toggled -> swap style, user
 * clicked -> select, edit mode -> drive the geometry editor); the actual
 * MapLibre/Terra Draw mechanics live in adapters/, layers/, and editor/
 * (see map/README.md). MapLibre's imperative lifecycle (the map instance,
 * Terra Draw) never leaves this component as React state.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import { useMapLibreMap } from "./hooks/useMapLibreMap";
import {
  useViewportCityData,
  type ViewportDataStatus,
} from "./hooks/useViewportCityData";
import {
  useGeometryEditor,
  type EditorStatus,
} from "./editor/useGeometryEditor";
import type { ApplyRoadEditError } from "./editor/applyRoadEdit";
import {
  computeCityBounds,
  computeReferenceLatitude,
} from "./adapters/cityBounds";
import {
  buildIntersectionFeatureCollection,
  buildRoadFeatureCollection,
  buildRoadLabelFeatureCollection,
  buildTrafficLightFeatureCollection,
} from "./adapters/cityModelToGeoJson";
import {
  addPixelLaneSourcesAndLayers,
  setLayerGroupVisibility,
  setSelectedFeature,
  updatePixelLaneData,
  type PixelLaneGeoJson,
} from "./layers/setupLayers";
import { SOURCE_IDS, LAYER_IDS } from "./layers/layerIds";
import { resolveMapStyle } from "./styles/mapStyle";
import type { City } from "../types/city";
import type { LayerVisibility, MapMode, MapSelection } from "./types";

export interface EditorAction {
  type: "apply" | "cancel";
  token: number;
}

interface PixelLaneMapProps {
  city: City;
  selected: MapSelection | null;
  onSelect: (selection: MapSelection | null) => void;
  basemapEnabled: boolean;
  mapStyleUrl: string | null;
  overlayVisible: boolean;
  layerVisibility: LayerVisibility;
  /** Bumped by the parent to request a re-fit (e.g. a "Fit to view"
   * button, or switching to a new city). */
  fitSignal: number;
  mode: MapMode;
  editorAction: EditorAction | null;
  onEditorStatusChange: (
    status: EditorStatus,
    error: ApplyRoadEditError | null,
  ) => void;
  onRoadSaved: () => void;
  /** Surfaces the viewport data-loading status to the parent so it can
   * show a subtle loading/error indicator (see CityViewerApp.tsx) --
   * this component itself never renders any chrome. */
  onViewportStatusChange?: (status: ViewportDataStatus) => void;
}

export function PixelLaneMap({
  city,
  selected,
  onSelect,
  basemapEnabled,
  mapStyleUrl,
  overlayVisible,
  layerVisibility,
  fitSignal,
  mode,
  editorAction,
  onEditorStatusChange,
  onRoadSaved,
  onViewportStatusChange,
}: PixelLaneMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bounds = useMemo(() => computeCityBounds(city), [city]);
  const referenceLatitude = useMemo(
    () => computeReferenceLatitude(city),
    [city],
  );
  const editor = useGeometryEditor();
  const appliedStyleKeyRef = useRef<string | null>(null);

  const { mapRef, isLoaded } = useMapLibreMap(containerRef, {
    style: resolveMapStyle(basemapEnabled, mapStyleUrl),
    // A reasonable initial guess only -- the fit-to-view effect below runs
    // right after load and corrects this to the city's actual bounds. Still
    // worth getting right: it's what's briefly visible before that fit runs.
    center: bounds
      ? [
          ((bounds as number[][])[0][0] + (bounds as number[][])[1][0]) / 2,
          ((bounds as number[][])[0][1] + (bounds as number[][])[1][1]) / 2,
        ]
      : [0, 0],
    zoom: 13,
  });

  // Rendered map data is viewport-scoped (see map/README.md), not the
  // whole `city` -- `city` itself stays the full City Model, still used
  // for selection/details/editor lookups below, which must keep working
  // for a currently-selected feature even if it scrolls out of the
  // freshly-fetched viewport (see the selection effects further down).
  const viewport = useViewportCityData(mapRef, isLoaded, city.id);

  useEffect(() => {
    onViewportStatusChange?.(viewport.status);
  }, [viewport.status, onViewportStatusChange]);

  const geoJson = useMemo<PixelLaneGeoJson>(() => {
    // Traffic lights aren't separately bbox-queried (see
    // docs/city-model.md): a light is a 1:1 attachment to an
    // intersection with no geometry of its own, so its position is
    // exactly its parent intersection's -- derived here from whichever
    // viewport intersections carry a `traffic_light_id`, rather than a
    // fourth endpoint.
    const trafficLights = viewport.intersections
      .filter((i) => i.traffic_light_id !== null)
      .map((i) => ({
        id: i.traffic_light_id as string,
        intersection_id: i.id,
      }));

    return {
      roads: buildRoadFeatureCollection({
        roads: viewport.roads,
        coordinate_system: city.coordinate_system,
      }),
      intersections: buildIntersectionFeatureCollection({
        intersections: viewport.intersections,
        coordinate_system: city.coordinate_system,
      }),
      trafficLights: buildTrafficLightFeatureCollection({
        traffic_lights: trafficLights,
        intersections: viewport.intersections,
        coordinate_system: city.coordinate_system,
      }),
      labels: buildRoadLabelFeatureCollection({
        roads: viewport.roads,
        coordinate_system: city.coordinate_system,
      }),
    };
  }, [viewport.roads, viewport.intersections, city.coordinate_system]);
  const styleKey =
    basemapEnabled && mapStyleUrl ? mapStyleUrl : "pixel-lane-empty";

  // Re-applies the current selection as feature-state -- needed any time
  // sources are (re)created, since a fresh GeoJSONSource starts with no
  // feature-state regardless of what was selected before.
  const applyCurrentSelection = useCallback(
    (map: MapLibreMap) => {
      const roadId = selected?.type === "road" ? selected.id : null;
      const intersectionId =
        selected?.type === "intersection" ? selected.id : null;
      const lightId = intersectionId
        ? (city.traffic_lights.find((l) => l.intersection_id === intersectionId)
            ?.id ?? null)
        : null;
      setSelectedFeature(map, SOURCE_IDS.roads, null, roadId);
      setSelectedFeature(map, SOURCE_IDS.intersections, null, intersectionId);
      setSelectedFeature(map, SOURCE_IDS.trafficLights, null, lightId);
    },
    [city.traffic_lights, selected],
  );

  // Safe to call after the initial style load and after every later style
  // swap: source/layer creation is idempotent, while data, visibility, and
  // feature-state are all refreshed from the City Model and React state.
  const ensurePixelLaneLayers = useCallback(
    (map: MapLibreMap) => {
      addPixelLaneSourcesAndLayers(map, geoJson, referenceLatitude);
      setLayerGroupVisibility(map, overlayVisible, layerVisibility);
      applyCurrentSelection(map);
    },
    [
      applyCurrentSelection,
      geoJson,
      overlayVisible,
      layerVisibility,
      referenceLatitude,
    ],
  );

  // Initial layer setup once the map has loaded its (possibly empty) style.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    ensurePixelLaneLayers(map);
    // The constructor already received this style. Recording it avoids an
    // immediate redundant setStyle(), which would otherwise clear the
    // freshly-created overlay during initial rendering.
    appliedStyleKeyRef.current = styleKey;
  }, [ensurePixelLaneLayers, isLoaded, mapRef, styleKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    setLayerGroupVisibility(map, overlayVisible, layerVisibility);
  }, [overlayVisible, layerVisibility, isLoaded, mapRef]);

  // Keep rendered data current without re-adding sources/layers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    updatePixelLaneData(map, geoJson);
  }, [geoJson, isLoaded, mapRef]);

  // Basemap toggle: swap style in place (never recreate the map
  // instance), then re-add Pixel Lane's own sources/layers once the new
  // style finishes loading -- a style swap clears everything.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    if (appliedStyleKeyRef.current === styleKey) return;

    // Register before setStyle: an in-memory empty style can finish loading
    // quickly, and the overlay must be restored after—not before—the new
    // style is ready.
    map.once("style.load", () => ensurePixelLaneLayers(map));
    map.setStyle(resolveMapStyle(basemapEnabled, mapStyleUrl));
    appliedStyleKeyRef.current = styleKey;
  }, [
    basemapEnabled,
    ensurePixelLaneLayers,
    isLoaded,
    mapRef,
    mapStyleUrl,
    styleKey,
  ]);

  // Fit-to-view: on demand (button) and whenever the city itself changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !bounds) return;
    map.fitBounds(bounds, { padding: 48, duration: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fitSignal is a manual trigger
  }, [isLoaded, bounds, fitSignal]);

  // Selection via click -- roads, intersections, and traffic lights are
  // separate layers; clicking a traffic light selects its parent
  // intersection (there's no dedicated traffic-light details view yet).
  // Clicking empty map clears the selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    const handleIntersectionClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (feature?.properties?.id) {
        onSelect({ type: "intersection", id: String(feature.properties.id) });
      }
    };
    const handleRoadClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (feature?.properties?.id) {
        onSelect({ type: "road", id: String(feature.properties.id) });
      }
    };
    const handleTrafficLightClick = (event: MapLayerMouseEvent) => {
      const intersectionId = event.features?.[0]?.properties?.intersection_id;
      if (intersectionId) {
        onSelect({ type: "intersection", id: String(intersectionId) });
      }
    };
    const handleBackgroundClick = () => onSelect(null);

    map.on("click", LAYER_IDS.intersections, handleIntersectionClick);
    map.on("click", LAYER_IDS.intersectionDetails, handleIntersectionClick);
    map.on("click", LAYER_IDS.roadSurface, handleRoadClick);
    map.on("click", LAYER_IDS.trafficLights, handleTrafficLightClick);
    map.on("click", handleBackgroundClick);

    return () => {
      map.off("click", LAYER_IDS.intersections, handleIntersectionClick);
      map.off("click", LAYER_IDS.intersectionDetails, handleIntersectionClick);
      map.off("click", LAYER_IDS.roadSurface, handleRoadClick);
      map.off("click", LAYER_IDS.trafficLights, handleTrafficLightClick);
      map.off("click", handleBackgroundClick);
    };
  }, [isLoaded, onSelect, mapRef]);

  // Reflect `selected` as MapLibre feature-state rather than rebuilding
  // any GeoJSON source -- selection changes are cheap regardless of city
  // size. Also highlights the traffic light belonging to a selected
  // intersection, if it has one.
  const previousSelectionRef = useRef<MapSelection | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    const previous = previousSelectionRef.current;

    const previousRoadId = previous?.type === "road" ? previous.id : null;
    const nextRoadId = selected?.type === "road" ? selected.id : null;
    setSelectedFeature(map, SOURCE_IDS.roads, previousRoadId, nextRoadId);

    const previousIntersectionId =
      previous?.type === "intersection" ? previous.id : null;
    const nextIntersectionId =
      selected?.type === "intersection" ? selected.id : null;
    setSelectedFeature(
      map,
      SOURCE_IDS.intersections,
      previousIntersectionId,
      nextIntersectionId,
    );

    const previousLightId = previousIntersectionId
      ? (city.traffic_lights.find(
          (light) => light.intersection_id === previousIntersectionId,
        )?.id ?? null)
      : null;
    const nextLightId = nextIntersectionId
      ? (city.traffic_lights.find(
          (light) => light.intersection_id === nextIntersectionId,
        )?.id ?? null)
      : null;
    setSelectedFeature(
      map,
      SOURCE_IDS.trafficLights,
      previousLightId,
      nextLightId,
    );

    previousSelectionRef.current = selected;
  }, [selected, isLoaded, mapRef, city.traffic_lights]);

  // Enter edit mode: load the selected road into the geometry editor.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    if (mode !== "edit-geometry") return;
    if (selected?.type !== "road") return;
    if (editor.editingRoadId === selected.id) return;

    const road = city.roads.find((r) => r.id === selected.id);
    if (road) editor.start(map, road, city.coordinate_system);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editor is a stable ref-backed API
  }, [mode, selected, isLoaded, city]);

  // Leaving edit mode without an explicit apply/cancel action (e.g.
  // selecting a different entity) discards the in-progress edit.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode === "edit-geometry" || !editor.editingRoadId) return;
    editor.cancel(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // The toolbar's Apply/Cancel buttons drive the editor via this token.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !editorAction) return;

    if (editorAction.type === "cancel") {
      editor.cancel(map);
      return;
    }

    editor.apply(map, city.id, city.coordinate_system).then((road) => {
      if (road) onRoadSaved();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires only when editorAction changes
  }, [editorAction]);

  useEffect(() => {
    onEditorStatusChange(editor.status, editor.error);
  }, [editor.status, editor.error, onEditorStatusChange]);

  // A per-tool cursor is a cheap, immediate "which tool is active" signal
  // that doesn't require looking back at the toolbar. MapLibre sets its
  // own cursor directly on the canvas container, so the mode must be
  // applied there rather than via a class on our own wrapper div.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    map.getCanvasContainer().style.cursor =
      mode === "edit-geometry" ? "crosshair" : "";
  }, [mode, isLoaded, mapRef]);

  return <div ref={containerRef} className="h-full w-full" />;
}
