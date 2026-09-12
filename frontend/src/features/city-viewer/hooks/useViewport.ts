"use client";

import { useCallback, useRef, useState } from "react";
import {
  centerViewport,
  fitToView,
  panBy,
  zoomAt,
  type Bounds,
  type Viewport,
} from "../lib/geometry";
import type { Point } from "../types/city";

const ZOOM_STEP = 1.0015; // per pixel of wheel delta -- gentle, controllable zoom

export function useViewport() {
  const [viewport, setViewport] = useState<Viewport>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });
  const dragState = useRef<{ x: number; y: number } | null>(null);

  const fit = useCallback((bounds: Bounds, width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    setViewport(fitToView(bounds, width, height));
  }, []);

  const centerOn = useCallback(
    (worldPoint: Point, width: number, height: number) => {
      if (width <= 0 || height <= 0) return;
      setViewport((current) =>
        centerViewport(current, worldPoint, width, height),
      );
    },
    [],
  );

  const onWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const canvasPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const factor = Math.pow(ZOOM_STEP, -event.deltaY);
    setViewport((current) => zoomAt(current, canvasPoint, factor));
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      dragState.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!dragState.current) return;
      const dx = event.clientX - dragState.current.x;
      const dy = event.clientY - dragState.current.y;
      dragState.current = { x: event.clientX, y: event.clientY };
      setViewport((current) => panBy(current, dx, dy));
    },
    [],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      dragState.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    [],
  );

  const isDragging = useCallback(() => dragState.current !== null, []);

  return {
    viewport,
    fit,
    centerOn,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    isDragging,
  };
}
