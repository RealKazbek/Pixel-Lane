"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { applyRoadEdit, type ApplyRoadEditError } from "./applyRoadEdit";
import { createGeometryEditor, type GeometryEditor } from "./geometryEditor";
import { setEditedRoadHidden } from "../layers/setupLayers";
import type { CoordinateSystem, Point, Road } from "../../types/city";

export type EditorStatus = "idle" | "editing" | "saving" | "error";

/** React-facing wrapper around the Terra Draw adapter (geometryEditor.ts)
 * plus the persistence step (applyRoadEdit.ts). Terra Draw's own store
 * never leaks past this hook -- callers only see `editingRoadId`/
 * `status`/`error` and the resulting `Road` once saved. `error` is a code,
 * not display text -- the caller localizes it (see `cityModel.editor`). */
export function useGeometryEditor() {
  const editorRef = useRef<GeometryEditor | null>(null);
  const [editingRoadId, setEditingRoadId] = useState<string | null>(null);
  const [status, setStatus] = useState<EditorStatus>("idle");
  const [error, setError] = useState<ApplyRoadEditError | null>(null);

  useEffect(
    () => () => {
      editorRef.current?.destroy();
      editorRef.current = null;
    },
    [],
  );

  const start = useCallback(
    (
      map: MapLibreMap,
      road: Road,
      coordinateSystem: CoordinateSystem,
      onChange: (points: Point[]) => void,
    ) => {
      if (!editorRef.current) {
        editorRef.current = createGeometryEditor(map);
      }
      editorRef.current.beginEditingRoad(road, coordinateSystem, onChange);
      setEditingRoadId(road.id);
      setStatus("editing");
      setError(null);
    },
    [],
  );

  const cancel = useCallback((map: MapLibreMap) => {
    editorRef.current?.cancel();
    setEditedRoadHidden(map, null);
    setEditingRoadId(null);
    setStatus("idle");
  }, []);

  const apply = useCallback(
    async (
      map: MapLibreMap,
      cityId: string,
      coordinateSystem: CoordinateSystem,
    ) => {
      if (!editorRef.current || !editingRoadId) return null;
      const roadId = editingRoadId;
      const points = editorRef.current.apply(coordinateSystem);
      setEditedRoadHidden(map, null);

      if (!points) {
        setEditingRoadId(null);
        setStatus("idle");
        return null;
      }

      setStatus("saving");
      const result = await applyRoadEdit(cityId, roadId, points);
      setEditingRoadId(null);

      if (!result.ok) {
        setStatus("error");
        setError(result.error);
        return null;
      }
      setStatus("idle");
      return result.road;
    },
    [editingRoadId],
  );

  return { editingRoadId, status, error, start, cancel, apply };
}
