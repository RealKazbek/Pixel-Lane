"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { mapStyleUrl } from "@/lib/config";
import {
  buildEmptyEditorCity,
  createEditorEntityId,
  createEditorRoad,
} from "../editor/editorWorkspace";
import type {
  LaneBoundaryMarking,
  LaneDirection,
  Point,
  RoadEdgeMarking,
} from "../types/city";
import {
  insertPolylinePoint,
  updatePolylineVertex,
} from "../map/editor/polylineEditing";
import { EDITOR_WORLD_BOUNDS } from "../editor/editorWorld";
import { PixelLaneMap } from "../map/PixelLaneMap";
import { DEFAULT_LAYER_VISIBILITY, type MapSelection } from "../map/types";
import { EditorToolbar } from "../map/EditorToolbar";
import { RoadPropertiesPanel } from "../map/RoadPropertiesPanel";
import { IntersectionPropertiesPanel } from "../map/IntersectionPropertiesPanel";
import { buildLaneConfiguration } from "../editor/laneConfiguration";
import {
  applyRoadPreset,
  getRoadPreset,
  type RoadPresetId,
} from "../editor/roadPresets";
import {
  addRoadWithEndpointSnaps,
  finalizeEndpointDrag,
  findRoadEndpointNode,
  moveConnectedRoadNode,
  roadEndpointForVertex,
  type EndpointSnapTarget,
} from "../editor/endpointSnapping";
import {
  INITIAL_EDITOR_SESSION,
  reduceEditorSession,
} from "../map/editor/editorState";
import {
  getDemoCity,
  createIntersection,
  updateIntersection,
  updateRoadGeometry,
  updateRoadProperties,
  createRoad,
  buildRoadPropertiesPayload,
} from "../api/cities";

