import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function AnalyticsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight">Analytics</h1>
        <StatusBadge label="Planned" tone="planned" />
      </div>
      <EmptyState
        title="No analytics data yet"
        description="Historical metrics (average speed, congestion trend, travel time, throughput) require running traffic analysis on a City Model first. Open City Model, select a city, and run traffic analysis to see current-run metrics there."
        action={
          <Link
            href="/city-model"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            Open City Model
          </Link>
        }
      />
    </div>
  );
}
