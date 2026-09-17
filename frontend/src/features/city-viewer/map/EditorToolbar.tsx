"use client";

import { useTranslations } from "next-intl";
import type { MapMode } from "./types";

interface EditorToolbarProps {
  mode: MapMode;
  onSetMode: (mode: MapMode) => void;
}

const base =
  "rounded-md border px-2.5 py-1.5 text-xs font-medium shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const neutral =
  "border-border-subtle bg-surface/90 text-foreground hover:bg-surface-elevated";
const active = "border-primary bg-primary text-white";

export function EditorToolbar({ mode, onSetMode }: EditorToolbarProps) {
  const t = useTranslations("cityModel.toolbar");
  const editing = mode === "edit-geometry";
  return (
    <div
      role="toolbar"
      aria-label={t("toolGroupLabel")}
      className="pointer-events-auto flex items-center gap-1 rounded-lg border border-border-subtle bg-surface/90 p-1.5 shadow-sm backdrop-blur"
    >
      <button
        type="button"
        onClick={() => onSetMode("view")}
        aria-pressed={!editing}
        className={`${base} ${!editing ? active : neutral}`}
      >
        {t("select")}
      </button>
      <button
        type="button"
        onClick={() => onSetMode("edit-geometry")}
        aria-pressed={editing}
        title={t("editGeometryTooltip")}
        className={`${base} ${editing ? active : neutral}`}
      >
        {t("editGeometry")}
      </button>
      <button
        type="button"
        disabled
        title={t("drawRoadTooltip")}
        className={`${base} ${neutral}`}
      >
        + {t("drawRoad")}
      </button>
    </div>
  );
}
