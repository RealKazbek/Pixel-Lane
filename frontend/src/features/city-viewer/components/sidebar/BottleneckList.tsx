import { useTranslations } from "next-intl";
import { TrafficLevelBadge } from "@/components/ui/TrafficLevelBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { bottleneckSeverityToTrafficLevel } from "../../lib/traffic-level";
import type { Bottleneck } from "../../types/traffic-analysis";

interface BottleneckListProps {
  bottlenecks: Bottleneck[];
  onSelect: (bottleneck: Bottleneck) => void;
}

export function BottleneckList({ bottlenecks, onSelect }: BottleneckListProps) {
  const t = useTranslations("cityModel.sidebar");
  if (bottlenecks.length === 0) {
    return <EmptyState title={t("noBottlenecks")} />;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {bottlenecks.map((bottleneck, index) => (
        <li key={`${bottleneck.entity_type}-${bottleneck.entity_id}-${index}`}>
          <button
            type="button"
            onClick={() => onSelect(bottleneck)}
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
            <TrafficLevelBadge
              level={bottleneckSeverityToTrafficLevel(bottleneck.severity)}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
