import styles from "./environment.module.css";
import type { TimeOfDay, Weather } from "./useEnvironment";

interface WeatherOverlayProps {
  timeOfDay: TimeOfDay;
  weather: Weather;
}

export function WeatherOverlay({ timeOfDay, weather }: WeatherOverlayProps) {
  return (
    <div
      className={styles.atmosphere}
      data-time-of-day={timeOfDay}
      data-weather={weather}
      aria-hidden="true"
    >
      {weather !== "clear" && <div className={styles.weatherEffect} />}
    </div>
  );
}
