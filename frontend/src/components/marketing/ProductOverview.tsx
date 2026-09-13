const ITEMS = [
  {
    title: "City Model",
    description:
      "A structured digital representation of roads, intersections, and lanes — the source of truth every other module builds on.",
  },
  {
    title: "Traffic Analysis",
    description:
      "Run analysis on a modeled city to surface bottlenecks and routing demand.",
  },
  {
    title: "Infrastructure Planning",
    description:
      "Track road and intersection assets today, with camera/sensor integration planned.",
  },
  {
    title: "Traffic Simulation",
    description:
      "Simulation-ready architecture designed for a future SUMO-based digital twin.",
  },
  {
    title: "Incident Monitoring",
    description:
      "A planned module for surfacing accidents, closures, and signal failures as they happen.",
  },
  {
    title: "Emergency Priority",
    description:
      "A planned signal-preemption workflow to route ambulances, fire trucks, and police faster.",
  },
];

export function ProductOverview() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          One platform for urban mobility
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Pixel Lane connects city modeling, traffic analysis, and
          infrastructure planning into a single workflow.
        </p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item) => (
          <div
            key={item.title}
            className="rounded-lg border border-border-subtle bg-surface p-5 transition-colors hover:border-primary/40"
          >
            <h3 className="text-sm font-semibold">{item.title}</h3>
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
