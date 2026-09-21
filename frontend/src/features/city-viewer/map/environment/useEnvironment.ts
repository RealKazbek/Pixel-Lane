import { useReducer } from "react";

export type TimeMode = "auto" | "morning" | "day" | "evening" | "night";
export type TimeOfDay = "morning" | "day" | "evening" | "night";
export type Weather = "clear" | "rain" | "snow" | "fog";
export type WeatherIntensity = "light" | "medium" | "heavy";

export interface EnvironmentState {
  timeMode: TimeMode;
  weather: Weather;
  weatherIntensity: WeatherIntensity;
}

export type EnvironmentAction =
  | { type: "set-time-mode"; timeMode: TimeMode }
  | { type: "set-weather"; weather: Weather }
  | { type: "set-weather-intensity"; intensity: WeatherIntensity };

export const INITIAL_ENVIRONMENT: EnvironmentState = {
  timeMode: "auto",
  weather: "clear",
  weatherIntensity: "medium",
};

export function shouldShowWeatherIntensity(weather: Weather): boolean {
  return weather !== "clear";
}

export function reduceEnvironment(
  state: EnvironmentState,
  action: EnvironmentAction,
): EnvironmentState {
  switch (action.type) {
    case "set-time-mode":
      return state.timeMode === action.timeMode
        ? state
        : { ...state, timeMode: action.timeMode };
    case "set-weather":
      return state.weather === action.weather
        ? state
        : { ...state, weather: action.weather };
    case "set-weather-intensity":
      return state.weatherIntensity === action.intensity
        ? state
        : { ...state, weatherIntensity: action.intensity };
  }
}

export function resolveTimeOfDay(
  timeMode: TimeMode,
  simulationTime: string,
): TimeOfDay {
  if (timeMode !== "auto") return timeMode;

  const [hours, minutes] = simulationTime.split(":").map(Number);
  const isValidTime =
    Number.isInteger(hours) &&
    Number.isInteger(minutes) &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59;
  const totalMinutes = isValidTime ? hours * 60 + minutes : 12 * 60;

  if (totalMinutes >= 11 * 60 && totalMinutes < 17 * 60) {
    return "day";
  }
  if (totalMinutes >= 5 * 60 && totalMinutes < 11 * 60) {
    return "morning";
  }
  if (totalMinutes >= 17 * 60 && totalMinutes < 21 * 60) {
    return "evening";
  }
  return "night";
}

export function useEnvironment() {
  return useReducer(reduceEnvironment, INITIAL_ENVIRONMENT);
}
