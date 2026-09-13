import type { Metadata } from "next";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";

export const metadata: Metadata = { title: "Infrastructure" };

const ASSETS = [
  {
    label: "Roads & intersections",
    status: "Available",
    tone: "positive" as const,
    note: "Modeled today via the City Model editor.",
  },
  {
    label: "Traffic lights",
    status: "In development",
    tone: "warning" as const,
    note: "Signal-state modeling planned alongside simulation.",
  },
  {
    label: "Cameras",
    status: "Planned",
    tone: "planned" as const,
    note: "Requires a computer-vision ingestion pipeline.",
  },
  {
    label: "Sensors",
    status: "Planned",
    tone: "planned" as const,
    note: "Requires hardware/telemetry integration.",
  },
];

export default function InfrastructurePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 overflow-y-auto px-6 py-8">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Infrastructure</h1>
        <StatusBadge label="Planned" tone="planned" />
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Camera, sensor, and hardware asset management is not implemented yet.
        Road and intersection assets are already modeled as part of the City
        Model.
      </p>

      <Panel title="Infrastructure assets">
        <ul className="flex flex-col divide-y divide-border-subtle">
          {ASSETS.map((a) => (
            <li
              key={a.label}
              className="flex items-center justify-between py-2.5"
            >
              <div>
                <p className="text-sm font-medium">{a.label}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {a.note}
                </p>
              </div>
              <StatusBadge label={a.status} tone={a.tone} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
