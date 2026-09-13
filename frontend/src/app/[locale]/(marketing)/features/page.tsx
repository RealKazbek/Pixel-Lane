import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features",
  description: "What Pixel Lane can do today, and what is coming next.",
};

type Status = "Available" | "In development" | "Planned";

const STATUS_STYLE: Record<Status, string> = {
  Available: "bg-severity-low-bg text-severity-low",
  "In development": "bg-severity-moderate-bg text-severity-moderate",
  Planned:
    "border border-dashed border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400",
};

const FEATURES: { title: string; status: Status; description: string }[] = [
  {
    title: "City Model",
    status: "Available",
    description:
      "Model roads, intersections, and lanes as a structured, persisted city network.",
  },
  {
    title: "Traffic Monitoring",
    status: "Planned",
    description:
      "Live traffic flow, signal state, and congestion views require a real-time data feed.",
  },
  {
    title: "Infrastructure Management",
    status: "In development",
    description:
      "Road/intersection assets are modeled today; camera and sensor asset tracking is planned.",
  },
  {
    title: "Simulation",
    status: "Planned",
    description:
      "A SUMO-based simulation adapter is designed but not yet integrated.",
  },
  {
    title: "Analytics",
    status: "In development",
    description:
      "Traffic-analysis results (bottlenecks, demand) are available per run; historical trend analytics is planned.",
  },
  {
    title: "Incident Management",
    status: "Planned",
    description:
      "Detecting and reporting accidents, closures, and signal failures requires a live feed or reporting workflow.",
  },
  {
    title: "Emergency Priority",
    status: "Planned",
    description:
      "Signal preemption for ambulances, fire trucks, and police is designed as a future workflow.",
  },
  {
    title: "Computer Vision Integration",
    status: "Planned",
    description:
      "Camera-based vehicle detection is planned as an external adapter, isolated from core traffic logic.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Features</h1>
      <p className="mt-3 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        An honest look at what is available today versus what is planned.
        Nothing marked &quot;Planned&quot; or &quot;In development&quot; is
        presented as production-ready.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-lg border border-border-subtle bg-surface p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{f.title}</h2>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[f.status]}`}
              >
                {f.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {f.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
