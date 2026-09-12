"use client";

import { useMemo, useState } from "react";
import { PixelLaneMap, type EditorAction } from "../map/PixelLaneMap";
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
import type { MapMode, MapSelection } from "../map/types";
import type { Bottleneck } from "../types/traffic-analysis";

export function CityViewerApp() {
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
  const [mode, setMode] = useState<MapMode>("view");
  const [editorAction, setEditorAction] = useState<EditorAction | null>(null);
  const [editorStatus, setEditorStatus] = useState<EditorStatus>("idle");
  const [editorError, setEditorError] = useState<string | null>(null);

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
    error: string | null,
  ) {
    setEditorStatus(status);
    setEditorError(error);
    if (status === "idle") setMode("view");
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-r border-zinc-200 p-4 dark:border-zinc-800">
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Cities
          </h2>
          {citiesStatus === "loading" && (
            <p className="text-xs text-zinc-500">Loading cities…</p>
          )}
          {citiesStatus === "error" && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Backend unavailable.
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
              Analysis
            </h2>
            <button
              type="button"
              onClick={() => analysis.run()}
              disabled={analysis.status === "loading"}
              className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {analysis.status === "loading"
                ? "Running…"
                : "Run Traffic Analysis"}
            </button>
            {analysis.status === "error" && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                Traffic analysis failed.
              </p>
            )}
            {analysis.result && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {analysis.result.network_summary.routed_demand_count} routed ·{" "}
                  {analysis.result.network_summary.unrouted_demand_count}{" "}
                  unrouted demand(s)
                </p>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Bottlenecks
                </h3>
                <BottleneckList
                  bottlenecks={analysis.result.bottlenecks}
                  onSelect={handleSelectBottleneck}
                />
                {analysis.result.warnings.length > 0 && (
                  <details className="text-xs text-zinc-500 dark:text-zinc-400">
                    <summary className="cursor-pointer">
                      {analysis.result.warnings.length} warning(s)
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
        {cityStatus === "loading" && <CenteredMessage text="Loading city…" />}
        {cityStatus === "error" && (
          <CenteredMessage text="City failed to load." isError />
        )}
        {!selectedCityId && cityStatus !== "loading" && (
          <CenteredMessage text="Select a city from the sidebar to view its road network." />
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
              fitSignal={fitSignal}
              mode={mode}
              editorAction={editorAction}
              onEditorStatusChange={handleEditorStatusChange}
              onRoadSaved={refreshCity}
            />

            <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
              <MapToolbar
                basemapEnabled={basemapEnabled}
                onToggleBasemap={() => setBasemapEnabled((v) => !v)}
                basemapConfigured={mapStyleUrl !== null}
                overlayVisible={overlayVisible}
                onToggleOverlay={() => setOverlayVisible((v) => !v)}
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

            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col items-center gap-2">
              {editorError && (
                <p className="pointer-events-auto rounded-md bg-red-600 px-3 py-1.5 text-xs text-white shadow-sm">
                  {editorError}
                </p>
              )}
              <div className="pointer-events-auto max-h-32 w-full max-w-xl overflow-y-auto rounded-md border border-zinc-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
                <DetailsPanel
                  city={city}
                  analysis={analysisLookup}
                  selected={selected}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CenteredMessage({
  text,
  isError = false,
}: {
  text: string;
  isError?: boolean;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center px-6 text-center">
      <p
        className={`text-sm ${isError ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}`}
      >
        {text}
      </p>
    </div>
  );
}
