"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { mapStyleUrl } from "@/lib/config";
import {
  buildEditorWorkspace,
  createEditorRoad,
} from "../editor/editorWorkspace";
import type {
  City,
  LaneBoundaryMarking,
  Point,
  RoadEdgeMarking,
  Road,
  MovementType,
  LaneDirection,
} from "../types/city";
import {
  insertPolylinePoint,
  updatePolylineVertex,
} from "../map/editor/polylineEditing";
import { EDITOR_WORLD_BOUNDS } from "../editor/editorWorld";
import { PixelLaneMap } from "../map/PixelLaneMap";
import { MapLayersToggle } from "../map/MapLayersToggle";
import {
  DEFAULT_LAYER_VISIBILITY,
  type MapSelection,
  type LayerVisibility,
} from "../map/types";
import type { LayerGroupId } from "../map/layers/layerIds";
import { EditorToolbar } from "../map/EditorToolbar";
import { RoadPropertiesPanel } from "../map/RoadPropertiesPanel";
import { IntersectionPropertiesPanel } from "../map/IntersectionPropertiesPanel";
import { buildLaneConfiguration } from "../editor/laneConfiguration";
import { removeRoadFromCity } from "../editor/roadDeletion";
import { updateIntersectionManeuver } from "../editor/intersectionManeuverState";
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
  deleteRoad,
  getEditorWorkspace,
  replaceLaneConnections,
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
  const {
    lane_count,
    lane_width_m,
    lane_directions,
    lane_boundary_markings,
    ...simple
  } = changes;
  if (!lane_count || !lane_width_m) {
    return {
      ...road,
      ...simple,
      ...(lane_directions
        ? {
            lanes: road.lanes.map((lane, index) => ({
              ...lane,
              direction: lane_directions[index] ?? lane.direction,
            })),
          }
        : {}),
      ...(lane_boundary_markings ? { lane_boundary_markings } : {}),
    };
  }
  const laneDirections = Array.from(
    { length: lane_count },
    (_, index) =>
      road.lanes[index]?.direction ?? road.lanes.at(-1)?.direction ?? "FORWARD",
  );
  const laneConfiguration = buildLaneConfiguration(
    road,
    lane_count,
    lane_width_m,
    laneDirections,
  );
  return laneConfiguration
    ? {
        ...road,
        ...simple,
        ...laneConfiguration,
        ...(lane_directions
          ? {
              lanes: laneConfiguration.lanes.map((lane, index) => ({
                ...lane,
                direction: lane_directions[index] ?? lane.direction,
              })),
            }
          : {}),
        lane_boundary_markings:
          lane_boundary_markings ?? road.lane_boundary_markings,
      }
    : road;
}
/** City Model is currently an editor document, not a city picker/viewer. */
export function CityViewerApp() {
  const t = useTranslations("cityModel.fullscreen");
  const tMap = useTranslations("cityModel.map");
  const tProperties = useTranslations("cityModel.properties");
  const [city, setCity] = useState(buildEditorWorkspace);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirmationRoad, setDeleteConfirmationRoad] =
    useState<Road | null>(null);
  const [isDeletingRoad, setIsDeletingRoad] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(
    DEFAULT_LAYER_VISIBILITY,
  );
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
  const cityRef = useRef(city);
  const maneuverRequestRef = useRef(0);

  useEffect(() => {
    cityRef.current = city;
  }, [city]);

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
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setLoadError(message);
        console.error("Failed to load EditorWorkspace", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistRoad = useCallback(
    (road: City["roads"][number]) => {
      if (!hydrated) return;
      void updateRoadGeometry(city.id, road.id, road.geometry)
        .then(() =>
          updateRoadProperties(
            city.id,
            road.id,
            buildRoadPropertiesPayload(road),
          ),
        )
        .catch((error) =>
          console.error("Failed to persist EditorWorkspace road", error),
        );
    },
    [city.id, hydrated],
  );
  const persistCityTopology = useCallback(
    (nextCity: City) => {
      if (!hydrated) return;
      void (async () => {
        await replaceTopology(nextCity.id, nextCity);
        await replaceLaneConnections(
          nextCity.id,
          nextCity.lane_connections ?? [],
        );
      })().catch((error) => {
        console.error("Failed to persist EditorWorkspace topology", error);
        setDeleteError(tProperties("topologySaveFailed"));
      });
    },
    [hydrated, tProperties],
  );
  const persistCreatedRoadTopology = useCallback(
    (previousCity: City, nextCity: City) => {
      if (!hydrated) return;
      const previousRoadIds = new Set(
        previousCity.roads.map((road) => road.id),
      );
      const createdRoads = nextCity.roads.filter(
        (road) => !previousRoadIds.has(road.id),
      );
      void (async () => {
        await replaceTopology(nextCity.id, nextCity, createdRoads);
        if (nextCity.lane_connections) {
          await replaceLaneConnections(nextCity.id, nextCity.lane_connections);
        }
      })().catch((error) =>
        console.error("Failed to persist created road topology", error),
      );
    },
    [hydrated],
  );
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
      setCity((current) => {
        const nextRoad = current.roads.find((road) => road.id === roadId);
        if (!nextRoad) return current;
        const updatedRoad = {
          ...nextRoad,
          geometry: { ...nextRoad.geometry, points },
        };
        persistRoad(updatedRoad);
        return {
          ...current,
          roads: current.roads.map((road) =>
            road.id === roadId ? updatedRoad : road,
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
        const road = current.roads.find(
          (candidate) => candidate.id === selected.id,
        );
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
        const road = current.roads.find(
          (candidate) => candidate.id === selected.id,
        );
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
  const handleDeleteRoad = useCallback(() => {
    if (selected?.type !== "road") return;
    const road = city.roads.find((candidate) => candidate.id === selected.id);
    if (!road) return;
    setDeleteError(null);
    setDeleteConfirmationRoad(road);
  }, [city.roads, selected]);

  const confirmDeleteRoad = useCallback(async () => {
    if (!deleteConfirmationRoad) return;
    setIsDeletingRoad(true);
    setDeleteError(null);
    try {
      await deleteRoad(city.id, deleteConfirmationRoad.id);
      setCity((current) =>
        removeRoadFromCity(current, deleteConfirmationRoad.id),
      );
      setSelected(null);
      setSelectedVertexIndex(null);
      setDeleteConfirmationRoad(null);
    } catch (error) {
      console.error("Failed to delete EditorWorkspace road", error);
      setDeleteError(tProperties("deleteFailed"));
    } finally {
      setIsDeletingRoad(false);
    }
  }, [city.id, deleteConfirmationRoad, tProperties]);
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
    setDeleteError(null);
  }, []);

  const handleManeuverChange = useCallback(
    async (
      roadId: string,
      laneId: string,
      movement: MovementType,
      enabled: boolean,
    ) => {
      if (selected?.type !== "intersection") return;
      const intersectionId = selected.id;
      const currentCity = cityRef.current;
      const previousConnections = currentCity.lane_connections ?? [];
      const nextCity = updateIntersectionManeuver(
        currentCity,
        intersectionId,
        roadId,
        laneId,
        movement,
        enabled,
      );
      const requestId = ++maneuverRequestRef.current;
      cityRef.current = nextCity;
      setCity(nextCity);
      try {
        const saved = await replaceLaneConnections(
          currentCity.id,
          nextCity.lane_connections ?? [],
        );
        if (requestId === maneuverRequestRef.current) {
          setCity((latestCity) => {
            const savedCity = { ...latestCity, lane_connections: saved };
            cityRef.current = savedCity;
            return savedCity;
          });
        }
      } catch (error) {
        console.error("Failed to persist intersection maneuver", {
          error,
          intersectionId,
          roadId,
          laneId,
          movement,
        });
        if (requestId === maneuverRequestRef.current) {
          setCity((latestCity) => {
            const rolledBackCity = {
              ...latestCity,
              lane_connections: previousConnections,
            };
            cityRef.current = rolledBackCity;
            return rolledBackCity;
          });
          setDeleteError(tProperties("maneuverSaveFailed"));
        }
      }
    },
    [selected, tProperties],
  );

  const handleToggleLayer = useCallback((layer: LayerGroupId) => {
    setLayerVisibility((current) => ({
      ...current,
      [layer]: !current[layer],
    }));
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
      const previousCity = city;
      const next = addRoadWithEndpointSnaps(
        previousCity,
        road,
        drawStartPoint.snapTarget,
        snapTarget,
      );
      if (!next) return;
      setCity(next);
      persistCreatedRoadTopology(previousCity, next);
      setSelected({ type: "road", id });
      setDrawStartPoint(null);
      dispatch({ type: "set-tool", tool: "select" });
    },
    [city, drawStartPoint, persistCreatedRoadTopology],
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
        {!hydrated && !loadError ? (
          <div
            className="flex flex-1 items-center justify-center text-sm text-muted-foreground"
            role="status"
          >
            {tMap("loadingCity")}
          </div>
        ) : (
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
            layerVisibility={layerVisibility}
            // The empty editor workspace uses a fixed world. Persisted cities
            // must fit to their loaded geometry once, otherwise the initial
            // pre-hydration camera can leave the real network off-screen.
            fitSignal={hydrated ? 1 : 0}
            editorWorld={
              city.coordinate_system === "LOCAL_CARTESIAN"
                ? EDITOR_WORLD_BOUNDS
                : undefined
            }
            mode={
              session.mode === "edit" && session.activeTool === "select"
                ? "edit-geometry"
                : "view"
            }
            activeTool={
              session.activeTool === "draw-road" ? "draw-road" : "select"
            }
            snapLabel={t("snap")}
            compassLabel={tMap("compass")}
            resetNorthLabel={tMap("resetNorth")}
            onDrawPoint={handleDrawPoint}
            editorAction={null}
            onEditorStatusChange={() => undefined}
            onRoadSaved={() => undefined}
            onScaleChange={setScale}
            onRoadGeometryChange={handleRoadGeometryChange}
          />
        )}
        {loadError && (
          <div
            role="alert"
            className="absolute left-3 top-3 rounded-md bg-surface p-3 text-sm text-danger shadow"
          >
            {tProperties("workspaceLoadFailed")}
          </div>
        )}
        {deleteError && (
          <div
            role="alert"
            className="absolute left-3 top-14 rounded-md bg-surface p-3 text-sm text-danger shadow"
          >
            {deleteError}
          </div>
        )}
        {selectedRoad && (
          <RoadPropertiesPanel
            key={selectedRoad.id}
            road={selectedRoad}
            endpointNodeIds={selectedRoadNodeIds ?? { start: null, end: null }}
            onApplyPreset={handleApplyRoadPreset}
            onDelete={handleDeleteRoad}
            onChange={handleRoadPropertiesChange}
          />
        )}
        {selectedIntersection && (
          <IntersectionPropertiesPanel
            intersection={selectedIntersection}
            roads={city.roads}
            onCornerRadiusChange={handleIntersectionRadiusChange}
            laneConnections={city.lane_connections ?? []}
            onManeuverChange={handleManeuverChange}
          />
        )}
        {deleteConfirmationRoad && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 p-4"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isDeletingRoad) {
                setDeleteConfirmationRoad(null);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-road-title"
              className="w-full max-w-sm rounded-lg border border-border-subtle bg-surface p-5 shadow-xl"
            >
              <h2
                id="delete-road-title"
                className="text-base font-semibold text-foreground"
              >
                {tProperties("deleteConfirmTitle")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {tProperties("deleteConfirm", {
                  name: deleteConfirmationRoad.name,
                })}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isDeletingRoad}
                  onClick={() => setDeleteConfirmationRoad(null)}
                  className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-foreground hover:bg-surface-elevated disabled:opacity-50"
                >
                  {tProperties("cancelDelete")}
                </button>
                <button
                  type="button"
                  disabled={isDeletingRoad}
                  onClick={() => void confirmDeleteRoad()}
                  className="rounded-md bg-danger px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isDeletingRoad
                    ? tProperties("deletingRoad")
                    : tProperties("confirmDelete")}
                </button>
              </div>
            </section>
          </div>
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
        <div className="pointer-events-none absolute left-3 top-14">
          <div className="pointer-events-auto rounded-lg border border-border-subtle bg-surface/90 p-1.5 shadow-sm backdrop-blur">
            <MapLayersToggle
              layerVisibility={layerVisibility}
              onToggleLayer={handleToggleLayer}
            />
          </div>
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
