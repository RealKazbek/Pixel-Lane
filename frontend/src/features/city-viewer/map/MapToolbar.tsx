import { useTranslations } from "next-intl";
import { MapLayersToggle } from "./MapLayersToggle";
import type { LayerGroupId } from "./layers/layerIds";
import type { LayerVisibility, MapMode } from "./types";
import type { EditorStatus } from "./editor/useGeometryEditor";

interface MapToolbarProps {
  editorOnly?: boolean;
  basemapEnabled: boolean;
  onToggleBasemap: () => void;
  basemapConfigured: boolean;
  overlayVisible: boolean;
  onToggleOverlay: () => void;
  layerVisibility: LayerVisibility;
  onToggleLayer: (layer: LayerGroupId) => void;
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
  editorOnly = false,
  basemapEnabled,
  onToggleBasemap,
  basemapConfigured,
  overlayVisible,
  onToggleOverlay,
  layerVisibility,
  onToggleLayer,
  mode,
  onSetMode,
  canEditSelection,
  editorStatus,
  onApply,
  onCancel,
  onFitToView,
}: MapToolbarProps) {
  const t = useTranslations("cityModel.toolbar");
  const isEditing = mode === "edit-geometry";

  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-md border border-border-subtle bg-surface/90 p-1.5 shadow-sm backdrop-blur">
      {/* Tools: what clicking the map does right now. */}
      <div
        role="group"
        aria-label={t("toolGroupLabel")}
        className="flex items-center gap-1.5"
      >
        <button
          type="button"
          onClick={() => onSetMode("view")}
          aria-pressed={!isEditing}
          className={`${buttonBase} ${!isEditing ? buttonActive : buttonNeutral}`}
        >
          {t("select")}
        </button>
        <button
          type="button"
          disabled
          title={t("drawRoadTooltip")}
          className={`${buttonBase} ${buttonNeutral}`}
        >
          {t("drawRoad")}
        </button>
        <button
          type="button"
          onClick={() => onSetMode("edit-geometry")}
          disabled={!canEditSelection && !isEditing}
          aria-pressed={isEditing}
          title={
            canEditSelection
              ? t("editGeometryTooltip")
              : t("editGeometryDisabledTooltip")
          }
          className={`${buttonBase} ${isEditing ? buttonActive : buttonNeutral}`}
        >
          {t("editGeometry")}
        </button>

        {isEditing && (
          <>
            <button
              type="button"
              onClick={onApply}
              disabled={editorStatus === "saving"}
              className={`${buttonBase} ${buttonNeutral}`}
            >
              {editorStatus === "saving" ? t("applying") : t("apply")}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className={`${buttonBase} ${buttonNeutral}`}
            >
              {t("cancel")}
            </button>
          </>
        )}
      </div>

      {!editorOnly && <div className="mx-1 h-4 w-px bg-border-subtle" />}

      {!editorOnly && (
        <div
          role="group"
          aria-label={t("viewGroupLabel")}
          className="flex items-center gap-1.5"
        >
          <button
            type="button"
            onClick={onToggleBasemap}
            disabled={!basemapConfigured}
            title={
              basemapConfigured
                ? t("basemapTooltip")
                : t("basemapUnconfiguredTooltip")
            }
            className={`${buttonBase} ${basemapEnabled ? buttonActive : buttonNeutral}`}
          >
            {basemapEnabled ? t("basemapOn") : t("basemapOff")}
          </button>
          <button
            type="button"
            onClick={onToggleOverlay}
            title={t("overlayTooltip")}
            className={`${buttonBase} ${overlayVisible ? buttonActive : buttonNeutral}`}
          >
            {overlayVisible ? t("overlayOn") : t("overlayOff")}
          </button>
          <MapLayersToggle
            layerVisibility={layerVisibility}
            onToggleLayer={onToggleLayer}
          />
        </div>
      )}

      <div className="mx-1 h-4 w-px bg-border-subtle" />

      <button
        type="button"
        onClick={onFitToView}
        className={`${buttonBase} ${buttonNeutral}`}
      >
        {t("fitToView")}
      </button>
    </div>
  );
}
