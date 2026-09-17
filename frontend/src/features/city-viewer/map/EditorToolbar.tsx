"use client";

import { useTranslations } from "next-intl";
import type { EditorSession } from "./editor/editorState";

interface EditorToolbarProps {
  session: EditorSession;
  onEnterEdit: () => void;
  onExitEdit: () => void;
  onSetTool: (tool: "select" | "draw-road") => void;
}

const base =
  "rounded-md border px-2.5 py-1.5 text-xs font-medium shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const neutral =
  "border-border-subtle bg-surface/90 text-foreground hover:bg-surface-elevated";
const active = "border-primary bg-primary text-white";

export function EditorToolbar({
  session,
  onEnterEdit,
  onExitEdit,
  onSetTool,
}: EditorToolbarProps) {
  const t = useTranslations("cityModel.toolbar");
  const editing = session.mode === "edit";
  if (!editing) {
    return (
      <div className="pointer-events-auto rounded-lg border border-border-subtle bg-surface/90 p-1.5 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={onEnterEdit}
          className={`${base} ${neutral}`}
        >
          {t("editMode")}
        </button>
      </div>
    );
  }
  return (
    <div
      role="toolbar"
      aria-label={t("toolGroupLabel")}
      className="pointer-events-auto flex items-center gap-1 rounded-lg border border-border-subtle bg-surface/90 p-1.5 shadow-sm backdrop-blur"
    >
      <button
        type="button"
        onClick={() => onSetTool("select")}
        aria-pressed={session.activeTool === "select"}
        className={`${base} ${session.activeTool === "select" ? active : neutral}`}
      >
        {t("select")}
      </button>
      <button
        type="button"
        onClick={() => onSetTool("draw-road")}
        aria-pressed={session.activeTool === "draw-road"}
        disabled
        title={t("drawRoadTooltip")}
        className={`${base} ${neutral}`}
      >
        + {t("drawRoad")}
      </button>
      <button
        type="button"
        onClick={onExitEdit}
        className={`${base} ${neutral}`}
      >
        {t("done")}
      </button>
    </div>
  );
}
