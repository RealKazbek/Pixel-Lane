import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function EmergencyPriorityPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight">
          Emergency Priority
        </h1>
        <StatusBadge label="Planned" tone="planned" />
      </div>
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
          Emergency vehicle priority (ambulance, fire, police routing and signal
          preemption) is not implemented. This screen shows sample data only, to
          illustrate the intended layout for future integration.
        </p>
      </Panel>
    </div>
  );
}
