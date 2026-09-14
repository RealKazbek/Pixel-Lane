import { useTranslations } from "next-intl";
import type { LayerGroupId } from "./layers/layerIds";
import type { LayerVisibility } from "./types";

interface MapLayersToggleProps {
  layerVisibility: LayerVisibility;
  onToggleLayer: (layer: LayerGroupId) => void;
}

const chipBase =
  "rounded border px-2 py-1 text-[11px] font-medium transition-colors";
const chipOn =
  "border-blue-600/60 bg-blue-600/15 text-blue-700 dark:text-blue-300";
const chipOff =
  "border-border-subtle bg-surface/60 text-zinc-500 hover:bg-surface";

const LAYER_ORDER: LayerGroupId[] = [
  "roads",
  "intersections",
  "trafficLights",
  "amenities",
];

/** The independently-toggleable entity layers Pixel Lane currently
 * renders (see `layers/layerIds.ts`'s `LAYER_GROUPS`). Kept as
 * its own small component so the toolbar itself stays a thin container
 * (see map/README.md's scope notes) -- this is the one place layer *ids*
 * meet layer *labels*. */
export function MapLayersToggle({
  layerVisibility,
  onToggleLayer,
}: MapLayersToggleProps) {
  const t = useTranslations("cityModel.layers");

  return (
    <div
      role="group"
      aria-label={t("groupLabel")}
      className="flex items-center gap-1"
    >
      {LAYER_ORDER.map((layer) => {
        const visible = layerVisibility[layer];
        return (
          <button
            key={layer}
            type="button"
            onClick={() => onToggleLayer(layer)}
            aria-pressed={visible}
            title={t(`${layer}Tooltip`)}
            className={`${chipBase} ${visible ? chipOn : chipOff}`}
          >
            {t(layer)}
          </button>
        );
      })}
    </div>
  );
}
