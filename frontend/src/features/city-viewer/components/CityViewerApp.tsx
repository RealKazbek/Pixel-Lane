"use client";

import { useMemo, useState } from "react";
import { mapStyleUrl } from "@/lib/config";
import { buildEditorWorkspace } from "../editor/editorWorkspace";
import { MapToolbar } from "../map/MapToolbar";
import { PixelLaneMap } from "../map/PixelLaneMap";
import {
  DEFAULT_LAYER_VISIBILITY,
  type LayerVisibility,
  type MapSelection,
} from "../map/types";

/** City Model is currently an editor document, not a city picker/viewer. */
export function CityViewerApp() {
  const city = useMemo(() => buildEditorWorkspace(), []);
  const [selected, setSelected] = useState<MapSelection | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(
    DEFAULT_LAYER_VISIBILITY,
  );

  return (
    <main className="relative flex min-h-0 flex-1 overflow-hidden">
      <div className="relative flex min-w-0 flex-1 overflow-hidden pixel-lane-editor-grid">
        <PixelLaneMap
          city={city}
          selected={selected}
          onSelect={setSelected}
          basemapEnabled={false}
          mapStyleUrl={mapStyleUrl}
          overlayVisible
          layerVisibility={layerVisibility}
          fitSignal={fitSignal}
          mode="view"
          editorAction={null}
          onEditorStatusChange={() => undefined}
          onRoadSaved={() => undefined}
        />
        <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
          <MapToolbar
            editorOnly
            basemapEnabled={false}
            onToggleBasemap={() => undefined}
            basemapConfigured={false}
            overlayVisible
            onToggleOverlay={() => undefined}
            layerVisibility={layerVisibility}
            onToggleLayer={(layer) =>
              setLayerVisibility((current) => ({
                ...current,
                [layer]: !current[layer],
              }))
            }
            mode="view"
            onSetMode={() => undefined}
            canEditSelection={false}
            editorStatus="idle"
            onApply={() => undefined}
            onCancel={() => undefined}
            onFitToView={() => setFitSignal((value) => value + 1)}
          />
        </div>
      </div>
    </main>
  );
}
