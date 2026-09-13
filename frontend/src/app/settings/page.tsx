import Link from "next/link";
import { PlannedFeaturePage } from "@/components/layout/PlannedFeaturePage";

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PlannedFeaturePage
        title="Settings"
        description="Account, notification, and platform settings are not implemented yet."
      />
      <p className="pb-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Backend connectivity can be checked on the{" "}
        <Link href="/health" className="underline underline-offset-2">
          status page
        </Link>
        .
      </p>
    </div>
  );
}
