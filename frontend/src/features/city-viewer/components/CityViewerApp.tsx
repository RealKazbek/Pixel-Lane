"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { useTranslations } from "next-intl";
import { mapStyleUrl } from "@/lib/config";
import {
  buildEditorWorkspace,
  createEditorRoad,
} from "../editor/editorWorkspace";
import type { Point } from "../types/city";
import { updateRoadEndpoint } from "../map/editor/endpointEditing";
import { EDITOR_WORLD_BOUNDS } from "../editor/editorWorld";
import { PixelLaneMap } from "../map/PixelLaneMap";
import { DEFAULT_LAYER_VISIBILITY, type MapSelection } from "../map/types";
import { EditorToolbar } from "../map/EditorToolbar";
import {
  INITIAL_EDITOR_SESSION,
  reduceEditorSession,
} from "../map/editor/editorState";

/** City Model is currently an editor document, not a city picker/viewer. */
export function CityViewerApp() {
  const t = useTranslations("cityModel.fullscreen");
  const [city, setCity] = useState(buildEditorWorkspace);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selected, setSelected] = useState<MapSelection | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<"A" | "B" | null>(
    null,
  );
  const [session, dispatch] = useReducer(
    reduceEditorSession,
    INITIAL_EDITOR_SESSION,
  );
  const [scale, setScale] = useState({ denominator: 2000, barMeters: 100 });
  const [drawStartPoint, setDrawStartPoint] = useState<Point | null>(null);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(
    null,
  );
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
  const handleSelect = useCallback((selection: MapSelection | null) => {
    setSelected(selection);
    setSelectedEndpoint(null);
  }, []);
  const handleEndpointDrag = useCallback(
    (endpoint: "A" | "B", point: Point) => {
      if (selected?.type !== "road") return;
      setCity((current) => ({
        ...current,
        roads: current.roads.map((road) => {
          if (road.id !== selected.id) return road;
          const points = road.geometry.points;
          if (points.length !== 2) return road;
          const next = updateRoadEndpoint(
            points as [Point, Point],
            endpoint === "A" ? 0 : 1,
            point,
          );
          return next
            ? { ...road, geometry: { ...road.geometry, points: next } }
            : road;
        }),
      }));
    },
    [selected],
  );
  const handleDrawPoint = useCallback(
    (point: Point) => {
      if (!drawStartPoint) {
        setDrawStartPoint(point);
        return;
      }
      const dx = point.x - drawStartPoint.x;
      const dy = point.y - drawStartPoint.y;
      if (Math.hypot(dx, dy) < 1) return;
      const id = `editor-road-${Date.now()}`;
      const road = createEditorRoad(
        id,
        `Road ${String.fromCharCode(65 + city.roads.length)}`,
        [drawStartPoint, point],
      );
      setCity((current) => ({ ...current, roads: [...current.roads, road] }));
      setSelected({ type: "road", id });
      setDrawStartPoint(null);
      dispatch({ type: "set-tool", tool: "select" });
    },
    [city.roads.length, drawStartPoint],
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
        <PixelLaneMap
          city={city}
          selected={selected}
          onSelect={handleSelect}
          selectedEndpoint={selectedEndpoint}
          onEndpointSelect={setSelectedEndpoint}
          onEndpointDrag={handleEndpointDrag}
          basemapEnabled={false}
          mapStyleUrl={mapStyleUrl}
          overlayVisible
          layerVisibility={DEFAULT_LAYER_VISIBILITY}
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
          onDrawPoint={handleDrawPoint}
          editorAction={null}
          onEditorStatusChange={() => undefined}
          onRoadSaved={() => undefined}
          onScaleChange={setScale}
          onRoadGeometryChange={handleRoadGeometryChange}
        />
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
