import Link from "next/link";
import { MetricCard } from "@/components/ui/MetricCard";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatusCheck } from "@/components/status-check";

/** Landing dashboard for the internal app. Deliberately does not reach
 * into the city-viewer feature's internal hooks (its README limits
 * imports to its `CityViewerApp` entry component) -- live network
 * metrics live on the City Model screen instead of being duplicated
 * here; everything else is an explicit "not connected" state rather
 * than a fabricated number. */
export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 overflow-y-auto px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Operational overview of the Pixel Lane smart-city platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="City Model"
          value="—"
          hint="Open City Model to load a city and see live road/intersection counts."
        />
        <MetricCard
          label="Simulation"
          value="Not started"
          status={<StatusBadge label="Planned" tone="planned" />}
          hint="SUMO integration is not implemented yet."
        />
        <MetricCard
          label="Active incidents"
          value="—"
          status={<StatusBadge label="Planned" tone="planned" />}
          hint="Incident detection is not implemented yet."
        />
      </div>

      <Panel title="System status">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">
              Backend API
            </span>
            <StatusCheck />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">
              Simulation engine
            </span>
            <StatusBadge label="Not connected" tone="neutral" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">
              Incident feed
            </span>
            <StatusBadge label="Not connected" tone="neutral" />
          </div>
        </div>
      </Panel>

      <Panel title="Quick actions">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/city-model"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
          >
            Open City Model
          </Link>
          <Link
            href="/app/analytics"
            className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            View analytics
          </Link>
          <Link
            href="/app/emergency-priority"
            className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Emergency priority preview
          </Link>
        </div>
      </Panel>
    </div>
  );
}
