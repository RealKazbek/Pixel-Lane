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
import { useState } from "react";
import { useTheme } from "next-themes";
import type {
  LngLatBoundsLike,
  Map as MapLibreMap,
  MapLayerMouseEvent,
  MapMouseEvent,
} from "maplibre-gl";
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
import { fromLngLat, toLngLat } from "./adapters/coordinates";
import type { Point } from "../types/city";
import { midpoint } from "./editor/polylineEditing";
import {
  computeCityBounds,
  computeReferenceLatitude,
  computeEditorWorldBounds,
} from "./adapters/cityBounds";
import {
  buildIntersectionFeatureCollection,
  buildRoadFeatureCollection,
  buildRoadLabelFeatureCollection,
  buildTrafficLightFeatureCollection,
} from "./adapters/cityModelToGeoJson";
import {
  buildLaneBoundaryFeatureCollection,
  buildLaneSurfaceFeatureCollection,
  buildLaneUseMarkingFeatureCollection,
  buildTurnArrowFeatureCollection,
} from "./adapters/laneGeometry";
import { buildRoadSurfaceFeatureCollection } from "./adapters/roadSurfaceGeometry";
import {
  buildBusStopFeatureCollection,
  buildCrosswalkFeatureCollection,
} from "./adapters/cityAmenitiesToGeoJson";
import {
  addPixelLaneSourcesAndLayers,
  setLayerGroupVisibility,
  setSelectedFeature,
  updatePixelLaneData,
  updatePixelLaneTheme,
  type PixelLaneGeoJson,
} from "./layers/setupLayers";
import { SOURCE_IDS, LAYER_IDS } from "./layers/layerIds";
import { resolveMapStyle } from "./styles/mapStyle";
import { resolveMapTheme } from "./styles/mapTheme";
import type { City } from "../types/city";
import type { EditorWorldBounds } from "../editor/editorWorld";
import {
  buildEndpointSnapTargets,
  buildRoadSegmentSnapTargets,
  findEndpointSnapCandidate,
  findRoadEndpointNode,
  roadEndpointForVertex,
  type EndpointSnapCandidate,
  type EndpointSnapTarget,
  type ScreenEndpointSnapTarget,
} from "../editor/endpointSnapping";
import { buildEditorGrid } from "./grid";
import type { LayerVisibility, MapMode, MapSelection } from "./types";

export interface EditorAction {
  type: "apply" | "cancel";
  token: number;
}

interface PixelLaneMapProps {
  city: City;
  selected: MapSelection | null;
  selectedVertexIndex?: number | null;
  onVertexSelect?: (index: number) => void;
  onVertexDrag?: (index: number, point: Point) => void;
  onVertexDragEnd?: (
    index: number,
    snapTarget: EndpointSnapTarget | null,
    previousNodeId: string | null,
  ) => void;
  onInsertPoint?: (segmentIndex: number, point: Point) => void;
  onSelect: (selection: MapSelection | null) => void;
  basemapEnabled: boolean;
  mapStyleUrl: string | null;
  overlayVisible: boolean;
  layerVisibility: LayerVisibility;
  /** Bumped by the parent to request a re-fit (e.g. a "Fit to view"
   * button, or switching to a new city). */
  fitSignal: number;
  /** Optional camera focus request independent of `fitSignal`'s
   * whole-city fit -- e.g. the Road Geometry Lab's "jump to fixture"
   * list. Only acts when `token` changes, so re-passing the same bounds
   * doesn't re-trigger the fly. */
  focusBounds?: { bounds: LngLatBoundsLike; token: number } | null;
  mode: MapMode;
  activeTool?: "select" | "draw-road";
  snapLabel?: string;
  onDrawPoint?: (point: Point, snapTarget: EndpointSnapTarget | null) => void;
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
  editorWorld?: EditorWorldBounds;
  onScaleChange?: (scale: { denominator: number; barMeters: number }) => void;
  onRoadGeometryChange?: (
    roadId: string,
    points: { x: number; y: number }[],
  ) => void;
}

