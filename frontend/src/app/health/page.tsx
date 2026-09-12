import { StatusCheck } from "@/components/status-check";

export default function HealthPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Status</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Frontend is running. Backend connectivity:
      </p>
      <StatusCheck />
    </div>
  );
}
