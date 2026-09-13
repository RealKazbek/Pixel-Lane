import type { Metadata } from "next";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";

export const metadata: Metadata = { title: "Incidents" };

const INCIDENT_TYPES = [
  "Accident",
  "Road closure",
  "Congestion",
  "Signal failure",
  "Roadworks",
];

export default function IncidentsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 overflow-y-auto px-6 py-8">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Incidents</h1>
        <StatusBadge label="Planned" tone="planned" />
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Incident detection and reporting is not implemented yet — it needs a
        live traffic feed or manual reporting workflow feeding a backend
        incidents API. The layout below previews the intended structure.
      </p>

      <Panel
        title="Incident feed"
        actions={<StatusBadge label="No live feed" tone="neutral" />}
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {INCIDENT_TYPES.map((t) => (
            <span
              key={t}
              className="rounded border border-border-subtle px-2 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="rounded-md border border-dashed border-border-subtle p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No incidents detected — live monitoring is not connected.
        </div>
      </Panel>
    </div>
  );
}
