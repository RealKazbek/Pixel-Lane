"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { useTranslations } from "next-intl";
import { mapStyleUrl } from "@/lib/config";
import {
  buildEditorWorkspace,
  createEditorRoad,
} from "../editor/editorWorkspace";
import type {
  City,
  LaneBoundaryMarking,
  LaneDirection,
  Point,
  RoadEdgeMarking,
  Road,
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
import { EnvironmentControls } from "../map/environment/EnvironmentControls";
import { WeatherOverlay } from "../map/environment/WeatherOverlay";
import {
  resolveTimeOfDay,
  useEnvironment,
} from "../map/environment/useEnvironment";
import { useSimulationClock } from "../map/environment/simulationClock";
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
  buildRoadPropertiesPayload,
  createRoad,
  getEditorWorkspace,
  replaceTopology,
  updateRoadGeometry,
  updateRoadProperties,
} from "../api/cities";

type RoadChanges = {
  name?: string;
  width_m?: number;
  lane_count?: number;
  lane_width_m?: number;
  lane_directions?: LaneDirection[];
  left_edge_marking?: RoadEdgeMarking;
  right_edge_marking?: RoadEdgeMarking;
  lane_boundary_markings?: LaneBoundaryMarking[];
};

function applyRoadChanges(road: Road, changes: RoadChanges): Road {
  const { lane_count, lane_width_m, lane_directions, lane_boundary_markings, ...simple } = changes;
  if (!lane_count || !lane_width_m || !lane_directions) {
    return { ...road, ...simple, ...(lane_boundary_markings ? { lane_boundary_markings } : {}) };
  }
  const laneConfiguration = buildLaneConfiguration(road, lane_count, lane_width_m, lane_directions);
  return laneConfiguration
    ? { ...road, ...simple, ...laneConfiguration, lane_boundary_markings: lane_boundary_markings ?? road.lane_boundary_markings }
    : road;
}

