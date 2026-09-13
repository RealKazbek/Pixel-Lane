import type { Metadata } from "next";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";

export const metadata: Metadata = { title: "Emergency Priority" };

const WORKFLOW = [
  "Emergency vehicle request",
  "Route analysis",
  "Affected intersections",
  "Signal priority",
  "Route normalization",
];

export default function EmergencyPriorityPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 overflow-y-auto px-6 py-8">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          Emergency Priority
        </h1>
        <StatusBadge label="Planned" tone="planned" />
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Future signal-preemption workflow for ambulances, fire trucks, and
        police — routing an emergency vehicle and temporarily prioritizing the
        traffic lights along its path. Not implemented; no control logic runs
        from this screen.
      </p>

      <Panel title="Planned workflow">
        <ol className="flex flex-col gap-0">
          {WORKFLOW.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-raised text-[11px] font-medium">
                  {i + 1}
                </span>
                {i < WORKFLOW.length - 1 && (
                  <span className="h-6 w-px bg-border-subtle" />
                )}
              </div>
              <span className="pb-6 pt-0.5 text-sm">{step}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel
        title="Sample request"
        actions={
          <StatusBadge
            label="Preview — not connected to backend"
            tone="planned"
          />
        }
      >
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">Vehicle</dt>
          <dd className="text-right font-medium">Ambulance</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Route</dt>
          <dd className="text-right font-medium">A → B</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Status</dt>
          <dd className="text-right">
            <StatusBadge label="Priority requested" tone="warning" />
          </dd>
          <dt className="text-zinc-500 dark:text-zinc-400">
            Traffic lights affected
          </dt>
          <dd className="text-right font-medium">4</dd>
        </dl>
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Emergency vehicle priority is not implemented. This screen shows
          sample data only, to illustrate the intended layout for future
          integration.
        </p>
      </Panel>
    </div>
  );
}
