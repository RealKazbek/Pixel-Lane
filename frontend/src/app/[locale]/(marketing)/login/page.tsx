import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthLayout } from "@/components/marketing/AuthLayout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.login" });
  return { title: t("titleMeta"), robots: { index: false } };
}

/** UI-ready only -- no authentication backend exists yet. The form is
 * intentionally non-functional (no onSubmit) rather than faking a login. */
export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.login" });

  return (
    <AuthLayout title={t("title")}>
      <p className="mb-4 rounded-md border border-dashed border-border-subtle p-3 text-xs text-zinc-500 dark:text-zinc-400">
        {t("notice")}
      </p>
      <form className="flex flex-col gap-4">
        <LabeledInput id="email" label={t("email")} type="email" />
        <LabeledInput id="password" label={t("password")} type="password" />
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              className="rounded border-border-subtle"
              disabled
            />
            {t("rememberMe")}
          </label>
          <span className="text-zinc-400 dark:text-zinc-500">
            {t("forgotPassword")}
          </span>
        </div>
        <button
          type="button"
          disabled
          title={t("submitDisabledTitle")}
          className="cursor-not-allowed rounded-md bg-primary/50 px-4 py-2 text-sm font-medium text-white"
        >
          {t("submit")}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-primary hover:underline">
          {t("registerLink")}
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
