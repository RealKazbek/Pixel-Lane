import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using the Pixel Lane website and platform.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        Terms of Service
      </h1>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>

      <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Project status
          </h2>
          <p className="mt-2">
            Pixel Lane is an early-stage, developing smart-city project. It is
            provided &quot;as is&quot; without warranty, and functionality —
            including anything marked &quot;Planned&quot; or &quot;In
            development&quot; on the{" "}
            <a href="/features" className="text-primary hover:underline">
              Features page
            </a>{" "}
            — may change or be unavailable at any time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Acceptable use
          </h2>
          <p className="mt-2">
            You agree not to misuse the website or application, attempt to
            disrupt its operation, or use it to store or transmit unlawful
            content.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            No guarantee of availability
          </h2>
          <p className="mt-2">
            As a developing project, Pixel Lane does not currently commit to
            uptime, data-retention, or support-level guarantees.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Changes</h2>
          <p className="mt-2">
            These terms may be updated as the platform matures. Continued use
            after a change constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <p className="mt-2">
            Questions about these terms can be sent through the{" "}
            <a href="/contact" className="text-primary hover:underline">
              contact page
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
