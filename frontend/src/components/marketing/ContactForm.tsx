"use client";

import { useState } from "react";

/** UI-ready contact form with no backend endpoint yet -- submitting shows
 * an honest "not yet connected" state instead of a fake success message
 * (see AGENTS.md's no-fake-backend-behavior rule). Wiring this to a real
 * endpoint later only requires replacing `handleSubmit`. */
export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-dashed border-border-subtle p-6 text-sm text-zinc-600 dark:text-zinc-400">
        Thanks for the interest. Pixel Lane doesn&apos;t have a contact backend
        connected yet, so this form can&apos;t deliver messages right now — the
        UI is ready for that integration once it exists.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </Field>
      </div>
      <Field label="Organization" htmlFor="organization">
        <input
          id="organization"
          name="organization"
          type="text"
          className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </Field>
      <Field label="Subject" htmlFor="subject">
        <input
          id="subject"
          name="subject"
          type="text"
          required
          className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </Field>
      <Field label="Message" htmlFor="message">
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </Field>
      <button
        type="submit"
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
      >
        Send message
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
