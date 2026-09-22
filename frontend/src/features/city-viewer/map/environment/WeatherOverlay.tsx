import styles from "./environment.module.css";
import { RainCanvas } from "./RainCanvas";
import type { TimeOfDay, Weather, WeatherIntensity } from "./useEnvironment";

interface WeatherOverlayProps {
  timeOfDay: TimeOfDay;
  weather: Weather;
  intensity: WeatherIntensity;
}

export function WeatherOverlay({
  timeOfDay,
  weather,
  intensity,
}: WeatherOverlayProps) {
  return (
    <div
      className={styles.atmosphere}
      data-time-of-day={timeOfDay}
      data-weather={weather}
      data-intensity={intensity}
      aria-hidden="true"
    >
      {weather === "rain" ? (
        <RainCanvas intensity={intensity} />
      ) : weather !== "clear" ? (
        <div className={styles.weatherEffect}>
          <div className={styles.weatherLayer} />
        </div>
      ) : null}
    </div>
  );
}
