interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">
        {value}
      </span>
    </div>
  );
}
