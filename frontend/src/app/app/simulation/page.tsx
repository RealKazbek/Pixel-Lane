import type { Metadata } from "next";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";

export const metadata: Metadata = { title: "Simulation" };

export default function SimulationPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight">Simulation</h1>
        <StatusBadge label="Planned" tone="planned" />
      </div>
      <Panel title="Simulation status">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            State
          </span>
          <StatusBadge label="Not started" tone="neutral" />
        </div>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          SUMO-based simulation is not integrated yet. The controls below are a
          UI prototype only — they are disabled and do not run anything.
        </p>
        <div className="mt-4 flex gap-2">
          {["Start", "Pause", "Stop", "Reset"].map((action) => (
            <button
              key={action}
              type="button"
              disabled
              title="Not operational yet"
              className="cursor-not-allowed rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-600"
            >
              {action}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
