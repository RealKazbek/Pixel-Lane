import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Pixel Lane handles data today.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>

      <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Where Pixel Lane stands today
          </h2>
          <p className="mt-2">
            Pixel Lane is an early-stage, developing project. This policy
            describes our current, honest position rather than a mature
            commercial privacy program — it will be expanded as the platform and
            its user base grow.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            What we collect
          </h2>
          <p className="mt-2">
            The public website does not currently have an authentication
            backend, analytics tracking, or a connected contact-form endpoint.
            Information you type into the contact form on this site is not
            transmitted anywhere yet — the form is a UI preview. City Model data
            you create in the application is stored by the Pixel Lane backend
            for the purpose of displaying it back to you.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Cookies</h2>
          <p className="mt-2">
            We do not currently set marketing or tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <p className="mt-2">
            Questions about this policy can be sent through the{" "}
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
