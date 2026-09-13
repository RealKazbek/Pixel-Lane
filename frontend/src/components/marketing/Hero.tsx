import Link from "next/link";
import { RoadNetworkIllustration } from "./RoadNetworkIllustration";

export function Hero() {
  return (
    <section className="border-b border-border-subtle bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Smart-city traffic platform
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Smarter roads. Better cities.
          </h1>
          <p className="mt-4 max-w-lg text-base text-zinc-600 dark:text-zinc-400">
            Pixel Lane helps cities model road infrastructure, analyze traffic,
            and prepare for simulation-driven improvements to urban mobility —
            in one connected platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/features"
              className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Explore Platform
            </Link>
            <Link
              href="/app/city-model"
              className="rounded-md border border-border-subtle px-4 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              View City Model
            </Link>
            <Link
              href="/contact"
              className="rounded-md px-4 py-2.5 text-sm font-medium text-zinc-600 hover:text-foreground dark:text-zinc-400"
            >
              Contact Us →
            </Link>
          </div>
        </div>
        <RoadNetworkIllustration className="mx-auto w-full max-w-md text-primary md:max-w-none" />
      </div>
    </section>
  );
}
