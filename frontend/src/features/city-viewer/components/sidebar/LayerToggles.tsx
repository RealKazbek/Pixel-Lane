import { LAYER_LABELS, type LayerVisibility } from "../../state/layers";

interface LayerTogglesProps {
  layers: LayerVisibility;
  onToggle: (layer: keyof LayerVisibility) => void;
}

export function LayerToggles({ layers, onToggle }: LayerTogglesProps) {
  return (
    <ul className="flex flex-col gap-1.5">
      {(Object.keys(LAYER_LABELS) as (keyof LayerVisibility)[]).map((layer) => (
        <li key={layer}>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={layers[layer]}
              onChange={() => onToggle(layer)}
              className="h-3.5 w-3.5 accent-blue-600"
            />
            {LAYER_LABELS[layer]}
          </label>
        </li>
      ))}
    </ul>
  );
}
