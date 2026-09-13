import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/marketing/AuthLayout";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false },
};

/** UI-ready only -- no authentication backend exists yet. The form is
 * intentionally non-functional (no onSubmit) rather than faking a login. */
export default function LoginPage() {
  return (
    <AuthLayout title="Sign in">
      <p className="mb-4 rounded-md border border-dashed border-border-subtle p-3 text-xs text-zinc-500 dark:text-zinc-400">
        Authentication isn&apos;t connected yet — this form is a UI preview
        only.
      </p>
      <form className="flex flex-col gap-4">
        <LabeledInput id="email" label="Email" type="email" />
        <LabeledInput id="password" label="Password" type="password" />
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              className="rounded border-border-subtle"
              disabled
            />
            Remember me
          </label>
          <span className="text-zinc-400 dark:text-zinc-500">
            Forgot password?
          </span>
        </div>
        <button
          type="button"
          disabled
          title="Not yet connected to a backend"
          className="cursor-not-allowed rounded-md bg-primary/50 px-4 py-2 text-sm font-medium text-white"
        >
          Sign in
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Register
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
