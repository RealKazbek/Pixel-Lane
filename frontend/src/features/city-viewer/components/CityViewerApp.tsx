"use client";

import { useMemo, useState } from "react";
import { CityCanvas, type CenterRequest } from "./canvas/CityCanvas";
import { CongestionLegend } from "./CongestionLegend";
import { BottleneckList } from "./sidebar/BottleneckList";
import { CityList } from "./sidebar/CityList";
import { LayerToggles } from "./sidebar/LayerToggles";
import { DetailsPanel } from "./details/DetailsPanel";
import { useCities } from "../hooks/useCities";
import { useCity } from "../hooks/useCity";
import { useProjectedCity } from "../hooks/useProjectedCity";
import { useTrafficAnalysis } from "../hooks/useTrafficAnalysis";
import {
  buildAnalysisLookup,
  type AnalysisLookup,
} from "../lib/analysis-lookup";
import { projectCity } from "../lib/project-city";
import { entityCenterPoint } from "../lib/scene";
import { DEFAULT_LAYERS, type LayerVisibility } from "../state/layers";
import type { SelectedEntity } from "../state/selection";
import type { City } from "../types/city";

export function CityViewerApp() {
  const { cities, status: citiesStatus } = useCities();
  const [explicitCityId, setExplicitCityId] = useState<string | null>(null);
  // Auto-select when there's exactly one city; with several, leave the
  // choice to the user. Derived, not effect+setState, so there's no extra
  // render cycle.
  const selectedCityId =
    explicitCityId ?? (cities.length === 1 ? cities[0].id : null);
  const { city, status: cityStatus } = useCity(selectedCityId);
  const analysis = useTrafficAnalysis(selectedCityId);

  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYERS);
  const [selected, setSelected] = useState<SelectedEntity | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [centerRequest, setCenterRequest] = useState<CenterRequest | null>(
    null,
  );

  const analysisLookup = useMemo(
    () => buildAnalysisLookup(analysis.result),
    [analysis.result],
  );

  function handleSelectCity(cityId: string) {
    setExplicitCityId(cityId);
    setSelected(null);
    analysis.reset();
  }

  function handleSelectBottleneck(entity: SelectedEntity) {
    setSelected(entity);
    if (!city) return;
    // projectCity() is a pure function, cheap enough to call once here on
    // click -- no need to keep a second copy of the projection around.
    const point = entityCenterPoint(city, projectCity(city), entity);
    if (point) setCenterRequest({ point, token: Date.now() });
  }

  function toggleLayer(layer: keyof LayerVisibility) {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
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
          <>
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
                    {analysis.result.network_summary.routed_demand_count} routed
                    · {analysis.result.network_summary.unrouted_demand_count}{" "}
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

            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Layers
              </h2>
              <LayerToggles layers={layers} onToggle={toggleLayer} />
            </section>
          </>
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
          <CityViewerCanvas
            city={city}
            layers={layers}
            selected={selected}
            onSelect={setSelected}
            fitSignal={fitSignal}
            centerRequest={centerRequest}
            analysisLookup={analysisLookup}
            hasAnalysis={analysis.result !== null}
            onFitToView={() => setFitSignal((n) => n + 1)}
          />
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

interface CityViewerCanvasProps {
  city: City;
  layers: LayerVisibility;
  selected: SelectedEntity | null;
  onSelect: (entity: SelectedEntity | null) => void;
  fitSignal: number;
  centerRequest: CenterRequest | null;
  analysisLookup: AnalysisLookup;
  hasAnalysis: boolean;
  onFitToView: () => void;
}

function CityViewerCanvas({
  city,
  layers,
  selected,
  onSelect,
  fitSignal,
  centerRequest,
  analysisLookup,
  hasAnalysis,
  onFitToView,
}: CityViewerCanvasProps) {
  const { projected, bounds } = useProjectedCity(city);

  return (
    <>
      <CityCanvas
        city={city}
        projected={projected}
        bounds={bounds}
        analysis={analysisLookup}
        layers={layers}
        selected={selected}
        onSelect={onSelect}
        fitSignal={fitSignal}
        centerRequest={centerRequest}
      />

      <div className="pointer-events-none absolute inset-3 flex flex-col justify-between">
        <div className="pointer-events-auto self-end">
          <button
            type="button"
            onClick={onFitToView}
            className="rounded-md border border-zinc-200 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-300"
          >
            Fit to view
          </button>
        </div>
        {hasAnalysis && layers.trafficAnalysis && (
          <div className="pointer-events-auto self-start">
            <CongestionLegend />
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
        <div className="pointer-events-auto max-h-32 w-full max-w-xl overflow-y-auto rounded-md border border-zinc-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
          <DetailsPanel
            city={city}
            projected={projected}
            analysis={analysisLookup}
            selected={selected}
          />
        </div>
      </div>
    </>
  );
}
