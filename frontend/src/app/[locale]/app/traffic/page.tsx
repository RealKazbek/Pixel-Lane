import type { Metadata } from "next";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TrafficLevelBadge } from "@/components/ui/TrafficLevelBadge";

export const metadata: Metadata = { title: "Traffic" };

const METRICS = [
  { label: "Traffic flow", needs: "Live vehicle counting (cameras/sensors)" },
  { label: "Signal state", needs: "Traffic-light controller integration" },
  { label: "Congestion", needs: "Real-time speed/volume feed" },
  { label: "Active vehicles", needs: "Vehicle detection pipeline" },
];

/** Honest preview: explains the module's intended scope instead of a
 * blank "not implemented" screen. No live data is faked -- see
 * AGENTS.md's no-fake-backend-behavior rule. */
export default function TrafficPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 overflow-y-auto px-6 py-8">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          Traffic Monitoring
        </h1>
        <StatusBadge label="Planned" tone="planned" />
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Live network monitoring is not implemented yet. Stored-city traffic
        analysis (bottlenecks, routed/unrouted demand) is available today on the{" "}
        <a href="/app/city-model" className="underline underline-offset-2">
          City Model
        </a>{" "}
        screen.
      </p>

      <Panel title="Live network monitoring">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {METRICS.map((m) => (
            <div
              key={m.label}
              className="rounded-md border border-dashed border-border-subtle p-3"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {m.label}
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-400 dark:text-zinc-600">
                —
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
                Requires: {m.needs}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Traffic severity legend">
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          The severity scale used across analysis, bottlenecks, and (in the
          future) live monitoring.
        </p>
        <div className="flex flex-wrap gap-2">
          <TrafficLevelBadge level="low" />
          <TrafficLevelBadge level="moderate" />
          <TrafficLevelBadge level="high" />
          <TrafficLevelBadge level="critical" />
        </div>
      </Panel>
    </div>
  );
}
