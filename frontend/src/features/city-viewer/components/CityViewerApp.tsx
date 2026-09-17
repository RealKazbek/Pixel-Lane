"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { mapStyleUrl } from "@/lib/config";
import { buildEditorWorkspace } from "../editor/editorWorkspace";
import { EDITOR_WORLD_BOUNDS } from "../editor/editorWorld";
import { PixelLaneMap } from "../map/PixelLaneMap";
import { DEFAULT_LAYER_VISIBILITY, type MapSelection } from "../map/types";
import { gridIntervalForZoom } from "../map/grid";

/** City Model is currently an editor document, not a city picker/viewer. */
export function CityViewerApp() {
  const t = useTranslations("cityModel.fullscreen");
  const workspaceT = useTranslations("cityModel.workspace");
  const city = useMemo(() => buildEditorWorkspace(), []);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selected, setSelected] = useState<MapSelection | null>(null);
  const [gridInterval, setGridInterval] = useState(() =>
    gridIntervalForZoom(16),
  );
  const handleGridIntervalChange = useCallback((interval: number) => {
    setGridInterval(interval);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  return (
    <main
      className={`relative flex min-h-0 flex-1 overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-50 h-dvh w-screen bg-background" : ""
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
          mode="view"
          editorAction={null}
          onEditorStatusChange={() => undefined}
          onRoadSaved={() => undefined}
          onGridIntervalChange={handleGridIntervalChange}
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
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-border-subtle bg-surface/85 px-2 py-1 text-[10px] leading-4 text-muted-foreground shadow-sm backdrop-blur">
          <div>
            {workspaceT("world", {
              width: EDITOR_WORLD_BOUNDS.maxX - EDITOR_WORLD_BOUNDS.minX,
              height: EDITOR_WORLD_BOUNDS.maxY - EDITOR_WORLD_BOUNDS.minY,
            })}
          </div>
          <div>{workspaceT("grid", { size: gridInterval })}</div>
        </div>
      </div>
    </main>
  );
}
