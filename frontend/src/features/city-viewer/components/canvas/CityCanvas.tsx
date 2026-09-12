"use client";

import { useEffect, useMemo, useRef } from "react";
import { useElementSize } from "../../hooks/useElementSize";
import { usePrefersDark } from "../../hooks/usePrefersDark";
import { useViewport } from "../../hooks/useViewport";
import { canvasToWorld, type Bounds } from "../../lib/geometry";
import { hitTest } from "../../lib/hit-test";
import type { ProjectedCity } from "../../lib/project-city";
import { renderScene } from "./renderer";
import type { AnalysisLookup } from "../../lib/analysis-lookup";
import type { City, Point } from "../../types/city";
import type { LayerVisibility } from "../../state/layers";
import type { SelectedEntity } from "../../state/selection";

const CLICK_MOVE_TOLERANCE_PX = 4;

export interface CenterRequest {
  point: Point;
  /** Incremented on every request so effects re-fire even when the point
   * itself repeats (e.g. clicking the same bottleneck twice). */
  token: number;
}

interface CityCanvasProps {
  city: City;
  projected: ProjectedCity;
  bounds: Bounds;
  analysis: AnalysisLookup;
  layers: LayerVisibility;
  selected: SelectedEntity | null;
  onSelect: (entity: SelectedEntity | null) => void;
  /** Bumped by the parent (a "Fit to view" button) to request a re-fit. */
  fitSignal: number;
  centerRequest: CenterRequest | null;
}

export function CityCanvas({
  city,
  projected,
  bounds,
  analysis,
  layers,
  selected,
  onSelect,
  fitSignal,
  centerRequest,
}: CityCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useElementSize(containerRef);
  const isDarkMode = usePrefersDark();
  const {
    viewport,
    fit,
    centerOn,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useViewport();
  const pointerDownAt = useRef<{ x: number; y: number } | null>(null);

  // Fit whenever the city or canvas size changes, or the parent bumps
  // `fitSignal` (the "Fit to view" button) -- never on a timer.
  useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      fit(bounds, size.width, size.height);
    }
    // fit()/centerOn() are stable (useCallback, no deps); omitted so this
    // only re-runs for inputs that should actually trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds, size.width, size.height, fitSignal]);

  useEffect(() => {
    if (centerRequest && size.width > 0 && size.height > 0) {
      centerOn(centerRequest.point, size.width, size.height);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerRequest]);

  const scene = useMemo(
    () => ({
      city,
      projected,
      analysis,
      viewport,
      layers,
      selected,
      canvasWidth: size.width,
      canvasHeight: size.height,
      devicePixelRatio:
        typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
    }),
    [city, projected, analysis, viewport, layers, selected, size],
  );

  // Redraw only when the scene actually changed -- no animation loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || scene.canvasWidth === 0 || scene.canvasHeight === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = scene.canvasWidth * scene.devicePixelRatio;
    canvas.height = scene.canvasHeight * scene.devicePixelRatio;
    canvas.style.width = `${scene.canvasWidth}px`;
    canvas.style.height = `${scene.canvasHeight}px`;

    renderScene(ctx, scene, isDarkMode);
  }, [scene, isDarkMode]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    pointerDownAt.current = { x: event.clientX, y: event.clientY };
    onPointerDown(event);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const start = pointerDownAt.current;
    pointerDownAt.current = null;
    onPointerUp(event);

    if (!start) return;
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved > CLICK_MOVE_TOLERANCE_PX) return; // was a drag, not a click

    const rect = event.currentTarget.getBoundingClientRect();
    const canvasPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const worldPoint = canvasToWorld(canvasPoint, viewport);
    onSelect(hitTest(scene, worldPoint));
  };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  );
}
