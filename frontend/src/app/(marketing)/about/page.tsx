import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "What Pixel Lane is, the problem it solves, and its vision.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        About Pixel Lane
      </h1>
      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        Pixel Lane is a developing smart-city traffic-management project — not
        yet a deployed commercial product.
      </p>

      <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            What we&apos;re building
          </h2>
          <p className="mt-2">
            Pixel Lane is a platform for modeling city road networks as
            structured data, analyzing traffic on that model, and — over time —
            simulating and optimizing infrastructure changes before they&apos;re
            made in the real world.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">The problem</h2>
          <p className="mt-2">
            Urban traffic decisions are often made without a shared, precise
            model of the underlying road network. Bottlenecks are diagnosed
            informally, infrastructure changes are planned without a way to test
            their effect first, and emergency vehicles navigate the same signal
            timing as everyone else. Pixel Lane&apos;s goal is to give cities a
            structured foundation to reason about these problems with data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Our approach
          </h2>
          <p className="mt-2">
            We start from a City Model — a stable, queryable representation of
            roads and intersections — and build traffic analysis directly on top
            of it. Every future capability (simulation, emergency priority,
            computer-vision integration) is designed to sit behind clear
            boundaries around that same model, rather than being bolted on as a
            one-off feature.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Vision</h2>
          <p className="mt-2">
            Long term, we want Pixel Lane to support a simulation-driven digital
            twin of a city&apos;s road network, so that infrastructure and
            traffic-management changes can be tested before they&apos;re
            deployed. That work is in progress; today, the platform&apos;s
            functional core is city modeling and traffic analysis.
          </p>
        </section>
      </div>
    </div>
  );
}
