const STEPS = [
  {
    title: "Model the city",
    description: "Build or import a road network as a structured City Model.",
  },
  {
    title: "Analyze traffic",
    description:
      "Run traffic analysis to surface bottlenecks and demand patterns.",
  },
  {
    title: "Simulate improvements",
    description:
      "A simulation layer is being built to test changes before they're made.",
  },
  {
    title: "Optimize infrastructure",
    description:
      "Use findings to plan roads, signals, and future hardware upgrades.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border-subtle bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          How it works
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative">
              <span className="text-3xl font-semibold text-primary/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
