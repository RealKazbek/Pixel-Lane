import { CONGESTION_COLORS, CONGESTION_LABELS } from "../lib/congestion";
import type { CongestionLevel } from "../types/traffic-analysis";

const LEVELS: CongestionLevel[] = [
  "FREE_FLOW",
  "MODERATE",
  "HEAVY",
  "SATURATED",
];

export function CongestionLegend() {
  return (
    <div className="rounded-md border border-zinc-200 bg-white/90 px-3 py-2 text-xs shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
      <p className="mb-1.5 font-medium text-zinc-500 dark:text-zinc-400">
        Traffic
      </p>
      <ul className="flex flex-col gap-1">
        {LEVELS.map((level) => (
          <li
            key={level}
            className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CONGESTION_COLORS[level] }}
              aria-hidden
            />
            {CONGESTION_LABELS[level]}
          </li>
        ))}
      </ul>
    </div>
  );
}
