import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface PlannedFeaturePageProps {
  title: string;
  description: string;
}

/** Honest placeholder for a nav item with no real backend/frontend
 * functionality yet -- never fakes data or controls (see AGENTS.md). */
export function PlannedFeaturePage({
  title,
  description,
}: PlannedFeaturePageProps) {
  const t = useTranslations("common");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <StatusBadge label={t("featureStatus.planned")} tone="planned" />
      </div>
      <EmptyState
        title={t("actions.notImplementedYet")}
        description={description}
      />
    </div>
  );
}
