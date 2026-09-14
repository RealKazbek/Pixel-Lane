"use client";

/**
 * Road Geometry Lab: renders the ten deterministic primitives from
 * `fixtures.ts` through the exact same `PixelLaneMap` component Demo
 * City and Real Almaty use -- no separate rendering path, no static
 * mockup. See docs/road-geometry.md.
 */

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { PixelLaneMap } from "../../map/PixelLaneMap";
import { buildRoadLabCity } from "./fixtures";
import { DEFAULT_LAYER_VISIBILITY } from "../../map/types";

export function RoadLabApp() {
  const { city, cells } = useMemo(() => buildRoadLabCity(), []);
  const [fitSignal, setFitSignal] = useState(0);
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-2">
        <div>
          <h1 className="text-sm font-semibold">Road Geometry Lab</h1>
          <p className="text-xs text-text-muted">
            Isolated geometry primitives -- not persisted, not linked from
            the product UI.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFitSignal((n) => n + 1)}
            className="rounded-md border border-border-subtle bg-surface-elevated px-2.5 py-1 text-xs font-medium hover:bg-surface"
          >
            Fit to view
          </button>
          <button
            type="button"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            className="rounded-md border border-border-subtle bg-surface-elevated px-2.5 py-1 text-xs font-medium hover:bg-surface"
          >
            Toggle theme ({resolvedTheme ?? "system"})
          </button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 shrink-0 overflow-y-auto border-r border-border-subtle bg-surface p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Fixtures
          </h2>
          <ul className="space-y-1 text-xs">
            {cells.map((cell) => (
              <li key={cell.id} className="text-text-muted">
                {cell.label}
              </li>
            ))}
          </ul>
        </aside>
        <div className="relative flex-1">
          <PixelLaneMap
            city={city}
            selected={null}
            onSelect={() => {}}
            basemapEnabled={false}
            mapStyleUrl={null}
            overlayVisible={true}
            layerVisibility={DEFAULT_LAYER_VISIBILITY}
            fitSignal={fitSignal}
            mode="view"
            editorAction={null}
            onEditorStatusChange={() => {}}
            onRoadSaved={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
