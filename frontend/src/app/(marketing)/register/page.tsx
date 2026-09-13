import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/marketing/AuthLayout";

export const metadata: Metadata = {
  title: "Register",
  robots: { index: false },
};

/** UI-ready only -- no registration backend exists yet. */
export default function RegisterPage() {
  return (
    <AuthLayout title="Create an account">
      <p className="mb-4 rounded-md border border-dashed border-border-subtle p-3 text-xs text-zinc-500 dark:text-zinc-400">
        Account creation isn&apos;t connected yet — this form is a UI preview
        only.
      </p>
      <form className="flex flex-col gap-4">
        <LabeledInput id="name" label="Name" type="text" />
        <LabeledInput id="email" label="Email" type="email" />
        <LabeledInput id="password" label="Password" type="password" />
        <LabeledInput
          id="confirm-password"
          label="Confirm password"
          type="password"
        />
        <button
          type="button"
          disabled
          title="Not yet connected to a backend"
          className="cursor-not-allowed rounded-md bg-primary/50 px-4 py-2 text-sm font-medium text-white"
        >
          Create account
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

function LabeledInput({
  id,
  label,
  type,
}: {
  id: string;
  label: string;
  type: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        disabled
        className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm disabled:opacity-60"
      />
    </div>
  );
}
