"use client";

/**
 * Pixel Lane's MapLibre-based 2D map. Orchestrates *when* things happen
 * (city changed -> update data, basemap toggled -> swap style, user
 * clicked -> select, edit mode -> drive the geometry editor); the actual
 * MapLibre/Terra Draw mechanics live in adapters/, layers/, and editor/
 * (see map/README.md). MapLibre's imperative lifecycle (the map instance,
 * Terra Draw) never leaves this component as React state.
 */

import { useEffect, useMemo, useRef } from "react";
import type { Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import { useMapLibreMap } from "./hooks/useMapLibreMap";
import {
  useGeometryEditor,
  type EditorStatus,
} from "./editor/useGeometryEditor";
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
  setPixelLaneLayersVisible,
  setSelectedFeature,
  updatePixelLaneData,
  type PixelLaneGeoJson,
} from "./layers/setupLayers";
import { SOURCE_IDS, LAYER_IDS } from "./layers/layerIds";
import { resolveMapStyle } from "./styles/mapStyle";
import type { City } from "../types/city";
import type { MapMode, MapSelection } from "./types";

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
  /** Bumped by the parent to request a re-fit (e.g. a "Fit to view"
   * button, or switching to a new city). */
  fitSignal: number;
  mode: MapMode;
  editorAction: EditorAction | null;
  onEditorStatusChange: (status: EditorStatus, error: string | null) => void;
  onRoadSaved: () => void;
}

export function PixelLaneMap({
  city,
  selected,
  onSelect,
  basemapEnabled,
  mapStyleUrl,
  overlayVisible,
  fitSignal,
  mode,
  editorAction,
  onEditorStatusChange,
  onRoadSaved,
}: PixelLaneMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bounds = useMemo(() => computeCityBounds(city), [city]);
  const referenceLatitude = useMemo(
    () => computeReferenceLatitude(city),
    [city],
  );
  const editor = useGeometryEditor();

  const { mapRef, isLoaded } = useMapLibreMap(containerRef, {
    style: resolveMapStyle(basemapEnabled, mapStyleUrl),
    center: bounds
      ? [(bounds as number[][])[0][0], (bounds as number[][])[0][1]]
      : [0, 0],
    zoom: 13,
  });

  const geoJson = useMemo<PixelLaneGeoJson>(
    () => ({
      roads: buildRoadFeatureCollection(city),
      intersections: buildIntersectionFeatureCollection(city),
      trafficLights: buildTrafficLightFeatureCollection(city),
      labels: buildRoadLabelFeatureCollection(city),
    }),
    [city],
  );

  // Re-applies the current selection as feature-state -- needed any time
  // sources are (re)created, since a fresh GeoJSONSource starts with no
  // feature-state regardless of what was selected before.
  const applyCurrentSelection = (map: MapLibreMap) => {
    const roadId = selected?.type === "road" ? selected.id : null;
    const intersectionId = selected?.type === "intersection" ? selected.id : null;
    const lightId = intersectionId
      ? (city.traffic_lights.find((l) => l.intersection_id === intersectionId)
          ?.id ?? null)
      : null;
    setSelectedFeature(map, SOURCE_IDS.roads, null, roadId);
    setSelectedFeature(map, SOURCE_IDS.intersections, null, intersectionId);
    setSelectedFeature(map, SOURCE_IDS.trafficLights, null, lightId);
  };

  // Initial layer setup once the map has loaded its (possibly empty) style.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    addPixelLaneSourcesAndLayers(map, geoJson, referenceLatitude);
    setPixelLaneLayersVisible(map, overlayVisible);
    applyCurrentSelection(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run for isLoaded transitions
  }, [isLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    setPixelLaneLayersVisible(map, overlayVisible);
  }, [overlayVisible, isLoaded, mapRef]);

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
    map.setStyle(resolveMapStyle(basemapEnabled, mapStyleUrl));
    map.once("style.load", () => {
      addPixelLaneSourcesAndLayers(map, geoJson, referenceLatitude);
      setPixelLaneLayersVisible(map, overlayVisible);
      applyCurrentSelection(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires only on basemap/style changes
  }, [basemapEnabled, mapStyleUrl]);

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
    map.on("click", LAYER_IDS.roadSurface, handleRoadClick);
    map.on("click", LAYER_IDS.trafficLights, handleTrafficLightClick);
    map.on("click", handleBackgroundClick);

    return () => {
      map.off("click", LAYER_IDS.intersections, handleIntersectionClick);
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

  return <div ref={containerRef} className="h-full w-full" />;
}