/** City Model is currently an editor document, not a city picker/viewer. */
export function CityViewerApp() {
  const t = useTranslations("cityModel.fullscreen");
  const [city, setCity] = useState(buildEmptyEditorCity);
  const [cityLoadError, setCityLoadError] = useState(false);
  const hydratedRef = useRef(false);
  const pendingRoadCreatesRef = useRef(new Set<string>());
  const persistedIntersectionIdsRef = useRef(new Set<string>());
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selected, setSelected] = useState<MapSelection | null>(null);
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(
    null,
  );
  const [session, dispatch] = useReducer(
    reduceEditorSession,
    INITIAL_EDITOR_SESSION,
  );
  const [scale, setScale] = useState({ denominator: 2000, barMeters: 100 });
  const [laneConnectivityVisible, setLaneConnectivityVisible] = useState(false);
  const [drawStartPoint, setDrawStartPoint] = useState<{
    point: Point;
    snapTarget: EndpointSnapTarget | null;
  } | null>(null);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    getDemoCity()
      .then((loaded) => {
        if (cancelled) return;
        setCity(loaded);
        persistedIntersectionIdsRef.current = new Set(
          loaded.intersections.map((intersection) => intersection.id),
        );
        hydratedRef.current = true;
      })
      .catch(() => {
        if (!cancelled) setCityLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (pendingRoadCreatesRef.current.size > 0) return;
    const timer = window.setTimeout(async () => {
      const persistedRoads = city.roads.filter((road) =>
        !pendingRoadCreatesRef.current.has(road.id) &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          road.id,
        ),
      );
      if (persistedRoads.length === 0) return;
      setSaveState("saving");
      try {
        await Promise.all(
          persistedRoads.map((road) =>
            Promise.all([
              updateRoadGeometry(city.id, road.id, road.geometry),
              updateRoadProperties(city.id, road.id, buildRoadPropertiesPayload(road)),
            ]),
          ),
        );
        await Promise.all(
          city.intersections
            .filter((intersection) =>
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                intersection.id,
              ),
            )
            .map((intersection) => {
              const payload = {
                position: intersection.position,
                connected_road_ids: intersection.connected_road_ids,
                connected_lane_ids: intersection.connected_lane_ids,
                control_type: intersection.control_type,
              };
              return persistedIntersectionIdsRef.current.has(intersection.id)
                ? updateIntersection(city.id, intersection.id, payload)
                : createIntersection(city.id, intersection).then((saved) => {
                    persistedIntersectionIdsRef.current.add(saved.id);
                    return saved;
                  });
            }),
        );
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [city]);
  const selectedRoad =
    selected?.type === "road"
      ? city.roads.find((road) => road.id === selected.id)
      : null;
  const selectedIntersection =
    selected?.type === "intersection"
      ? city.intersections.find(
          (intersection) => intersection.id === selected.id,
        )
      : null;
  const selectedRoadNodeIds = selectedRoad
    ? {
        start:
          findRoadEndpointNode(city.intersections, selectedRoad, "start")?.id ??
          null,
        end:
          findRoadEndpointNode(city.intersections, selectedRoad, "end")?.id ??
          null,
      }
    : null;
  const handleRoadGeometryChange = useCallback(
    (roadId: string, points: { x: number; y: number }[]) => {
      setCity((current) => ({
        ...current,
        roads: current.roads.map((road) =>
          road.id === roadId
            ? { ...road, geometry: { ...road.geometry, points } }
            : road,
        ),
      }));
    },
    [],
  );
  const handleRoadPropertiesChange = useCallback(
    (changes: {
      name?: string;
      width_m?: number;
      lane_count?: number;
      lane_width_m?: number;
      lane_directions?: LaneDirection[];
      left_edge_marking?: RoadEdgeMarking;
      right_edge_marking?: RoadEdgeMarking;
      lane_boundary_markings?: LaneBoundaryMarking[];
    }) => {
      if (selected?.type !== "road") return;
      setCity((current) => ({
        ...current,
        roads: current.roads.map((road) => {
          if (road.id !== selected.id) return road;
          const {
            lane_count,
            lane_width_m,
            lane_directions,
            lane_boundary_markings,
            ...simple
          } = changes;
          if (!lane_count || !lane_width_m || !lane_directions) {
            return {
              ...road,
              ...simple,
              ...(lane_boundary_markings ? { lane_boundary_markings } : {}),
            };
          }
          const laneConfiguration = buildLaneConfiguration(
            road,
            lane_count,
            lane_width_m,
            lane_directions,
          );
          if (!laneConfiguration) return road;
          return {
            ...road,
            ...simple,
            ...laneConfiguration,
            lane_boundary_markings:
              lane_boundary_markings ?? road.lane_boundary_markings,
          };
        }),
      }));
    },
    [selected],
  );
  const handleApplyRoadPreset = useCallback(
    (presetId: RoadPresetId) => {
      if (selected?.type !== "road") return;
      const preset = getRoadPreset(presetId);
      setCity((current) => ({
        ...current,
        roads: current.roads.map((road) => {
          if (road.id !== selected.id) return road;
          return applyRoadPreset(road, preset) ?? road;
        }),
      }));
    },
    [selected],
  );
  const handleIntersectionRadiusChange = useCallback(
    (radius: number) => {
      if (selected?.type !== "intersection") return;
      setCity((current) => ({
        ...current,
        intersections: current.intersections.map((intersection) =>
          intersection.id === selected.id
            ? { ...intersection, junction_corner_radius_m: radius }
            : intersection,
        ),
      }));
    },
    [selected],
  );
  const handleSelect = useCallback((selection: MapSelection | null) => {
    setSelected(selection);
    setSelectedVertexIndex(null);
  }, []);
  const handleEndpointDrag = useCallback(
    (vertexIndex: number, point: Point) => {
      if (selected?.type !== "road") return;
      setCity((current) => {
        const road = current.roads.find(
          (candidate) => candidate.id === selected.id,
        );
        if (!road || road.geometry.points.length < 2) return current;
        const endpoint = roadEndpointForVertex(road, vertexIndex);
        if (endpoint) {
          return moveConnectedRoadNode(current, road.id, endpoint, point);
        }
        const next = updatePolylineVertex(
          road.geometry.points,
          vertexIndex,
          point,
        );
        return next
          ? {
              ...current,
              roads: current.roads.map((candidate) =>
                candidate.id === road.id
                  ? {
                      ...candidate,
                      geometry: { ...candidate.geometry, points: next },
                    }
                  : candidate,
              ),
            }
          : current;
      });
    },
    [selected],
  );
  const handleEndpointDragEnd = useCallback(
    (
      vertexIndex: number,
      snapTarget: EndpointSnapTarget | null,
      previousNodeId: string | null,
    ) => {
      if (selected?.type !== "road") return;
      setCity((current) => {
        const road = current.roads.find(
          (candidate) => candidate.id === selected.id,
        );
        if (!road) return current;
        const endpoint = roadEndpointForVertex(road, vertexIndex);
        if (!endpoint) return current;
        return finalizeEndpointDrag(
          current,
          road.id,
          endpoint,
          snapTarget,
          previousNodeId,
        );
      });
    },
    [selected],
  );
  const handleInsertPoint = useCallback(
    (segmentIndex: number, point: Point) => {
      if (selected?.type !== "road") return;
      setCity((current) => ({
        ...current,
        roads: current.roads.map((road) => {
          if (road.id !== selected.id) return road;
          const next = insertPolylinePoint(
            road.geometry.points,
            segmentIndex,
            point,
          );
          return next
            ? {
                ...road,
                geometry: { ...road.geometry, points: next },
                corner_smoothing: next.map((_, index) =>
                  index === segmentIndex + 1
                    ? 0
                    : (road.corner_smoothing?.[
                        index > segmentIndex + 1 ? index - 1 : index
                      ] ?? 0),
                ),
              }
            : road;
        }),
      }));
      setSelectedVertexIndex(segmentIndex + 1);
    },
    [selected],
  );
  const handleDrawPoint = useCallback(
    (point: Point, snapTarget: EndpointSnapTarget | null) => {
      if (!drawStartPoint) {
        setDrawStartPoint({ point, snapTarget });
        return;
      }
      const dx = point.x - drawStartPoint.point.x;
      const dy = point.y - drawStartPoint.point.y;
      if (Math.hypot(dx, dy) < 1) return;
      const id = createEditorEntityId(`editor-road-${Date.now()}`);
      const road = createEditorRoad(
        id,
        `Road ${String.fromCharCode(65 + city.roads.length)}`,
        [drawStartPoint.point, point],
      );
      const nextCity = addRoadWithEndpointSnaps(
        city,
        road,
        drawStartPoint.snapTarget,
        snapTarget,
      );
      if (!nextCity) return;
      setCity(nextCity);
      pendingRoadCreatesRef.current.add(road.id);
      void createRoad(city.id, road).then((savedRoad) => {
        pendingRoadCreatesRef.current.delete(road.id);
        setCity((current) => ({
          ...current,
          roads: current.roads.map((candidate) =>
            candidate.id === road.id ? { ...candidate, ...savedRoad } : candidate,
          ),
        }));
        setSaveState("saved");
      }).catch(() => setSaveState("error"));
      setSaveState("saving");
      setSelected({ type: "road", id });
      setDrawStartPoint(null);
      dispatch({ type: "set-tool", tool: "select" });
    },
    [city, drawStartPoint],
  );

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
      if (event.key === "Escape" && drawStartPoint) {
        setDrawStartPoint(null);
        dispatch({ type: "set-tool", tool: "select" });
        return;
      }
      if (event.key === "Escape" && session.mode === "edit") {
        dispatch({ type: "exit-edit" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, session.mode, drawStartPoint]);

  return (
    <main
      className={`relative flex min-h-0 flex-1 overflow-hidden ${
        isFullscreen
          ? "!fixed !inset-0 !z-[1000] h-dvh w-screen bg-background"
          : ""
      }`}
    >
      {cityLoadError && (
        <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {t("loadError")}
        </div>
      )}
      <div
        className="relative flex min-w-0 flex-1 overflow-hidden"
        onPointerMove={(event) => {
          if (session.activeTool !== "draw-road") return;
          const rect = event.currentTarget.getBoundingClientRect();
          setCrosshair({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }}
        onPointerLeave={() => setCrosshair(null)}
      >
        <PixelLaneMap
          city={city}
          selected={selected}
          onSelect={handleSelect}
          selectedVertexIndex={selectedVertexIndex}
          onVertexSelect={setSelectedVertexIndex}
          onVertexDrag={handleEndpointDrag}
          onVertexDragEnd={handleEndpointDragEnd}
          onInsertPoint={handleInsertPoint}
          basemapEnabled={false}
          mapStyleUrl={mapStyleUrl}
          overlayVisible
          layerVisibility={{
            ...DEFAULT_LAYER_VISIBILITY,
            laneConnectivity: laneConnectivityVisible,
          }}
          fitSignal={0}
          editorWorld={EDITOR_WORLD_BOUNDS}
          mode={
            session.mode === "edit" && session.activeTool === "select"
              ? "edit-geometry"
              : "view"
          }
          activeTool={
            session.activeTool === "draw-road" ? "draw-road" : "select"
          }
          snapLabel={t("snap")}
          onDrawPoint={handleDrawPoint}
          editorAction={null}
          onEditorStatusChange={() => undefined}
          onRoadSaved={() => undefined}
          onScaleChange={setScale}
          onRoadGeometryChange={handleRoadGeometryChange}
        />
        {selectedRoad && (
          <RoadPropertiesPanel
            key={selectedRoad.id}
            road={selectedRoad}
            endpointNodeIds={selectedRoadNodeIds ?? { start: null, end: null }}
            onApplyPreset={handleApplyRoadPreset}
            onChange={handleRoadPropertiesChange}
          />
        )}
        {selectedIntersection && (
          <IntersectionPropertiesPanel
            intersection={selectedIntersection}
            roads={city.roads}
            onCornerRadiusChange={handleIntersectionRadiusChange}
          />
        )}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-end">
          <span className="mr-2 self-center text-[11px] text-muted-foreground">
            {saveState === "saving"
              ? t("saving")
              : saveState === "error"
                ? t("saveError")
                : t("saved")}
          </span>
          <button
            type="button"
            onClick={() => setLaneConnectivityVisible((value) => !value)}
            aria-pressed={laneConnectivityVisible}
            title={t("laneConnections")}
            className={`pointer-events-auto mr-2 rounded-md border px-2 py-1 text-xs shadow-sm backdrop-blur ${laneConnectivityVisible ? "border-blue-600 bg-blue-600 text-white" : "border-border-subtle bg-surface/90 text-foreground"}`}
          >
            {t("laneConnections")}
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((value) => !value)}
            aria-label={isFullscreen ? t("exit") : t("enter")}
            title={isFullscreen ? t("exit") : t("enter")}
            className="pointer-events-auto rounded-md border border-border-subtle bg-surface/90 p-2 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              {isFullscreen ? (
                <path d="M7 3H3v4M13 17h4v-4M3 3l5 5M17 17l-5-5" />
              ) : (
                <path d="M3 8V3h5M17 12v5h-5M3 3l5 5M17 17l-5-5" />
              )}
            </svg>
          </button>
        </div>
        <div className="pointer-events-none absolute left-3 top-3">
          <EditorToolbar
            session={session}
            onEnterEdit={() => dispatch({ type: "enter-edit" })}
            onExitEdit={() => dispatch({ type: "exit-edit" })}
            onSetTool={(tool) => dispatch({ type: "set-tool", tool })}
          />
        </div>
        {session.activeTool === "draw-road" && crosshair && (
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            <div
              className="absolute inset-y-0 w-px bg-foreground/25"
              style={{ left: crosshair.x }}
            />
            <div
              className="absolute inset-x-0 h-px bg-foreground/25"
              style={{ top: crosshair.y }}
            />
          </div>
        )}
        {session.activeTool === "draw-road" && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-md border border-border-subtle bg-surface/90 px-3 py-1.5 text-xs text-foreground shadow-sm backdrop-blur">
            {drawStartPoint ? t("drawFinish") : t("drawStart")}
          </div>
        )}
        {session.mode === "edit" &&
          selected?.type === "road" &&
          selectedRoad &&
          selectedVertexIndex !== null &&
          selectedVertexIndex > 0 &&
          selectedVertexIndex < selectedRoad.geometry.points.length - 1 && (
            <label className="pointer-events-auto absolute bottom-3 left-3 rounded-lg border border-border-subtle bg-surface/90 px-3 py-2 text-[11px] text-foreground shadow-md backdrop-blur">
              <span className="mr-2">{t("smoothing")}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={
                  selectedRoad.corner_smoothing?.[selectedVertexIndex] ?? 0
                }
                onChange={(event) => {
                  const smoothing = Number(event.target.value);
                  setCity((current) => ({
                    ...current,
                    roads: current.roads.map((road) => {
                      if (road.id !== selectedRoad.id) return road;
                      const cornerSmoothing = Array.from(
                        { length: road.geometry.points.length },
                        (_, index) => road.corner_smoothing?.[index] ?? 0,
                      );
                      cornerSmoothing[selectedVertexIndex] = smoothing;
                      return { ...road, corner_smoothing: cornerSmoothing };
                    }),
                  }));
                }}
                aria-label={t("smoothing")}
              />
            </label>
          )}
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-border-subtle bg-surface/90 px-3 py-2 text-[11px] font-medium text-foreground shadow-md backdrop-blur">
          <div className="tracking-wide">
            {t("scale", { denominator: scale.denominator })}
          </div>
          <div className="mt-1.5 flex items-end gap-2 text-[10px] font-normal text-muted-foreground">
            <span className="h-2 w-20 border-x-2 border-b-2 border-foreground/70" />
            <span>
              {t(scale.barMeters >= 1000 ? "scaleBarKm" : "scaleBarMeters", {
                value:
                  scale.barMeters >= 1000
                    ? scale.barMeters / 1000
                    : scale.barMeters,
              })}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