export function PixelLaneMap({
  city,
  selected,
  selectedVertexIndex = null,
  onVertexSelect,
  onVertexDrag,
  onVertexDragEnd,
  onInsertPoint,
  onSelect,
  basemapEnabled,
  mapStyleUrl,
  overlayVisible,
  layerVisibility,
  fitSignal,
  focusBounds,
  mode,
  activeTool = "select",
  snapLabel = "Snap",
  onDrawPoint,
  editorAction,
  onEditorStatusChange,
  onRoadSaved,
  onViewportStatusChange,
  editorWorld,
  onScaleChange,
  onRoadGeometryChange,
}: PixelLaneMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Entity detail responses must not recenter the map.
  const bounds = useMemo(
    () =>
      editorWorld
        ? computeEditorWorldBounds(editorWorld, city.coordinate_system)
        : computeCityBounds(city),
    [city, editorWorld],
  );
  const referenceLatitude = useMemo(
    () => computeReferenceLatitude(city),
    [city],
  );
  const editor = useGeometryEditor();
  const appliedStyleKeyRef = useRef<string | null>(null);
  const lastFitSignalRef = useRef<number | null>(null);
  const [gridZoom, setGridZoom] = useState(16);
  const [vertexScreenPoints, setVertexScreenPoints] = useState<
    { index: number; x: number; y: number }[]
  >([]);
  const [insertScreenPoints, setInsertScreenPoints] = useState<
    { segmentIndex: number; point: Point; x: number; y: number }[]
  >([]);
  const [draggingEndpoint, setDraggingEndpoint] = useState<string | null>(null);
  const [snapCandidate, setSnapCandidate] =
    useState<EndpointSnapCandidate | null>(null);

  const projectSnapTargets = useCallback(
    (
      map: MapLibreMap,
      pointer?: { x: number; y: number },
    ): ScreenEndpointSnapTarget[] => {
      const endpointTargets = buildEndpointSnapTargets(city).map((target) => {
        const projected = map.project(
          toLngLat(city.coordinate_system, target.point),
        );
        return {
          ...target,
          screenX: projected.x,
          screenY: projected.y,
        };
      });
      if (!pointer) return endpointTargets;
      const pointerLngLat = map.unproject([pointer.x, pointer.y]);
      const pointerPoint = fromLngLat(city.coordinate_system, [
        pointerLngLat.lng,
        pointerLngLat.lat,
      ]);
      const segmentTargets = buildRoadSegmentSnapTargets(city).flatMap(
        (target) => {
          const road = city.roads.find(
            (candidate) => candidate.id === target.roadId,
          );
          if (!road) return [];
          const start = road.geometry.points[target.segmentIndex];
          const end = road.geometry.points[target.segmentIndex + 1];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const lengthSquared = dx * dx + dy * dy;
          if (lengthSquared <= 0) return [];
          const ratio = Math.max(
            0,
            Math.min(
              1,
              ((pointerPoint.x - start.x) * dx +
                (pointerPoint.y - start.y) * dy) /
                lengthSquared,
            ),
          );
          if (ratio <= 0 || ratio >= 1) return [];
          const point = {
            x: start.x + dx * ratio,
            y: start.y + dy * ratio,
          };
          const projected = map.project(
            toLngLat(city.coordinate_system, point),
          );
          return [
            {
              ...target,
              point,
              screenX: projected.x,
              screenY: projected.y,
            },
          ];
        },
      );
      return [...endpointTargets, ...segmentTargets];
    },
    [city],
  );

  // `next-themes`'s resolved appearance ("system" already resolved to
  // "light"/"dark") -- the one sanctioned exception to "consume the
  // shared CSS tokens" for a non-CSS consumer (see docs/theming.md): a
  // MapLibre paint expression can't read a CSS custom property, so the
  // current theme is threaded through explicitly instead.
  const { resolvedTheme } = useTheme();
  const mapTheme = useMemo(
    () => resolveMapTheme(resolvedTheme === "dark" ? "dark" : "light"),
    [resolvedTheme],
  );

  const { mapRef, isLoaded } = useMapLibreMap(containerRef, {
    style: resolveMapStyle(basemapEnabled, mapStyleUrl, "transparent"),
    navigationControlPosition: "top-right",
    onScaleChange,
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
  const viewport = useViewportCityData(
    mapRef,
    isLoaded,
    city.coordinate_system === "WGS84" ? city.id : null,
    city.updated_at,
  );
  const visibleRoads =
    city.coordinate_system === "WGS84" ? viewport.roads : city.roads;
  const visibleIntersections =
    city.coordinate_system === "WGS84"
      ? viewport.intersections
      : city.intersections;

  const selectedRoad =
    selected?.type === "road"
      ? city.roads.find((candidate) => candidate.id === selected.id)
      : null;

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
    const trafficLights = visibleIntersections
      .filter((i) => i.traffic_light_id !== null)
      .map((i) => ({
        id: i.traffic_light_id as string,
        intersection_id: i.id,
      }));

    return {
      grid: editorWorld
        ? buildEditorGrid(editorWorld, city.coordinate_system, gridZoom)
        : { type: "FeatureCollection", features: [] },
      roads: buildRoadFeatureCollection({
        roads: visibleRoads,
        coordinate_system: city.coordinate_system,
      }),
      intersections: buildIntersectionFeatureCollection({
        intersections: visibleIntersections,
        coordinate_system: city.coordinate_system,
      }),
      trafficLights: buildTrafficLightFeatureCollection({
        traffic_lights: trafficLights,
        intersections: visibleIntersections,
        coordinate_system: city.coordinate_system,
      }),
      labels: buildRoadLabelFeatureCollection({
        roads: visibleRoads,
        coordinate_system: city.coordinate_system,
      }),
      laneSurfaces: buildLaneSurfaceFeatureCollection(
        visibleRoads,
        city.coordinate_system,
        visibleIntersections,
      ),
      laneBoundaries: buildLaneBoundaryFeatureCollection(
        visibleRoads,
        city.coordinate_system,
        visibleIntersections,
      ),
      turnArrows: buildTurnArrowFeatureCollection(
        visibleRoads,
        city.coordinate_system,
        visibleIntersections,
      ),
      laneUseMarkings: buildLaneUseMarkingFeatureCollection(
        visibleRoads,
        city.coordinate_system,
        visibleIntersections,
      ),
      roadSurfaces: buildRoadSurfaceFeatureCollection(
        visibleRoads,
        visibleIntersections,
        city.coordinate_system,
      ),
      // Not yet bbox/viewport-scoped (see docs/city-model.md) -- `city`
      // itself, not `visibleRoads`/`visibleIntersections`, since a WGS84
      // city's own bus_stops/crosswalks are always [] until that follow-up
      // exists, and a LOCAL_CARTESIAN city's full list is already `city`.
      busStops: buildBusStopFeatureCollection(
        city.bus_stops,
        city.coordinate_system,
      ),
      crosswalks: buildCrosswalkFeatureCollection(
        city.crosswalks,
        city.roads,
        city.coordinate_system,
      ),
    };
  }, [
    visibleRoads,
    visibleIntersections,
    city.coordinate_system,
    city.bus_stops,
    city.crosswalks,
    city.roads,
    editorWorld,
    gridZoom,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !editorWorld) return;
    const updateGridZoom = () => {
      const zoom = map.getZoom();
      setGridZoom(zoom);
    };
    updateGridZoom();
    map.on("zoomend", updateGridZoom);
    return () => {
      map.off("zoomend", updateGridZoom);
    };
  }, [editorWorld, isLoaded, mapRef]);
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
        ? (city.intersections.find((i) => i.id === intersectionId)
            ?.traffic_light_id ?? null)
        : null;
      setSelectedFeature(map, SOURCE_IDS.roads, null, roadId);
      setSelectedFeature(map, SOURCE_IDS.roadSurfaces, null, roadId);
      setSelectedFeature(map, SOURCE_IDS.intersections, null, intersectionId);
      setSelectedFeature(map, SOURCE_IDS.trafficLights, null, lightId);
    },
    [city.intersections, selected],
  );

  // Safe to call after the initial style load and after every later style
  // swap: source/layer creation is idempotent, while data, visibility, and
  // feature-state are all refreshed from the City Model and React state.
  const ensurePixelLaneLayers = useCallback(
    (map: MapLibreMap) => {
      addPixelLaneSourcesAndLayers(map, geoJson, referenceLatitude, mapTheme);
      setLayerGroupVisibility(map, overlayVisible, layerVisibility);
      applyCurrentSelection(map);
    },
    [
      applyCurrentSelection,
      geoJson,
      overlayVisible,
      layerVisibility,
      referenceLatitude,
      mapTheme,
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
    map.setStyle(resolveMapStyle(basemapEnabled, mapStyleUrl, "transparent"));
    appliedStyleKeyRef.current = styleKey;
  }, [
    basemapEnabled,
    ensurePixelLaneLayers,
    isLoaded,
    mapRef,
    mapStyleUrl,
    styleKey,
    mapTheme,
  ]);

  // Theme change (Light/Dark/System resolving differently): re-paint
  // every Pixel Lane layer + icon badge in place, without touching
  // sources/data or requiring a style reload -- the map must update
  // immediately (see AGENTS.md 21's Definition of Done for a
  // user-facing surface). Only needed for a genuine theme change after
  // the initial layer setup above already applied the theme once.
  const previousThemeRef = useRef(mapTheme);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    if (previousThemeRef.current === mapTheme) return;
    previousThemeRef.current = mapTheme;
    updatePixelLaneTheme(map, referenceLatitude, mapTheme);
    setLayerGroupVisibility(map, overlayVisible, layerVisibility);
    applyCurrentSelection(map);
    if (map.getLayer("pixel-lane-empty-background")) {
      map.setPaintProperty(
        "pixel-lane-empty-background",
        "background-color",
        "transparent",
      );
    }
  }, [
    mapTheme,
    isLoaded,
    mapRef,
    referenceLatitude,
    overlayVisible,
    layerVisibility,
    applyCurrentSelection,
  ]);

  // Fit-to-view only on initial load or an explicit fit request. City Model
  // edits change `bounds`, but must never move the user's working viewport.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !bounds) return;
    if (lastFitSignalRef.current === fitSignal) return;
    lastFitSignalRef.current = fitSignal;
    map.fitBounds(bounds, { padding: editorWorld ? 16 : 48, duration: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fitSignal is a manual trigger
  }, [isLoaded, bounds, editorWorld, fitSignal]);

  // Independent "jump to a specific area" camera request -- e.g. the
  // Road Geometry Lab's fixture list. Only reacts to `token` changing,
  // not to `bounds` being re-passed with the same value.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !focusBounds) return;
    map.fitBounds(focusBounds.bounds, {
      padding: 80,
      maxZoom: 19,
      duration: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- token is the manual trigger
  }, [isLoaded, focusBounds?.token]);

  // Selection via click -- roads, intersections, and traffic lights are
  // separate layers; clicking a traffic light selects its parent
  // intersection (there's no dedicated traffic-light details view yet).
  // Clicking empty map clears the selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    const resolveDrawPoint = (event: MapMouseEvent) => {
      const candidate = findEndpointSnapCandidate(
        event.point,
        projectSnapTargets(map, event.point),
        null,
      );
      const point = candidate
        ? candidate.point
        : fromLngLat(city.coordinate_system, [
            event.lngLat.lng,
            event.lngLat.lat,
          ]);
      onDrawPoint?.(point, candidate);
      setSnapCandidate(null);
    };
    const handleIntersectionClick = (event: MapLayerMouseEvent) => {
      if (activeTool === "draw-road") {
        resolveDrawPoint(event);
        return;
      }
      const feature = event.features?.[0];
      if (feature?.properties?.intersection_id) {
        onSelect({
          type: "intersection",
          id: String(feature.properties.intersection_id),
        });
        return;
      }
      if (feature?.properties?.id) {
        onSelect({ type: "intersection", id: String(feature.properties.id) });
      }
    };
    const handleRoadClick = (event: MapLayerMouseEvent) => {
      if (activeTool === "draw-road") {
        resolveDrawPoint(event);
        return;
      }
      const junctionFeature = map
        .queryRenderedFeatures(event.point, {
          layers: [LAYER_IDS.roadSurfaceFill].filter((id) => map.getLayer(id)),
        })
        .find((candidate) => candidate.properties?.intersection_id);
      if (junctionFeature?.properties?.intersection_id) {
        onSelect({
          type: "intersection",
          id: String(junctionFeature.properties.intersection_id),
        });
        return;
      }
      const feature = event.features?.[0];
      if (feature?.properties?.id) {
        onSelect({ type: "road", id: String(feature.properties.id) });
      }
    };
    const handleTrafficLightClick = (event: MapLayerMouseEvent) => {
      if (activeTool === "draw-road") {
        resolveDrawPoint(event);
        return;
      }
      const intersectionId = event.features?.[0]?.properties?.intersection_id;
      if (intersectionId) {
        onSelect({ type: "intersection", id: String(intersectionId) });
      }
    };
    const handleBackgroundClick = (event: MapLayerMouseEvent) => {
      if (activeTool === "draw-road") {
        const layers = [
          LAYER_IDS.roadSurface,
          LAYER_IDS.roadSurfaceFill,
          LAYER_IDS.roadInteraction,
          LAYER_IDS.intersections,
          LAYER_IDS.intersectionDetails,
          LAYER_IDS.trafficLights,
        ].filter((id) => map.getLayer(id));
        if (!map.queryRenderedFeatures(event.point, { layers }).length)
          resolveDrawPoint(event);
        return;
      }
      const layers = [
        LAYER_IDS.roadSurface,
        LAYER_IDS.roadSurfaceFill,
        LAYER_IDS.roadInteraction,
        LAYER_IDS.intersections,
        LAYER_IDS.intersectionDetails,
        LAYER_IDS.trafficLights,
      ].filter((id) => map.getLayer(id));
      if (!map.queryRenderedFeatures(event.point, { layers }).length)
        onSelect(null);
    };
    const handleDrawMove = (event: MapMouseEvent) => {
      if (activeTool !== "draw-road") return;
      setSnapCandidate(
        findEndpointSnapCandidate(
          event.point,
          projectSnapTargets(map, event.point),
          null,
        ),
      );
    };
    const clearDrawSnap = () => {
      if (activeTool === "draw-road") setSnapCandidate(null);
    };
    let hoveredRoadId: string | null = null;
    const handleRoadHover = (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.id;
      if (!id) return;
      const nextId = String(id);
      if (hoveredRoadId && hoveredRoadId !== nextId) {
        map.setFeatureState(
          { source: SOURCE_IDS.roads, id: hoveredRoadId },
          { hovered: false },
        );
      }
      hoveredRoadId = nextId;
      map.setFeatureState(
        { source: SOURCE_IDS.roads, id: nextId },
        { hovered: true },
      );
      map.getCanvasContainer().style.cursor = "pointer";
    };
    const clearRoadHover = () => {
      if (hoveredRoadId) {
        map.setFeatureState(
          { source: SOURCE_IDS.roads, id: hoveredRoadId },
          { hovered: false },
        );
        hoveredRoadId = null;
      }
      if (mode !== "edit-geometry" && activeTool !== "draw-road")
        map.getCanvasContainer().style.cursor = "";
    };

    map.on("click", LAYER_IDS.intersections, handleIntersectionClick);
    map.on("click", LAYER_IDS.intersectionDetails, handleIntersectionClick);
    map.on("click", LAYER_IDS.roadSurface, handleRoadClick);
    // The close-zoom polygon fill (see roadSurfaceLayers.ts) has its own
    // layer id -- a merged junction polygon has no `properties.id`, so
    // clicking it is a no-op here rather than misattributing the click to
    // one arbitrary constituent road (see roadSurfaceGeometry.ts).
    map.on("click", LAYER_IDS.roadSurfaceFill, handleRoadClick);
    map.on("click", LAYER_IDS.roadInteraction, handleRoadClick);
    map.on("mousemove", LAYER_IDS.roadSurface, handleRoadHover);
    map.on("mousemove", LAYER_IDS.roadSurfaceFill, handleRoadHover);
    map.on("mousemove", LAYER_IDS.roadInteraction, handleRoadHover);
    map.on("mouseout", LAYER_IDS.roadSurface, clearRoadHover);
    map.on("mouseout", LAYER_IDS.roadSurfaceFill, clearRoadHover);
    map.on("mouseout", LAYER_IDS.roadInteraction, clearRoadHover);
    map.on("click", LAYER_IDS.trafficLights, handleTrafficLightClick);
    map.on("click", handleBackgroundClick);
    map.on("mousemove", handleDrawMove);
    map.on("mouseout", clearDrawSnap);

    return () => {
      map.off("click", LAYER_IDS.intersections, handleIntersectionClick);
      map.off("click", LAYER_IDS.intersectionDetails, handleIntersectionClick);
      map.off("click", LAYER_IDS.roadSurface, handleRoadClick);
      map.off("click", LAYER_IDS.roadSurfaceFill, handleRoadClick);
      map.off("click", LAYER_IDS.roadInteraction, handleRoadClick);
      map.off("mousemove", LAYER_IDS.roadSurface, handleRoadHover);
      map.off("mousemove", LAYER_IDS.roadSurfaceFill, handleRoadHover);
      map.off("mousemove", LAYER_IDS.roadInteraction, handleRoadHover);
      map.off("mouseout", LAYER_IDS.roadSurface, clearRoadHover);
      map.off("mouseout", LAYER_IDS.roadSurfaceFill, clearRoadHover);
      map.off("mouseout", LAYER_IDS.roadInteraction, clearRoadHover);
      map.off("click", LAYER_IDS.trafficLights, handleTrafficLightClick);
      map.off("click", handleBackgroundClick);
      map.off("mousemove", handleDrawMove);
      map.off("mouseout", clearDrawSnap);
    };
  }, [
    isLoaded,
    onSelect,
    mapRef,
    activeTool,
    onDrawPoint,
    city.coordinate_system,
    projectSnapTargets,
    mode,
  ]);

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
    setSelectedFeature(
      map,
      SOURCE_IDS.roadSurfaces,
      previousRoadId,
      nextRoadId,
    );

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
    setSelectedFeature(
      map,
      SOURCE_IDS.roadSurfaces,
      previousIntersectionId,
      nextIntersectionId,
    );

    const previousLightId = previousIntersectionId
      ? (city.intersections.find((i) => i.id === previousIntersectionId)
          ?.traffic_light_id ?? null)
      : null;
    const nextLightId = nextIntersectionId
      ? (city.intersections.find((i) => i.id === nextIntersectionId)
          ?.traffic_light_id ?? null)
      : null;
    setSelectedFeature(
      map,
      SOURCE_IDS.trafficLights,
      previousLightId,
      nextLightId,
    );

    previousSelectionRef.current = selected;
  }, [selected, isLoaded, mapRef, city.intersections]);

  // Enter edit mode: load the selected road into the geometry editor.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    if (mode !== "edit-geometry") return;
    if (selected?.type !== "road") return;
    if (editor.editingRoadId === selected.id) return;

    const road = city.roads.find((r) => r.id === selected.id);
    if (road) {
      editor.start(map, road, city.coordinate_system, (points) => {
        if (points.length >= 2) onRoadGeometryChange?.(road.id, points);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editor is a stable ref-backed API
  }, [mode, selected, isLoaded, city, onRoadGeometryChange]);

  // Leaving edit mode without an explicit apply/cancel action (e.g.
  // selecting a different entity) discards the in-progress edit.
  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      (mode === "edit-geometry" && selected?.type === "road") ||
      !editor.editingRoadId
    )
      return;
    editor.cancel(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selected]);

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

  useEffect(() => {
    const map = mapRef.current;
    const road =
      selected?.type === "road"
        ? city.roads.find((candidate) => candidate.id === selected.id)
        : null;
    if (!map || !isLoaded || mode !== "edit-geometry" || !road) {
      setVertexScreenPoints([]);
      setInsertScreenPoints([]);
      return;
    }
    const update = () => {
      setVertexScreenPoints(
        road.geometry.points.map((point, index) => {
          const projected = map.project(
            toLngLat(city.coordinate_system, point),
          );
          return {
            index,
            x: projected.x,
            y: projected.y,
          };
        }),
      );
      const points = road.geometry.points;
      const firstVector = {
        x: points[1].x - points[0].x,
        y: points[1].y - points[0].y,
      };
      const lastVector = {
        x: points[points.length - 1].x - points[points.length - 2].x,
        y: points[points.length - 1].y - points[points.length - 2].y,
      };
      const insertionPositions = [
        {
          segmentIndex: -1,
          point: {
            x: points[0].x - firstVector.x * 0.2,
            y: points[0].y - firstVector.y * 0.2,
          },
        },
        ...points.slice(0, -1).map((point, index) => ({
          segmentIndex: index,
          point: midpoint(point, points[index + 1]),
        })),
        {
          segmentIndex: points.length - 1,
          point: {
            x: points[points.length - 1].x + lastVector.x * 0.2,
            y: points[points.length - 1].y + lastVector.y * 0.2,
          },
        },
      ];
      const insertionPoints = insertionPositions.map(
        ({ segmentIndex, point }) => {
          const projected = map.project(
            toLngLat(city.coordinate_system, point),
          );
          return { segmentIndex, point, x: projected.x, y: projected.y };
        },
      );
      setInsertScreenPoints(insertionPoints);
    };
    update();
    map.on("move", update);
    map.on("resize", update);
    return () => {
      map.off("move", update);
      map.off("resize", update);
    };
  }, [city, isLoaded, mapRef, mode, selected]);

  return (
    <div className="city-model-map relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {snapCandidate && (activeTool === "draw-road" || draggingEndpoint) && (
          <span
            className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/20 shadow-sm ring-4 ring-primary/20"
            style={{
              left: snapCandidate.screenX,
              top: snapCandidate.screenY,
            }}
          >
            <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-primary shadow-sm">
              {snapLabel}
            </span>
          </span>
        )}
        {vertexScreenPoints.map((vertex) => (
          <span
            key={vertex.index}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-primary px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-sm transition-transform ${selectedVertexIndex !== null && selectedVertexIndex !== vertex.index ? "hidden" : `pointer-events-auto ${draggingEndpoint === String(vertex.index) ? "cursor-grabbing scale-125" : "cursor-grab hover:scale-125"}`} ${selectedVertexIndex === vertex.index ? "ring-2 ring-primary/50" : ""}`}
            onClick={() => onVertexSelect?.(vertex.index)}
            onPointerDown={(event) => {
              const index = vertex.index;
              if (selectedVertexIndex !== index || !mapRef.current) return;
              event.preventDefault();
              event.stopPropagation();
              const map = mapRef.current;
              const rect = containerRef.current?.getBoundingClientRect();
              if (!rect) return;
              map.dragPan.disable();
              setDraggingEndpoint(String(index));
              const roadEndpoint = selectedRoad
                ? roadEndpointForVertex(selectedRoad, index)
                : null;
              const previousNodeId =
                selectedRoad && roadEndpoint
                  ? (findRoadEndpointNode(
                      city.intersections,
                      selectedRoad,
                      roadEndpoint,
                    )?.id ?? null)
                  : null;
              let activeSnapTarget: EndpointSnapTarget | null = null;
              const move = (moveEvent: PointerEvent) => {
                const screenPoint = {
                  x: moveEvent.clientX - rect.left,
                  y: moveEvent.clientY - rect.top,
                };
                const candidate = roadEndpoint
                  ? findEndpointSnapCandidate(
                      screenPoint,
                      projectSnapTargets(map, screenPoint),
                      selectedRoad?.id ?? null,
                    )
                  : null;
                activeSnapTarget = candidate;
                setSnapCandidate(candidate);
                if (candidate) {
                  onVertexDrag?.(index, candidate.point);
                } else {
                  const point = map.unproject([screenPoint.x, screenPoint.y]);
                  onVertexDrag?.(
                    index,
                    fromLngLat(city.coordinate_system, [point.lng, point.lat]),
                  );
                }
              };
              const finish = () => {
                map.dragPan.enable();
                setDraggingEndpoint(null);
                setSnapCandidate(null);
                onVertexDragEnd?.(index, activeSnapTarget, previousNodeId);
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", finish);
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", finish);
            }}
            style={{ left: vertex.x, top: vertex.y }}
          >
            {vertex.index === 0
              ? "A"
              : vertex.index === (selectedRoad?.geometry.points.length ?? 1) - 1
                ? "B"
                : ""}
          </span>
        ))}
        {insertScreenPoints.map((insertion) => (
          <button
            key={`insert-${insertion.segmentIndex}`}
            type="button"
            aria-label="Insert road point"
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-surface px-1 text-xs font-bold text-primary shadow-sm hover:scale-125"
            style={{ left: insertion.x, top: insertion.y }}
            onClick={() =>
              onInsertPoint?.(insertion.segmentIndex, insertion.point)
            }
          >
            +
          </button>
        ))}
      </div>
    </div>
  );
}
