import { useTranslations } from "next-intl";
import type { EnvironmentState, TimeOfDay, Weather } from "./useEnvironment";

interface EnvironmentControlsProps {
  value: EnvironmentState;
  onTimeOfDayChange: (timeOfDay: TimeOfDay) => void;
  onWeatherChange: (weather: Weather) => void;
}

const timeOptions: TimeOfDay[] = ["day", "sunset", "night"];
const weatherOptions: Weather[] = ["clear", "rain", "snow", "fog"];

export function EnvironmentControls({
  value,
  onTimeOfDayChange,
  onWeatherChange,
}: EnvironmentControlsProps) {
  const t = useTranslations("cityModel.environment");

  return (
    <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-md border border-border-subtle bg-surface/90 p-1.5 text-xs shadow-sm backdrop-blur">
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label={t("timeLabel")}
      >
        <span className="px-1 font-semibold text-muted">{t("timeLabel")}</span>
        {timeOptions.map((timeOfDay) => (
          <button
            key={timeOfDay}
            type="button"
            aria-pressed={value.timeOfDay === timeOfDay}
            onClick={() => onTimeOfDayChange(timeOfDay)}
            className={`rounded border px-2 py-1 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
              value.timeOfDay === timeOfDay
                ? "border-primary bg-primary text-primary-foreground"
                : "border-transparent text-foreground hover:bg-surface-elevated"
            }`}
          >
            {t(`time.${timeOfDay}`)}
          </button>
        ))}
      </div>
      <div
        className="hidden h-5 w-px bg-border-subtle sm:block"
        aria-hidden="true"
      />
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label={t("weatherLabel")}
      >
        <span className="px-1 font-semibold text-muted">
          {t("weatherLabel")}
        </span>
        {weatherOptions.map((weather) => (
          <button
            key={weather}
            type="button"
            aria-pressed={value.weather === weather}
            onClick={() => onWeatherChange(weather)}
            className={`rounded border px-2 py-1 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
              value.weather === weather
                ? "border-primary bg-primary text-primary-foreground"
                : "border-transparent text-foreground hover:bg-surface-elevated"
            }`}
          >
            {t(`weather.${weather}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
