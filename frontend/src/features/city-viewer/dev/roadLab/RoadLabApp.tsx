"use client";

/**
 * Road Geometry Lab: renders the ten deterministic primitives from
 * `fixtures.ts` through the exact same `PixelLaneMap` component Demo
 * City and Real Almaty use -- no separate rendering path, no static
 * mockup. See docs/road-geometry.md.
 */

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import type { LngLatBoundsLike } from "maplibre-gl";
import { PixelLaneMap } from "../../map/PixelLaneMap";
import { buildRoadLabCity } from "./fixtures";
import { toLngLat } from "../../map/adapters/coordinates";
import { DEFAULT_LAYER_VISIBILITY } from "../../map/types";

const FOCUS_MARGIN_M = 25;

export function RoadLabApp() {
  const { city, cells } = useMemo(() => buildRoadLabCity(), []);
  const [fitSignal, setFitSignal] = useState(0);
  const [focusBounds, setFocusBounds] = useState<{
    bounds: LngLatBoundsLike;
    token: number;
  } | null>(null);
  const { resolvedTheme, setTheme } = useTheme();

  // Per-fixture bounds, computed from just that fixture's own roads
  // (ids are prefixed `t<cellId>-`) -- a tight fit so "jump to fixture"
  // actually zooms in close enough to see real (not coarse-zoom-
  // fallback) geometry.
  const cellBounds = useMemo(() => {
    const result = new Map<string, LngLatBoundsLike>();
    for (const cell of cells) {
      const prefix = `t${cell.id}-`;
      const roads = city.roads.filter((r) => r.id.startsWith(prefix));
      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;
      for (const road of roads) {
        for (const point of road.geometry.points) {
          const [lng, lat] = toLngLat(city.coordinate_system, {
            x: point.x - FOCUS_MARGIN_M,
            y: point.y - FOCUS_MARGIN_M,
          });
          const [lng2, lat2] = toLngLat(city.coordinate_system, {
            x: point.x + FOCUS_MARGIN_M,
            y: point.y + FOCUS_MARGIN_M,
          });
          minLng = Math.min(minLng, lng, lng2);
          minLat = Math.min(minLat, lat, lat2);
          maxLng = Math.max(maxLng, lng, lng2);
          maxLat = Math.max(maxLat, lat, lat2);
        }
      }
      if (Number.isFinite(minLng)) {
        result.set(cell.id, [
          [minLng, minLat],
          [maxLng, maxLat],
        ]);
      }
    }
    return result;
  }, [city, cells]);

  function focusOn(cellId: string) {
    const bounds = cellBounds.get(cellId);
    if (!bounds) return;
    setFocusBounds((prev) => ({ bounds, token: (prev?.token ?? 0) + 1 }));
  }

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
            {/* Never render `resolvedTheme` as text here -- it's
                undefined during server rendering and resolves on the
                client, so including it in the label would be a
                guaranteed hydration mismatch. */}
            Toggle theme
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
              <li key={cell.id}>
                <button
                  type="button"
                  onClick={() => focusOn(cell.id)}
                  className="w-full rounded px-1.5 py-1 text-left text-text-muted hover:bg-surface-elevated hover:text-foreground"
                >
                  {cell.label}
                </button>
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
            focusBounds={focusBounds}
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
