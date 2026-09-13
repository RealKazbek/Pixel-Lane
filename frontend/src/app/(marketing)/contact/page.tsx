import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Pixel Lane team.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Contact</h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Have a question about Pixel Lane, or want to talk about a pilot? Send a
        message below.
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>
    </div>
  );
}