/** City Model is currently an editor document, not a city picker/viewer. */
export function CityViewerApp() {
  const t = useTranslations("cityModel.fullscreen");
  const [city, setCity] = useState(buildEditorWorkspace);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
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
  const [drawStartPoint, setDrawStartPoint] = useState<{
    point: Point;
    snapTarget: EndpointSnapTarget | null;
  } | null>(null);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [environment, dispatchEnvironment] = useEnvironment();
  const [simulationClock, dispatchSimulationClock] = useSimulationClock();
  const timeOfDay = resolveTimeOfDay(
    environment.timeMode,
    simulationClock.time,
  );

  useEffect(() => {
    let cancelled = false;
    getEditorWorkspace()
      .then((loaded) => {
        if (cancelled) return;
        setCity(loaded);
        setHydrated(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Unknown error";
        setLoadError(message);
        console.error("Failed to load EditorWorkspace", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistRoad = useCallback((road: City["roads"][number]) => {
    if (!hydrated) return;
    void updateRoadGeometry(city.id, road.id, road.geometry)
      .then(() => updateRoadProperties(city.id, road.id, buildRoadPropertiesPayload(road)))
      .catch((error) => console.error("Failed to persist EditorWorkspace road", error));
  }, [city.id, hydrated]);
  const persistCityTopology = useCallback((nextCity: City) => {
    if (!hydrated) return;
    void replaceTopology(nextCity.id, nextCity).catch((error) =>
      console.error("Failed to persist EditorWorkspace topology", error),
    );
  }, [hydrated]);
  const selectedRoad =
    selected?.type === "road"
      ? city.roads.find((road) => road.id === selected.id)
      : null;
  const selectedIntersection =
    selected?.type === "intersection"
      ? city.intersections.find((intersection) => intersection.id === selected.id)
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
      setCity((current) => {
        const nextRoad = current.roads.find((road) => road.id === roadId);
        if (!nextRoad) return current;
        const updatedRoad = { ...nextRoad, geometry: { ...nextRoad.geometry, points } };
        persistRoad(updatedRoad);
        return {
        ...current,
        roads: current.roads.map((road) =>
          road.id === roadId ? updatedRoad
            : road,
        ),
        };
      });
    },
    [persistRoad],
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
      setCity((current) => {
        const road = current.roads.find((candidate) => candidate.id === selected.id);
        if (!road) return current;
        const updatedRoad = applyRoadChanges(road, changes);
        persistRoad(updatedRoad);
        return {
        ...current,
        roads: current.roads.map((road) => {
          return road.id === selected.id ? updatedRoad : road;
        }),
        };
      });
    },
    [persistRoad, selected],
  );
  const handleApplyRoadPreset = useCallback(
    (presetId: RoadPresetId) => {
      if (selected?.type !== "road") return;
      const preset = getRoadPreset(presetId);
      setCity((current) => {
        const road = current.roads.find((candidate) => candidate.id === selected.id);
        const updatedRoad = road ? applyRoadPreset(road, preset) : null;
        if (!updatedRoad) return current;
        persistRoad(updatedRoad);
        return {
          ...current,
          roads: current.roads.map((candidate) =>
            candidate.id === selected.id ? updatedRoad : candidate,
          ),
        };
      });
    },
    [persistRoad, selected],
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
        const next = finalizeEndpointDrag(
          current,
          road.id,
          endpoint,
          snapTarget,
          previousNodeId,
        );
        persistCityTopology(next);
        return next;
      });
    },
    [persistCityTopology, selected],
  );
  const handleInsertPoint = useCallback(
    (segmentIndex: number, point: Point) => {
      if (selected?.type !== "road") return;
      setCity((current) => {
        const next = {
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
        };
        const updatedRoad = next.roads.find((road) => road.id === selected.id);
        if (updatedRoad) persistRoad(updatedRoad);
        return next;
      });
      setSelectedVertexIndex(segmentIndex + 1);
    },
    [persistRoad, selected],
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
      const id = crypto.randomUUID();
      const road = createEditorRoad(
        id,
        `Road ${String.fromCharCode(65 + city.roads.length)}`,
        [drawStartPoint.point, point],
      );
      setCity((current) => {
        const next =
          addRoadWithEndpointSnaps(
            current,
            road,
            drawStartPoint.snapTarget,
            snapTarget,
          ) ?? current;
        if (next !== current) {
          const created = next.roads.find((candidate) => candidate.id === id);
          if (created) {
            void createRoad(next.id, created).catch((error) => {
              console.error("Failed to persist new EditorWorkspace road", error);
              setCity(current);
            });
          }
          persistCityTopology(next);
        }
        return next;
      });
      setSelected({ type: "road", id });
      setDrawStartPoint(null);
      dispatch({ type: "set-tool", tool: "select" });
    },
    [city.roads.length, drawStartPoint, persistCityTopology],
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
        <div className="relative flex h-full min-w-0 flex-1">
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
            layerVisibility={DEFAULT_LAYER_VISIBILITY}
            // The empty editor workspace uses a fixed world. Persisted cities
            // must fit to their loaded geometry once, otherwise the initial
            // pre-hydration camera can leave the real network off-screen.
            fitSignal={hydrated ? 1 : 0}
            editorWorld={city.coordinate_system === "LOCAL_CARTESIAN" ? EDITOR_WORLD_BOUNDS : undefined}
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
          <WeatherOverlay
            timeOfDay={timeOfDay}
            weather={environment.weather}
          />
          <div className="pointer-events-none absolute right-3 top-14 z-20">
            <EnvironmentControls
              value={environment}
              timeOfDay={timeOfDay}
              simulationClock={simulationClock}
              onTimeModeChange={(timeMode) =>
                dispatchEnvironment({ type: "set-time-mode", timeMode })
              }
              onWeatherChange={(weather) =>
                dispatchEnvironment({ type: "set-weather", weather })
              }
              onDateChange={(date) =>
                dispatchSimulationClock({ type: "set-date", date })
              }
              onTimeChange={(time) =>
                dispatchSimulationClock({ type: "set-time", time })
              }
            />
          </div>
        </div>
        {loadError && (
          <div role="alert" className="absolute left-3 top-3 rounded-md bg-surface p-3 text-sm text-danger shadow">
            Failed to load the EditorWorkspace. Check the backend and reload.
          </div>
        )}
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
