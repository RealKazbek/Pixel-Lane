import { useTranslations } from "next-intl";
import type { SimulationClockState } from "./simulationClock";
import { formatSimulationDate } from "./simulationClock";

interface SimulationClockDisplayProps {
  clock: SimulationClockState;
}

export function SimulationClockDisplay({ clock }: SimulationClockDisplayProps) {
  const t = useTranslations("cityModel.environment");
  const dateTime = `${clock.date}T${clock.time}`;

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-md border border-border-subtle bg-surface/80 px-2.5 py-1.5 text-[11px] leading-tight text-muted shadow-sm backdrop-blur">
      <span className="sr-only">{t("simulationTimeLabel")}: </span>
      <time dateTime={dateTime}>
        <span className="font-medium text-foreground">
          {formatSimulationDate(clock.date)}
        </span>
        <span aria-hidden="true" className="px-1 text-border-subtle">
          ·
        </span>
        <span>{clock.time}</span>
      </time>
    </div>
  );
}
