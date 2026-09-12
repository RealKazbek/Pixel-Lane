import type { Bottleneck } from "../../types/traffic-analysis";
import type { SelectedEntity } from "../../state/selection";

interface BottleneckListProps {
  bottlenecks: Bottleneck[];
  onSelect: (entity: SelectedEntity) => void;
}

const SEVERITY_STYLES: Record<Bottleneck["severity"], string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  medium:
    "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
};

export function BottleneckList({ bottlenecks, onSelect }: BottleneckListProps) {
  if (bottlenecks.length === 0) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        No bottlenecks detected.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {bottlenecks.map((bottleneck, index) => (
        <li key={`${bottleneck.entity_type}-${bottleneck.entity_id}-${index}`}>
          <button
            type="button"
            onClick={() =>
              onSelect({
                type: bottleneck.entity_type,
                id: bottleneck.entity_id,
              })
            }
            className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium text-zinc-700 dark:text-zinc-300">
                {bottleneck.entity_type} · {bottleneck.entity_id.slice(0, 8)}
              </span>
              <span className="text-zinc-400">
                v/c {bottleneck.volume_capacity_ratio.toFixed(2)}
              </span>
            </span>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 font-medium ${SEVERITY_STYLES[bottleneck.severity]}`}
            >
              {bottleneck.severity}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
