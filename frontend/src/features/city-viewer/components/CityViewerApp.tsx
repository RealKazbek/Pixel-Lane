"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/EmptyState";
import { PixelLaneMap, type EditorAction } from "../map/PixelLaneMap";
import type { ViewportDataStatus } from "../map/hooks/useViewportCityData";
import { MapToolbar } from "../map/MapToolbar";
import { BottleneckList } from "./sidebar/BottleneckList";
import { CityList } from "./sidebar/CityList";
import { DetailsPanel } from "./details/DetailsPanel";
import { useCities } from "../hooks/useCities";
import { useCity } from "../hooks/useCity";
import { useTrafficAnalysis } from "../hooks/useTrafficAnalysis";
import { buildAnalysisLookup } from "../lib/analysis-lookup";
import { mapBasemapEnabledByDefault, mapStyleUrl } from "@/lib/config";
import type { EditorStatus } from "../map/editor/useGeometryEditor";
import type { ApplyRoadEditError } from "../map/editor/applyRoadEdit";
import {
  DEFAULT_LAYER_VISIBILITY,
  type LayerVisibility,
  type MapMode,
  type MapSelection,
} from "../map/types";
import type { Bottleneck } from "../types/traffic-analysis";

export function CityViewerApp() {
  const t = useTranslations("cityModel.sidebar");
  const tMap = useTranslations("cityModel.map");
  const tEditor = useTranslations("cityModel.editor");
  const { cities, status: citiesStatus } = useCities();
  const [explicitCityId, setExplicitCityId] = useState<string | null>(null);
  // Auto-select when there's exactly one city; with several, leave the
  // choice to the user. Derived, not effect+setState, so there's no extra
  // render cycle.
  const selectedCityId =
    explicitCityId ?? (cities.length === 1 ? cities[0].id : null);
  const {
    city,
    status: cityStatus,
    refresh: refreshCity,
  } = useCity(selectedCityId);
  const analysis = useTrafficAnalysis(selectedCityId);

  const [selected, setSelected] = useState<MapSelection | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [basemapEnabled, setBasemapEnabled] = useState(
    mapBasemapEnabledByDefault,
  );
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(
    DEFAULT_LAYER_VISIBILITY,
  );
  const [mode, setMode] = useState<MapMode>("view");
  const [editorAction, setEditorAction] = useState<EditorAction | null>(null);
  const [viewportStatus, setViewportStatus] =
    useState<ViewportDataStatus>("idle");
  const [editorStatus, setEditorStatus] = useState<EditorStatus>("idle");
  const [editorError, setEditorError] = useState<ApplyRoadEditError | null>(
    null,
  );

  const analysisLookup = useMemo(
    () => buildAnalysisLookup(analysis.result),
    [analysis.result],
  );

  function handleSelectCity(cityId: string) {
    setExplicitCityId(cityId);
    setSelected(null);
    setMode("view");
    analysis.reset();
  }

  function handleSelectBottleneck(bottleneck: Bottleneck) {
    if (bottleneck.entity_type === "lane") return; // not separately selectable on the map yet
    setSelected({ type: bottleneck.entity_type, id: bottleneck.entity_id });
  }

  function handleEditorStatusChange(
    status: EditorStatus,
    error: ApplyRoadEditError | null,
  ) {
    setEditorStatus(status);
    setEditorError(error);
    if (status === "idle") setMode("view");
  }

  // Escape backs out of an in-progress edit -- the same effect as the
  // toolbar's Cancel button -- so the keyboard-only path matches the
  // mouse-only path instead of leaving Escape a dead key while editing.
  useEffect(() => {
    if (mode !== "edit-geometry") return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEditorAction({ type: "cancel", token: Date.now() });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-border-subtle bg-surface p-4">
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {t("citiesHeading")}
          </h2>
          {citiesStatus === "loading" && (
            <p className="text-xs text-zinc-500">{t("loadingCities")}</p>
          )}
          {citiesStatus === "error" && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {t("backendUnavailable")}
            </p>
          )}
          {citiesStatus === "ready" && (
            <CityList
              cities={cities}
              selectedCityId={selectedCityId}
              onSelectCity={handleSelectCity}
            />
          )}
        </section>

        {city && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("analysisHeading")}
            </h2>
            <button
              type="button"
              onClick={() => analysis.run()}
              disabled={analysis.status === "loading"}
              className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {analysis.status === "loading"
                ? t("runningAnalysis")
                : t("runAnalysis")}
            </button>
            {analysis.status === "error" && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {t("analysisFailed")}
              </p>
            )}
            {analysis.result && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t("demandSummary", {
                    routed: analysis.result.network_summary.routed_demand_count,
                    unrouted:
                      analysis.result.network_summary.unrouted_demand_count,
                  })}
                </p>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {t("bottlenecksHeading")}
                </h3>
                <BottleneckList
                  bottlenecks={analysis.result.bottlenecks}
                  onSelect={handleSelectBottleneck}
                />
                {analysis.result.warnings.length > 0 && (
                  <details className="text-xs text-zinc-500 dark:text-zinc-400">
                    <summary className="cursor-pointer">
                      {t("warningsCount", {
                        count: analysis.result.warnings.length,
                      })}
                    </summary>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {analysis.result.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </section>
        )}
      </aside>

      <div className="relative flex-1 overflow-hidden">
        {cityStatus === "loading" && <EmptyState title={tMap("loadingCity")} />}
        {cityStatus === "error" && (
          <EmptyState title={tMap("cityFailedToLoad")} tone="error" />
        )}
        {!selectedCityId && cityStatus !== "loading" && (
          <EmptyState title={tMap("selectCityPrompt")} />
        )}

        {city && city.roads.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <EmptyState title={tMap("cityHasNoRoadData")} />
          </div>
        )}

        {city && (
          <>
            <PixelLaneMap
              city={city}
              selected={selected}
              onSelect={setSelected}
              basemapEnabled={basemapEnabled}
              mapStyleUrl={mapStyleUrl}
              overlayVisible={overlayVisible}
              layerVisibility={layerVisibility}
              fitSignal={fitSignal}
              mode={mode}
              editorAction={editorAction}
              onEditorStatusChange={handleEditorStatusChange}
              onRoadSaved={refreshCity}
              onViewportStatusChange={setViewportStatus}
            />

            {(viewportStatus === "loading" || viewportStatus === "error") && (
              <div className="pointer-events-none absolute bottom-3 left-3 z-10">
                <span
                  className={`rounded-md border px-2.5 py-1 text-xs shadow-sm backdrop-blur ${
                    viewportStatus === "error"
                      ? "border-danger/40 bg-danger/10 text-danger"
                      : "border-border-subtle bg-surface-elevated/90 text-text-muted"
                  }`}
                >
                  {viewportStatus === "error"
                    ? tMap("viewportDataFailed")
                    : tMap("loadingViewportData")}
                </span>
              </div>
            )}

            <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
              <MapToolbar
                basemapEnabled={basemapEnabled}
                onToggleBasemap={() => setBasemapEnabled((v) => !v)}
                basemapConfigured={mapStyleUrl !== null}
                overlayVisible={overlayVisible}
                onToggleOverlay={() => setOverlayVisible((v) => !v)}
                layerVisibility={layerVisibility}
                onToggleLayer={(layer) =>
                  setLayerVisibility((prev) => ({
                    ...prev,
                    [layer]: !prev[layer],
                  }))
                }
                mode={mode}
                onSetMode={setMode}
                canEditSelection={selected?.type === "road"}
                editorStatus={editorStatus}
                onApply={() =>
                  setEditorAction({ type: "apply", token: Date.now() })
                }
                onCancel={() =>
                  setEditorAction({ type: "cancel", token: Date.now() })
                }
                onFitToView={() => setFitSignal((n) => n + 1)}
              />
            </div>

            {/* Contextual inspector: reserves no screen space at all when
                nothing is selected, so the map stays the dominant working
                area instead of a permanently-docked (mostly empty) panel. */}
            {(selected || editorError) && (
              <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-3 sm:items-end">
                {editorError && (
                  <p className="pointer-events-auto rounded-md bg-red-600 px-3 py-1.5 text-xs text-white shadow-sm">
                    {tEditor(
                      editorError === "min-points"
                        ? "minPointsError"
                        : "saveFailed",
                    )}
                  </p>
                )}
                {selected && (
                  <div className="pointer-events-auto max-h-64 w-full max-w-xs overflow-y-auto rounded-md border border-border-subtle bg-surface/95 px-3 py-2 shadow-md backdrop-blur">
                    <DetailsPanel
                      city={city}
                      analysis={analysisLookup}
                      selected={selected}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
