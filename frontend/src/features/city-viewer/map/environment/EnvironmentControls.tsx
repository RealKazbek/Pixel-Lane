import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { SimulationClockState } from "./simulationClock";
import {
  shouldShowWeatherIntensity,
  TIME_MODE_OPTIONS,
  WEATHER_INTENSITY_OPTIONS,
  WEATHER_OPTIONS,
} from "./useEnvironment";
import type {
  EnvironmentState,
  TimeMode,
  TimeOfDay,
  Weather,
  WeatherIntensity,
} from "./useEnvironment";

interface EnvironmentControlsProps {
  value: EnvironmentState;
  timeOfDay: TimeOfDay;
  simulationClock: SimulationClockState;
  onTimeModeChange: (timeMode: TimeMode) => void;
  onWeatherChange: (weather: Weather) => void;
  onWeatherIntensityChange: (intensity: WeatherIntensity) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}

type OpenMenu = "time" | "weather" | null;

const triggerClass =
  "flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface-elevated px-2.5 py-1.5 text-left text-xs font-medium text-foreground shadow-sm transition-colors hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";
const optionClass =
  "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-surface-elevated focus-visible:bg-surface-elevated focus-visible:outline-none";

export function EnvironmentControls({
  value,
  timeOfDay,
  simulationClock,
  onTimeModeChange,
  onWeatherChange,
  onWeatherIntensityChange,
  onDateChange,
  onTimeChange,
}: EnvironmentControlsProps) {
  const t = useTranslations("cityModel.environment");
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenu]);

  const selectedTimeLabel =
    value.timeMode === "auto"
      ? `${t("time.auto")} · ${t(`time.${timeOfDay}`)}`
      : t(`time.${value.timeMode}`);

  return (
    <div
      ref={containerRef}
      className="pointer-events-auto relative flex w-[19rem] max-w-[calc(100vw-1.5rem)] flex-col gap-1.5 rounded-lg border border-border-subtle bg-surface/95 p-1.5 shadow-lg backdrop-blur"
    >
      <div className="flex gap-1.5">
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            className={triggerClass}
            aria-haspopup="menu"
            aria-expanded={openMenu === "time"}
            onClick={() => setOpenMenu(openMenu === "time" ? null : "time")}
          >
            <span className="truncate">{selectedTimeLabel}</span>
            <span aria-hidden="true" className="text-muted">
              ⌄
            </span>
          </button>
          {openMenu === "time" && (
            <div
              className="absolute left-0 top-[calc(100%+0.35rem)] z-30 min-w-full rounded-md border border-border-subtle bg-surface p-1 shadow-lg"
              role="menu"
              aria-label={t("timeLabel")}
            >
              {TIME_MODE_OPTIONS.map((timeMode) => (
                <button
                  key={timeMode}
                  type="button"
                  role="menuitemradio"
                  aria-checked={value.timeMode === timeMode}
                  className={optionClass}
                  onClick={() => {
                    onTimeModeChange(timeMode);
                    setOpenMenu(null);
                  }}
                >
                  <span>{t(`time.${timeMode}`)}</span>
                  {timeMode === "auto" && (
                    <span className="text-[10px] text-muted">
                      {t(`time.${timeOfDay}`)}
                    </span>
                  )}
                  {value.timeMode === timeMode && (
                    <span aria-hidden="true" className="text-primary">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            className={triggerClass}
            aria-haspopup="menu"
            aria-expanded={openMenu === "weather"}
            onClick={() =>
              setOpenMenu(openMenu === "weather" ? null : "weather")
            }
          >
            <span className="truncate">{t(`weather.${value.weather}`)}</span>
            <span aria-hidden="true" className="text-muted">
              ⌄
            </span>
          </button>
          {openMenu === "weather" && (
            <div
              className="absolute right-0 top-[calc(100%+0.35rem)] z-30 min-w-full rounded-md border border-border-subtle bg-surface p-1 shadow-lg"
              role="menu"
              aria-label={t("weatherLabel")}
            >
              {WEATHER_OPTIONS.map((weather) => (
                <button
                  key={weather}
                  type="button"
                  role="menuitemradio"
                  aria-checked={value.weather === weather}
                  className={optionClass}
                  onClick={() => {
                    onWeatherChange(weather);
                    setOpenMenu(null);
                  }}
                >
                  <span>{t(`weather.${weather}`)}</span>
                  {value.weather === weather && (
                    <span aria-hidden="true" className="text-primary">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {shouldShowWeatherIntensity(value.weather) && (
        <div className="flex items-center gap-1.5 border-t border-border-subtle px-1 pt-1.5">
          <span className="shrink-0 text-[10px] font-medium text-muted">
            {t("intensityLabel")}
          </span>
          <div
            className="flex min-w-0 flex-1 gap-0.5 rounded-md bg-surface-elevated p-0.5"
            role="group"
            aria-label={t("intensityLabel")}
          >
            {WEATHER_INTENSITY_OPTIONS.map((intensity) => (
              <button
                key={intensity}
                type="button"
                aria-pressed={value.weatherIntensity === intensity}
                className={`min-w-0 flex-1 rounded px-1.5 py-1 text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                  value.weatherIntensity === intensity
                    ? "bg-primary text-primary-foreground"
                    : "text-muted hover:bg-surface hover:text-foreground"
                }`}
                onClick={() => onWeatherIntensityChange(intensity)}
              >
                {t(`intensity.${intensity}`)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-1.5 border-t border-border-subtle px-1 pt-1.5">
        <label className="flex min-w-0 flex-1 items-center gap-1 text-[10px] font-medium text-muted">
          <span>{t("dateLabel")}</span>
          <input
            type="date"
            value={simulationClock.date}
            onChange={(event) => onDateChange(event.target.value)}
            aria-label={t("dateLabel")}
            className="min-w-0 flex-1 rounded border border-border-subtle bg-surface px-1.5 py-1 text-[11px] text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="flex items-center gap-1 text-[10px] font-medium text-muted">
          <span>{t("timeLabel")}</span>
          <input
            type="time"
            value={simulationClock.time}
            onChange={(event) => onTimeChange(event.target.value)}
            aria-label={t("timeLabel")}
            className="w-[4.5rem] rounded border border-border-subtle bg-surface px-1.5 py-1 text-[11px] text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
      </div>
    </div>
  );
}
