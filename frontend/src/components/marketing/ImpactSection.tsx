const OUTCOMES = [
  {
    title: "Reduced congestion",
    description: "Identify bottlenecks before they become chronic delays.",
  },
  {
    title: "Better infrastructure planning",
    description: "Ground road and intersection decisions in modeled data.",
  },
  {
    title: "Faster emergency response",
    description:
      "A signal-priority workflow is designed for future integration.",
  },
  {
    title: "Data-driven city decisions",
    description: "Move from intuition to a shared, structured city model.",
  },
];

/** No numeric impact claims -- Pixel Lane has no production deployments
 * yet, so outcomes are described qualitatively (see AGENTS.md's honesty
 * rules and the task's "avoid fake numeric claims" instruction). */
export function ImpactSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Smart-city impact
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {OUTCOMES.map((o) => (
          <div key={o.title} className="flex gap-3">
            <span
              aria-hidden
              className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
            />
            <div>
              <h3 className="text-sm font-semibold">{o.title}</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {o.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
