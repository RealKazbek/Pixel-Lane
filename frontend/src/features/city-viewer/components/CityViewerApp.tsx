"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { mapStyleUrl } from "@/lib/config";
import { buildEditorWorkspace } from "../editor/editorWorkspace";
import { EDITOR_WORLD_BOUNDS } from "../editor/editorWorld";
import { PixelLaneMap } from "../map/PixelLaneMap";
import { DEFAULT_LAYER_VISIBILITY, type MapSelection } from "../map/types";

/** City Model is currently an editor document, not a city picker/viewer. */
export function CityViewerApp() {
  const t = useTranslations("cityModel.fullscreen");
  const [city, setCity] = useState(buildEditorWorkspace);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selected, setSelected] = useState<MapSelection | null>(null);
  const [scale, setScale] = useState({ denominator: 2000, barMeters: 100 });
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
          mode="edit-geometry"
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
