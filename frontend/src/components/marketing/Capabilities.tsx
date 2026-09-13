const CAPABILITIES = [
  { title: "Digital city model", status: "Available" },
  { title: "Road/intersection editor", status: "Available" },
  { title: "Traffic severity visualization", status: "Available" },
  { title: "Simulation-ready architecture", status: "In development" },
  { title: "Analytics", status: "In development" },
  { title: "Emergency vehicle priority", status: "Planned" },
  { title: "Computer vision integration", status: "Planned" },
];

export function Capabilities() {
  return (
    <section className="border-y border-border-subtle bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Key capabilities
        </h2>
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CAPABILITIES.map((c) => (
            <li
              key={c.title}
              className="flex items-center justify-between rounded-lg border border-border-subtle px-4 py-3"
            >
              <span className="text-sm">{c.title}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                  c.status === "Available"
                    ? "bg-severity-low-bg text-severity-low"
                    : c.status === "In development"
                      ? "bg-severity-moderate-bg text-severity-moderate"
                      : "border border-dashed border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                }`}
              >
                {c.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
