import { useTranslations } from "next-intl";
import { RoadNetworkIllustration } from "./RoadNetworkIllustration";

export function AuthLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("auth.layout");
  return (
    <div className="grid min-h-[calc(100dvh-57px-1px)] grid-cols-1 md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-surface-raised p-10 md:flex">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary text-[11px] font-bold text-white"
          >
            PL
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Pixel Lane
          </span>
        </div>
        <RoadNetworkIllustration className="w-full max-w-sm text-primary opacity-90" />
        <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          {t("tagline")}
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-6 rounded-lg border border-border-subtle bg-surface p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
