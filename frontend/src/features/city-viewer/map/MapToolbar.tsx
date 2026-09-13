import type { MapMode } from "./types";
import type { EditorStatus } from "./editor/useGeometryEditor";

interface MapToolbarProps {
  basemapEnabled: boolean;
  onToggleBasemap: () => void;
  basemapConfigured: boolean;
  overlayVisible: boolean;
  onToggleOverlay: () => void;
  mode: MapMode;
  onSetMode: (mode: MapMode) => void;
  canEditSelection: boolean;
  editorStatus: EditorStatus;
  onApply: () => void;
  onCancel: () => void;
  onFitToView: () => void;
}

const buttonBase =
  "rounded-md border px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition-colors disabled:cursor-not-allowed disabled:opacity-40";
const buttonNeutral =
  "border-border-subtle bg-surface/90 text-zinc-700 hover:bg-surface dark:text-zinc-300";
const buttonActive = "border-blue-600 bg-blue-600 text-white hover:bg-blue-500";

/** A small, focused toolbar -- not a full GIS UI (see map/README.md's
 * scope notes). */
export function MapToolbar({
  basemapEnabled,
  onToggleBasemap,
  basemapConfigured,
  overlayVisible,
  onToggleOverlay,
  mode,
  onSetMode,
  canEditSelection,
  editorStatus,
  onApply,
  onCancel,
  onFitToView,
}: MapToolbarProps) {
  const isEditing = mode === "edit-geometry";

  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-md border border-border-subtle bg-surface/90 p-1.5 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={onToggleBasemap}
        disabled={!basemapConfigured}
        title={
          basemapConfigured
            ? "Toggle reference basemap"
            : "No basemap style configured"
        }
        className={`${buttonBase} ${basemapEnabled ? buttonActive : buttonNeutral}`}
      >
        Basemap {basemapEnabled ? "on" : "off"}
      </button>
      <button
        type="button"
        onClick={onToggleOverlay}
        title="Toggle the Pixel Lane road-network overlay (debugging aid)"
        className={`${buttonBase} ${overlayVisible ? buttonActive : buttonNeutral}`}
      >
        Overlay {overlayVisible ? "on" : "off"}
      </button>

      <div className="mx-1 h-4 w-px bg-border-subtle" />

      <button
        type="button"
        onClick={() => onSetMode("view")}
        className={`${buttonBase} ${!isEditing ? buttonActive : buttonNeutral}`}
      >
        Select
      </button>
      <button
        type="button"
        onClick={() => onSetMode("edit-geometry")}
        disabled={!canEditSelection && !isEditing}
        title={
          canEditSelection
            ? "Edit the selected road's geometry"
            : "Select a road first"
        }
        className={`${buttonBase} ${isEditing ? buttonActive : buttonNeutral}`}
      >
        Edit geometry
      </button>

      {isEditing && (
        <>
          <button
            type="button"
            onClick={onApply}
            disabled={editorStatus === "saving"}
            className={`${buttonBase} ${buttonNeutral}`}
          >
            {editorStatus === "saving" ? "Saving…" : "Apply"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={`${buttonBase} ${buttonNeutral}`}
          >
            Cancel
          </button>
        </>
      )}

      <div className="mx-1 h-4 w-px bg-border-subtle" />

      <button
        type="button"
        onClick={onFitToView}
        className={`${buttonBase} ${buttonNeutral}`}
      >
        Fit to view
      </button>
    </div>
  );
}
