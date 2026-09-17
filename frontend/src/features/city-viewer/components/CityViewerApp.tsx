"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { useTranslations } from "next-intl";
import { mapStyleUrl } from "@/lib/config";
import {
  buildEditorWorkspace,
  createEditorRoad,
} from "../editor/editorWorkspace";
import type { Point } from "../types/city";
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
  const [session, dispatch] = useReducer(
    reduceEditorSession,
    INITIAL_EDITOR_SESSION,
  );
  const [scale, setScale] = useState({ denominator: 2000, barMeters: 100 });
  const [drawStartPoint, setDrawStartPoint] = useState<Point | null>(null);
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
      <div className="relative flex min-w-0 flex-1 overflow-hidden">
        <PixelLaneMap
          city={city}
          selected={selected}
          onSelect={setSelected}
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
            <span aria-hidden="true" className="text-base leading-none">
              {isFullscreen ? "↙" : "↗"}
            </span>
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
        {session.activeTool === "draw-road" && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-md border border-border-subtle bg-surface/90 px-3 py-1.5 text-xs text-foreground shadow-sm backdrop-blur">
            {drawStartPoint ? t("drawFinish") : t("drawStart")}
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-md border border-border-subtle bg-surface/90 px-2.5 py-1.5 text-[10px] font-medium text-foreground shadow-sm backdrop-blur">
          <div>{t("scale", { denominator: scale.denominator })}</div>
          <div className="mt-1 flex items-end gap-1 text-[9px] font-normal text-muted-foreground">
            <span className="h-1.5 w-20 border-x border-b border-foreground/70" />
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
